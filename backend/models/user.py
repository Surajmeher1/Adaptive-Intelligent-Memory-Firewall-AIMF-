"""
AIMF ORM Models — User
======================
SQLAlchemy 2.x ORM model for the `users` table.
Implements role-based authentication (ADMIN, USER) with password hashing.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


def _utcnow_iso() -> str:
    """Return current UTC time as ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _new_uuid() -> str:
    """Generate a new UUID v4 as string."""
    return str(uuid.uuid4())


class User(Base):
    """
    User account for AIMF role-based access.

    Roles:
      - ADMIN: Full access to AIMF governance dashboard, pipeline, and user management.
      - USER:  Access to chatbot interface only.
    """

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_new_uuid
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    full_name: Mapped[str] = mapped_column(
        String(255), nullable=False, default=""
    )
    role: Mapped[str] = mapped_column(
        String(32), nullable=False, default="USER", index=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    created_at: Mapped[str] = mapped_column(
        String(32), nullable=False, default=_utcnow_iso
    )
    updated_at: Mapped[str] = mapped_column(
        String(32), nullable=False, default=_utcnow_iso, onupdate=_utcnow_iso
    )
    last_login: Mapped[str | None] = mapped_column(
        String(32), nullable=True
    )

    def __repr__(self) -> str:
        return f"<User id={self.id!r} email={self.email!r} role={self.role!r}>"
