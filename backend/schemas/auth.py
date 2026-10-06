"""
AIMF Schemas — Authentication & User Models
============================================
Pydantic schemas for registration, login, JWT token exchange, and user profiles.
"""

from __future__ import annotations

from enum import Enum
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRole(str, Enum):
    """Supported roles in the AIMF two-role system."""
    ADMIN = "ADMIN"
    USER  = "USER"


# ─── Requests ─────────────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    """Payload for POST /api/v1/auth/register."""
    email: EmailStr = Field(..., description="User's unique email address")
    password: str = Field(..., min_length=6, max_length=128, description="Plaintext password (min 6 chars)")
    full_name: str = Field(default="", max_length=255, description="User's display or full name")


class UserLoginRequest(BaseModel):
    """Payload for POST /api/v1/auth/login."""
    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., min_length=1, max_length=128, description="Account password")


class TokenRefreshRequest(BaseModel):
    """Payload for POST /api/v1/auth/refresh."""
    refresh_token: str = Field(..., description="Valid JWT refresh token")


# ─── Responses ────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    """Public user profile returned to clients."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: str
    last_login: str | None = None


class TokenResponse(BaseModel):
    """JWT credentials returned on successful registration/login/refresh."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Access token expiration window in seconds")
    user: UserResponse
