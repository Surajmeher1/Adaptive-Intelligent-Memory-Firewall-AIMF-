"""
Alembic environment configuration for AIMF.
Reads AIMF_DATABASE_URL from environment variables via Pydantic Settings.
Supports both sync (offline) and sync-online migration modes.
Uses a plain synchronous engine so Alembic doesn't conflict with
the application's async (aiosqlite/asyncpg) driver.
"""

from __future__ import annotations

import os
import sys
from logging.config import fileConfig

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, pool

from alembic import context

# Import AIMF settings and Base (with all models registered)
from core.config import settings
from core.database import Base
import models  # noqa: F401 — registers Memory, LifecycleEvent, User, ChatSession, ChatMessage with Base.metadata

# Alembic Config object from alembic.ini
config = context.config

# Override sqlalchemy.url from settings (respects .env file)
# Strip the async driver prefix so we use a plain synchronous driver
sync_url = (
    settings.database_url
    .replace("sqlite+aiosqlite://", "sqlite://")
    .replace("postgresql+asyncpg://", "postgresql+psycopg2://")
)
config.set_main_option("sqlalchemy.url", sync_url)

# Logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata for --autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations without a live database connection (generates SQL script)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations with a live synchronous database connection."""
    url = config.get_main_option("sqlalchemy.url")
    connectable = create_engine(url, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
