"""
AIMF FastAPI Dependencies
=========================
Reusable dependency functions for FastAPI routes.

Provides:
  - get_session: AsyncSession (database)
  - get_faiss:   FAISSIndex   (vector search)
  - get_request_id: unique request identifier for logging
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal
from core.faiss_index import FAISSIndex
from core.security import decode_token
from models.user import User


# ─── Database Session ─────────────────────────────────────────────────────────

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Yields a database session per request.
    Commits on success, rolls back on exception, always closes.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ─── FAISS Index ──────────────────────────────────────────────────────────────

def get_faiss(request: Request) -> FAISSIndex:
    """
    Returns the application-level FAISS index stored in app.state.
    The index is loaded once at startup in the lifespan handler.
    """
    return request.app.state.faiss  # type: ignore[no-any-return]


# ─── Request ID ───────────────────────────────────────────────────────────────

def get_request_id() -> str:
    """Generate a unique request ID for structured logging."""
    return f"req-{uuid.uuid4().hex[:12]}"


# ─── User Authentication ──────────────────────────────────────────────────────

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
    db: Annotated[AsyncSession, Depends(get_session)],
) -> User:
    """
    Extract and authenticate the user from the Bearer JWT token in the Authorization header.
    Validates token signature, expiration, active state, and presence in database.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type: access token required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


# ─── Type Aliases (FastAPI style) ─────────────────────────────────────────────

DBSession   = Annotated[AsyncSession, Depends(get_session)]
FAISSDep    = Annotated[FAISSIndex,   Depends(get_faiss)]
RequestID   = Annotated[str,          Depends(get_request_id)]
CurrentUser = Annotated[User,         Depends(get_current_user)]
