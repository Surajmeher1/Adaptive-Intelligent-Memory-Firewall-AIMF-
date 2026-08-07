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

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal
from core.faiss_index import FAISSIndex


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


# ─── Type Aliases (FastAPI style) ─────────────────────────────────────────────

DBSession  = Annotated[AsyncSession, Depends(get_session)]
FAISSDep   = Annotated[FAISSIndex,   Depends(get_faiss)]
RequestID  = Annotated[str,          Depends(get_request_id)]
