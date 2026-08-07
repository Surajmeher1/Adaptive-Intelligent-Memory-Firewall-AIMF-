"""
AIMF ORM Models — LifecycleEvent
=================================
Immutable audit log of all memory state transitions.
Every status change (CREATED, ACCESSED, DECAYED, EXPIRED,
FORGOTTEN, UPDATED, ARCHIVED, MERGED) produces one row here.

This table is append-only. No UPDATE or DELETE is ever issued
against it (research audit requirement RR-22).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from models.memory import Memory


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_uuid() -> str:
    return str(uuid.uuid4())


class LifecycleEvent(Base):
    """
    Immutable audit log entry for a memory lifecycle transition.

    Event types:
        CREATED   — memory first stored
        ACCESSED  — memory retrieved via API
        DECAYED   — AMGS score reduced by decay engine
        EXPIRED   — STORE_TEMPORARY memory passed expires_at
        FORGOTTEN — memory soft-deleted (FORGET decision)
        UPDATED   — memory content replaced (UPDATE_EXISTING)
        ARCHIVED  — memory moved to ARCHIVED status
        MERGED    — memory merged into another (MERGE_WITH_EXISTING)
    """

    __tablename__ = "lifecycle_events"

    # ─── Identity ─────────────────────────────────────────────────────────────
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_new_uuid
    )
    memory_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("memories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ─── Event Description ────────────────────────────────────────────────────
    event_type: Mapped[str] = mapped_column(
        String(32), nullable=False, index=True,
        comment=(
            "CREATED | ACCESSED | DECAYED | EXPIRED | "
            "FORGOTTEN | UPDATED | ARCHIVED | MERGED"
        ),
    )

    # ─── State Transition ─────────────────────────────────────────────────────
    old_status: Mapped[str | None] = mapped_column(
        String(16), nullable=True,
        comment="Memory status before this event",
    )
    new_status: Mapped[str | None] = mapped_column(
        String(16), nullable=True,
        comment="Memory status after this event",
    )

    # ─── AMGS Transition ──────────────────────────────────────────────────────
    amgs_before: Mapped[float | None] = mapped_column(
        Float, nullable=True,
        comment="AMGS score before this event",
    )
    amgs_after: Mapped[float | None] = mapped_column(
        Float, nullable=True,
        comment="AMGS score after this event",
    )

    # ─── Reason ───────────────────────────────────────────────────────────────
    reason: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="Human-readable reason for this lifecycle transition",
    )

    # ─── Timestamp ────────────────────────────────────────────────────────────
    created_at: Mapped[str] = mapped_column(
        String(32), nullable=False, default=_utcnow_iso, index=True,
    )

    # ─── Relationship ─────────────────────────────────────────────────────────
    memory: Mapped["Memory"] = relationship(
        "Memory",
        back_populates="lifecycle_events",
    )

    # ─── Factory Methods ──────────────────────────────────────────────────────

    @classmethod
    def created(
        cls,
        memory_id: str,
        amgs_after: float,
        reason: str = "Memory stored via governance decision",
    ) -> "LifecycleEvent":
        return cls(
            memory_id=memory_id,
            event_type="CREATED",
            old_status=None,
            new_status="ACTIVE",
            amgs_before=None,
            amgs_after=amgs_after,
            reason=reason,
        )

    @classmethod
    def accessed(cls, memory_id: str, amgs_score: float) -> "LifecycleEvent":
        return cls(
            memory_id=memory_id,
            event_type="ACCESSED",
            old_status="ACTIVE",
            new_status="ACTIVE",
            amgs_before=amgs_score,
            amgs_after=amgs_score,
            reason="Memory retrieved via GET /api/v1/memory/{id}",
        )

    @classmethod
    def status_changed(
        cls,
        memory_id: str,
        old_status: str,
        new_status: str,
        amgs_before: float,
        amgs_after: float,
        reason: str,
    ) -> "LifecycleEvent":
        """Generic status transition factory."""
        return cls(
            memory_id=memory_id,
            event_type="UPDATED",
            old_status=old_status,
            new_status=new_status,
            amgs_before=amgs_before,
            amgs_after=amgs_after,
            reason=reason,
        )

    @classmethod
    def decayed(cls, memory_id: str, amgs_before: float, amgs_after: float) -> "LifecycleEvent":
        return cls(
            memory_id=memory_id,
            event_type="DECAYED",
            old_status="ACTIVE",
            new_status="ACTIVE",
            amgs_before=amgs_before,
            amgs_after=amgs_after,
            reason=f"Temporal decay applied: {amgs_before:.4f} → {amgs_after:.4f}",
        )

    @classmethod
    def forgotten(cls, memory_id: str, amgs: float, reason: str = "Memory forgotten") -> "LifecycleEvent":
        return cls(
            memory_id=memory_id,
            event_type="FORGOTTEN",
            old_status="ACTIVE",
            new_status="FORGOTTEN",
            amgs_before=amgs,
            amgs_after=amgs,
            reason=reason,
        )

    @classmethod
    def expired(cls, memory_id: str) -> "LifecycleEvent":
        return cls(
            memory_id=memory_id,
            event_type="EXPIRED",
            old_status="ACTIVE",
            new_status="EXPIRED",
            reason="STORE_TEMPORARY memory passed expires_at timestamp",
        )

    def __repr__(self) -> str:
        return (
            f"<LifecycleEvent memory={self.memory_id[:8]}... "
            f"type={self.event_type} at={self.created_at}>"
        )
