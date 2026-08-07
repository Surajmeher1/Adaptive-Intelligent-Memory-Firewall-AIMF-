"""Initial AIMF schema — creates all tables.

Revision ID: 001
Revises: (none — first migration)
Create Date: 2026-07-14

Tables created:
    memories          — core governed memory items
    lifecycle_events  — immutable audit log of memory state transitions
"""

from __future__ import annotations
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─── memories ─────────────────────────────────────────────────────────────
    op.create_table(
        "memories",
        sa.Column("id",              sa.String(36),  primary_key=True),
        sa.Column("content_hash",    sa.String(64),  nullable=False),
        sa.Column("content",         sa.Text,        nullable=False),

        # Encryption
        sa.Column("ciphertext",      sa.LargeBinary, nullable=True),
        sa.Column("nonce",           sa.LargeBinary, nullable=True),
        sa.Column("tag",             sa.LargeBinary, nullable=True),
        sa.Column("is_encrypted",    sa.Boolean,     nullable=False, server_default="0"),

        # Decision and AMGS
        sa.Column("decision",        sa.String(32),  nullable=False),
        sa.Column("amgs_score",      sa.Float,       nullable=False),
        sa.Column("confidence",      sa.Float,       nullable=False, server_default="0.5"),

        # AMGS factors
        sa.Column("f_usefulness",    sa.Float,  nullable=False, server_default="0.0"),
        sa.Column("f_context_rel",   sa.Float,  nullable=False, server_default="0.0"),
        sa.Column("f_frequency",     sa.Float,  nullable=False, server_default="0.0"),
        sa.Column("f_novelty",       sa.Float,  nullable=False, server_default="0.0"),
        sa.Column("f_redundancy",    sa.Float,  nullable=False, server_default="0.0"),
        sa.Column("f_privacy_risk",  sa.Float,  nullable=False, server_default="0.0"),
        sa.Column("f_temporal_decay",sa.Float,  nullable=False, server_default="0.0"),

        # Classification
        sa.Column("sensitivity",        sa.String(16), nullable=False, server_default="LOW"),
        sa.Column("memory_category",    sa.String(32), nullable=False, server_default="GENERAL"),
        sa.Column("usefulness_lifetime",sa.String(16), nullable=False, server_default="MEDIUM"),

        # Lifecycle
        sa.Column("status",        sa.String(16), nullable=False, server_default="ACTIVE"),
        sa.Column("expires_at",    sa.String(32), nullable=True),
        sa.Column("created_at",    sa.String(32), nullable=False),
        sa.Column("last_accessed", sa.String(32), nullable=False),
        sa.Column("access_count",  sa.Integer,    nullable=False, server_default="0"),

        # Versioning
        sa.Column("version",   sa.Integer, nullable=False, server_default="1"),
        sa.Column("parent_id", sa.String(36), nullable=True),

        # Embedding metadata
        sa.Column("embedding_dim", sa.Integer, nullable=False, server_default="384"),

        # Explanation + context
        sa.Column("explanation",     sa.Text, nullable=False, server_default="{}"),
        sa.Column("session_id",      sa.String(128), nullable=True),
        sa.Column("source_context",  sa.Text, nullable=True),
    )

    # Indexes on memories
    op.create_index("idx_memories_hash",       "memories", ["content_hash"], unique=True)
    op.create_index("idx_memories_status",     "memories", ["status"])
    op.create_index("idx_memories_decision",   "memories", ["decision"])
    op.create_index("idx_memories_sensitivity","memories", ["sensitivity"])
    op.create_index("idx_memories_session",    "memories", ["session_id"])
    op.create_index("idx_memories_amgs",       "memories", ["amgs_score"])
    op.create_index("idx_memories_created",    "memories", ["created_at"])
    op.create_index("idx_memories_encrypted",  "memories", ["is_encrypted"])

    # ─── lifecycle_events ─────────────────────────────────────────────────────
    op.create_table(
        "lifecycle_events",
        sa.Column("id",         sa.String(36), primary_key=True),
        sa.Column("memory_id",  sa.String(36), sa.ForeignKey("memories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(32), nullable=False),
        sa.Column("old_status", sa.String(16), nullable=True),
        sa.Column("new_status", sa.String(16), nullable=True),
        sa.Column("amgs_before",sa.Float,      nullable=True),
        sa.Column("amgs_after", sa.Float,      nullable=True),
        sa.Column("reason",     sa.Text,       nullable=True),
        sa.Column("created_at", sa.String(32), nullable=False),
    )

    op.create_index("idx_lifecycle_memory_id",  "lifecycle_events", ["memory_id"])
    op.create_index("idx_lifecycle_event_type", "lifecycle_events", ["event_type"])
    op.create_index("idx_lifecycle_created",    "lifecycle_events", ["created_at"])


def downgrade() -> None:
    op.drop_table("lifecycle_events")
    op.drop_table("memories")
