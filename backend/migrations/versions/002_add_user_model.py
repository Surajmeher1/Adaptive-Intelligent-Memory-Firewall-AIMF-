"""Add users table for authentication and RBAC.

Revision ID: 002
Revises: 001
Create Date: 2026-09-30

Tables created:
    users — user accounts with authentication and role assignments
"""

from __future__ import annotations
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id",            sa.String(36),  primary_key=True),
        sa.Column("email",         sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name",     sa.String(255), nullable=False, server_default=""),
        sa.Column("role",          sa.String(32),  nullable=False, server_default="USER"),
        sa.Column("is_active",     sa.Boolean,     nullable=False, server_default="1"),
        sa.Column("created_at",    sa.String(32),  nullable=False),
        sa.Column("updated_at",    sa.String(32),  nullable=False),
        sa.Column("last_login",    sa.String(32),  nullable=True),
    )

    op.create_index("idx_users_email", "users", ["email"], unique=True)
    op.create_index("idx_users_role",  "users", ["role"])


def downgrade() -> None:
    op.drop_index("idx_users_role",  table_name="users")
    op.drop_index("idx_users_email", table_name="users")
    op.drop_table("users")
