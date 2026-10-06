"""Add chat_sessions and chat_messages tables for USER chatbot interface.

Revision ID: 003
Revises: 002
Create Date: 2026-09-30

Tables created:
    chat_sessions — conversation threads owned by USER-role accounts
    chat_messages — individual messages (user + assistant) within a session
"""

from __future__ import annotations
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── chat_sessions ─────────────────────────────────────────────────────────
    op.create_table(
        "chat_sessions",
        sa.Column("id",         sa.String(36),  primary_key=True),
        sa.Column("user_id",    sa.String(36),  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title",      sa.String(255), nullable=False, server_default="New Conversation"),
        sa.Column("created_at", sa.String(32),  nullable=False),
        sa.Column("updated_at", sa.String(32),  nullable=False),
    )
    op.create_index("idx_chat_sessions_user_id", "chat_sessions", ["user_id"])

    # ── chat_messages ─────────────────────────────────────────────────────────
    op.create_table(
        "chat_messages",
        sa.Column("id",            sa.String(36),  primary_key=True),
        sa.Column("session_id",    sa.String(36),  sa.ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role",          sa.String(16),  nullable=False),          # user|assistant|system
        sa.Column("content",       sa.Text,        nullable=False),
        sa.Column("aimf_decision", sa.String(64),  nullable=True),           # STORE|REJECT|…
        sa.Column("amgs_score",    sa.String(16),  nullable=True),
        sa.Column("memory_id",     sa.String(36),  nullable=True),           # FK to memories
        sa.Column("created_at",    sa.String(32),  nullable=False),
    )
    op.create_index("idx_chat_messages_session_id", "chat_messages", ["session_id"])


def downgrade() -> None:
    op.drop_index("idx_chat_messages_session_id", table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index("idx_chat_sessions_user_id",    table_name="chat_sessions")
    op.drop_table("chat_sessions")
