"""
AIMF ORM Models — Chat Session & Message
=========================================
SQLAlchemy 2.x ORM models for the USER chatbot interface.

Tables:
  chat_sessions — one session per user conversation thread
  chat_messages — individual messages within a session;
                  USER messages that are approved by AIMF pipeline
                  are also persisted to the memories table.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from models.user import User


def _utcnow_iso() -> str:
    """Return current UTC time as ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _new_uuid() -> str:
    """Generate a new UUID v4 as string."""
    return str(uuid.uuid4())


class ChatSession(Base):
    """
    A single conversation session for a USER-role account.

    One user can have many sessions. Each session groups a set of
    chat messages together (like a conversation thread).
    """

    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_new_uuid
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(255), nullable=False, default="New Conversation"
    )
    created_at: Mapped[str] = mapped_column(
        String(32), nullable=False, default=_utcnow_iso
    )
    updated_at: Mapped[str] = mapped_column(
        String(32), nullable=False, default=_utcnow_iso, onupdate=_utcnow_iso
    )

    # Relationships
    messages: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )

    def __repr__(self) -> str:
        return f"<ChatSession id={self.id!r} user_id={self.user_id!r}>"


class ChatMessage(Base):
    """
    A single message in a ChatSession.

    role: 'user' | 'assistant' | 'system'
    aimf_decision: the AMGS governance decision for user messages
                   (None for assistant/system messages)
    memory_id: set if the AIMF pipeline approved and persisted the
               user's message as a Memory record.
    """

    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_new_uuid
    )
    session_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(
        String(16), nullable=False
    )  # 'user' | 'assistant' | 'system'
    content: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    aimf_decision: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )  # STORE, REJECT, REJECT_PRIVACY, etc.
    amgs_score: Mapped[str | None] = mapped_column(
        String(16), nullable=True
    )  # stored as string for portability
    memory_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True
    )  # FK to memories.id if persisted
    created_at: Mapped[str] = mapped_column(
        String(32), nullable=False, default=_utcnow_iso
    )

    # Relationship back to session
    session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")

    def __repr__(self) -> str:
        return (
            f"<ChatMessage id={self.id!r} role={self.role!r} "
            f"decision={self.aimf_decision!r}>"
        )
