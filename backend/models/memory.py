"""
AIMF ORM Models — Memory
========================
SQLAlchemy 2.x ORM model for the `memories` table.
See docs/DATABASE_SCHEMA.md for full schema rationale.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from models.lifecycle_event import LifecycleEvent


def _utcnow_iso() -> str:
    """Return current UTC time as ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _new_uuid() -> str:
    """Generate a new UUID v4 as string."""
    return str(uuid.uuid4())


class Memory(Base):
    """
    Represents a single governed memory item.

    Columns are organized into logical groups:
      - Identity / content
      - Encryption fields (NULL if not encrypted)
      - AMGS governance decision + scores
      - Classification metadata
      - Lifecycle tracking
      - Versioning (for UPDATE_EXISTING chains)
      - Embedding metadata
      - Explanation + context
    """

    __tablename__ = "memories"

    # ─── Identity ─────────────────────────────────────────────────────────────
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_new_uuid
    )
    content_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True,
        comment="SHA-256 hex of normalized content — prevents exact duplicates",
    )

    # ─── Content ──────────────────────────────────────────────────────────────
    content: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="Plaintext content, or '[ENCRYPTED]' if is_encrypted=True",
    )

    # ─── Encryption (NULL if not encrypted) ───────────────────────────────────
    ciphertext: Mapped[bytes | None] = mapped_column(
        LargeBinary, nullable=True,
        comment="AES-256-GCM ciphertext (without tag)",
    )
    nonce: Mapped[bytes | None] = mapped_column(
        LargeBinary, nullable=True,
        comment="96-bit (12-byte) GCM nonce — unique per encrypt() call",
    )
    tag: Mapped[bytes | None] = mapped_column(
        LargeBinary, nullable=True,
        comment="128-bit (16-byte) GCM authentication tag",
    )
    is_encrypted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True,
    )

    # ─── Governance Decision ──────────────────────────────────────────────────
    decision: Mapped[str] = mapped_column(
        String(32), nullable=False, index=True,
        comment="GovernanceDecision enum value",
    )
    amgs_score: Mapped[float] = mapped_column(
        Float, nullable=False,
        comment="Final AMGS score in [0.0, 1.0]",
    )
    confidence: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.5,
        comment="Decision confidence in [0.0, 1.0]",
    )

    # ─── AMGS Factor Scores ───────────────────────────────────────────────────
    f_usefulness: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    f_context_rel: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    f_frequency: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    f_novelty: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    f_redundancy: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    f_privacy_risk: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    f_temporal_decay: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # ─── Classification ───────────────────────────────────────────────────────
    sensitivity: Mapped[str] = mapped_column(
        String(16), nullable=False, default="LOW", index=True,
        comment="SensitivityLevel: LOW | MEDIUM | HIGH | CRITICAL",
    )
    memory_category: Mapped[str] = mapped_column(
        String(32), nullable=False, default="GENERAL",
        comment="MemoryCategory: 13-value enum",
    )
    usefulness_lifetime: Mapped[str] = mapped_column(
        String(16), nullable=False, default="MEDIUM",
        comment="UsefulnessLifetime: EPHEMERAL | SHORT | MEDIUM | LONG | PERMANENT",
    )

    # ─── Lifecycle ────────────────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="ACTIVE", index=True,
        comment="MemoryStatus: ACTIVE | EXPIRED | FORGOTTEN | ARCHIVED",
    )
    expires_at: Mapped[str | None] = mapped_column(
        String(32), nullable=True, index=True,
        comment="ISO-8601 expiry datetime, NULL for non-expiring memories",
    )
    created_at: Mapped[str] = mapped_column(
        String(32), nullable=False, default=_utcnow_iso,
        comment="ISO-8601 creation timestamp",
    )
    last_accessed: Mapped[str] = mapped_column(
        String(32), nullable=False, default=_utcnow_iso,
        comment="ISO-8601 timestamp of last retrieval",
    )
    access_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Number of times this memory has been retrieved",
    )

    # ─── Versioning (UPDATE_EXISTING chain) ───────────────────────────────────
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1,
        comment="Version number; incremented on UPDATE_EXISTING",
    )
    parent_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("memories.id", ondelete="SET NULL"),
        nullable=True,
        comment="ID of the memory this one replaced (UPDATE_EXISTING chain)",
    )

    # ─── Embedding Metadata ───────────────────────────────────────────────────
    embedding_dim: Mapped[int] = mapped_column(
        Integer, nullable=False, default=384,
        comment="Dimension of the stored embedding (always 384 for MiniLM)",
    )

    # ─── Explanation + Context ────────────────────────────────────────────────
    explanation: Mapped[str] = mapped_column(
        Text, nullable=False, default="{}",
        comment="JSON-serialized FactorExplanation object",
    )
    session_id: Mapped[str | None] = mapped_column(
        String(128), nullable=True, index=True,
        comment="Session identifier from the submitting request",
    )
    source_context: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="JSON snapshot of session context at time of submission",
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    lifecycle_events: Mapped[list["LifecycleEvent"]] = relationship(
        "LifecycleEvent",
        back_populates="memory",
        cascade="all, delete-orphan",
        order_by="LifecycleEvent.created_at",
    )

    # ─── Helpers ──────────────────────────────────────────────────────────────

    def touch(self) -> None:
        """Update last_accessed and increment access_count."""
        self.last_accessed = _utcnow_iso()
        self.access_count += 1

    def is_active(self) -> bool:
        return self.status == "ACTIVE"

    def is_expired_by_time(self) -> bool:
        """Check if this memory has passed its expiry timestamp."""
        if self.expires_at is None:
            return False
        expiry = datetime.fromisoformat(self.expires_at)
        now = datetime.now(timezone.utc)
        # Handle both aware and naive datetimes
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        return now > expiry

    def __repr__(self) -> str:
        return (
            f"<Memory id={self.id[:8]}... "
            f"decision={self.decision} "
            f"amgs={self.amgs_score:.3f} "
            f"status={self.status}>"
        )
