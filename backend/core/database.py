"""
AIMF Core Database
==================
SQLAlchemy 2.x async engine, session factory, and Base class.
Supports SQLite (development) and PostgreSQL (production).

SQLite-specific pragmas applied:
  - WAL mode (Write-Ahead Logging) — enables concurrent reads
  - foreign_keys=ON — enforces FK constraints in SQLite

Usage:
    from core.database import get_session, Base, engine

    # In FastAPI route (via dependency injection):
    async def route(session: AsyncSession = Depends(get_session)):
        ...

    # Creating tables (called in lifespan):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event, text

from core.config import settings


# ─── Engine ──────────────────────────────────────────────────────────────────

def _build_connect_args() -> dict[str, Any]:
    """
    Build driver-specific connection arguments.
    SQLite needs check_same_thread=False for async compatibility.
    """
    if settings.database_url.startswith("sqlite"):
        return {"check_same_thread": False, "timeout": 30.0}
    return {}


engine = create_async_engine(
    settings.database_url,
    echo=settings.is_development,  # SQL query logging in development only
    connect_args=_build_connect_args(),
    # Pool settings for SQLite (StaticPool not needed with aiosqlite)
    # For PostgreSQL, connection pool defaults are fine
)


# ─── SQLite Pragmas ───────────────────────────────────────────────────────────

@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragmas(dbapi_connection: Any, connection_record: Any) -> None:
    """
    Apply SQLite-specific PRAGMA settings on every new connection.
    These are no-ops for PostgreSQL connections.
    """
    if not settings.database_url.startswith("sqlite"):
        return
    cursor = dbapi_connection.cursor()
    # WAL mode: allows concurrent reads while a write is in progress
    cursor.execute("PRAGMA journal_mode=WAL")
    # Enforce foreign key constraints (SQLite ignores them by default)
    cursor.execute("PRAGMA foreign_keys=ON")
    # Synchronous writes: NORMAL balances safety and performance
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


# ─── Session Factory ─────────────────────────────────────────────────────────

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # objects usable after commit without re-query
    autocommit=False,
    autoflush=False,
)


# ─── Declarative Base ─────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy ORM models.
    All models in models/ must inherit from this class.
    """
    pass


# ─── FastAPI Dependency ───────────────────────────────────────────────────────

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields a database session and handles
    commit/rollback/close lifecycle.

    Usage in router:
        async def endpoint(session: AsyncSession = Depends(get_session)):
            ...

    The session is automatically:
    - Committed on successful response
    - Rolled back on exception
    - Closed after response is sent
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ─── Utility ─────────────────────────────────────────────────────────────────

async def create_all_tables() -> None:
    """
    Create all database tables from ORM metadata.
    Called during application startup lifespan.
    In production, use Alembic migrations instead.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def check_database_connection() -> bool:
    """
    Health-check: returns True if database is reachable.
    Used by the /health endpoint.
    """
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
