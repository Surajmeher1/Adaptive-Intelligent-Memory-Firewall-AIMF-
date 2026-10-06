"""
AIMF API v1 — Authentication Endpoints
=======================================
Implements user registration, login, token refresh, session invalidation, and profile inspection.
"""

from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from jose import JWTError
from sqlalchemy import select

from api.deps import CurrentUser, DBSession
from core.config import settings
from core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from models.user import User
from schemas.auth import (
    TokenRefreshRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _build_token_response(user: User) -> TokenResponse:
    """Helper to assemble a TokenResponse for a given active user."""
    token_data = {"sub": user.id, "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.jwt_expiry_minutes * 60,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    body: UserRegisterRequest,
    db: DBSession,
) -> TokenResponse:
    normalized_email = body.email.strip().lower()

    # Check for existing account
    existing = await db.execute(select(User).where(User.email == normalized_email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    # All public registrations receive USER role by default (backend authoritative)
    user = User(
        email=normalized_email,
        password_hash=hash_password(body.password),
        full_name=body.full_name.strip(),
        role="USER",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return _build_token_response(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate user and return JWT tokens",
)
async def login(
    body: UserLoginRequest,
    db: DBSession,
) -> TokenResponse:
    normalized_email = body.email.strip().lower()

    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated",
        )

    # Update last login timestamp
    user.last_login = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(user)

    return _build_token_response(user)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Exchange a refresh token for new credentials",
)
async def refresh(
    body: TokenRefreshRequest,
    db: DBSession,
) -> TokenResponse:
    try:
        payload = decode_token(body.refresh_token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is not a refresh token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject identifier",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer active or does not exist",
        )

    return _build_token_response(user)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout user session",
)
async def logout() -> dict[str, str]:
    """Client-side token invalidation acknowledgement."""
    return {"status": "ok", "message": "Successfully logged out"}


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get currently authenticated user profile",
)
async def get_me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)
