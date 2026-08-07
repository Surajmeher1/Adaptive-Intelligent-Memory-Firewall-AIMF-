"""
AIMF Test Configuration — pytest conftest.py
=============================================
Shared fixtures for all tests.

Key fixtures:
  test_settings  — settings overridden for test environment
  app            — FastAPI test application instance
  client         — async httpx test client
  db_session     — isolated in-memory SQLite session per test
"""

from __future__ import annotations

import base64
import os
import pytest
import pytest_asyncio

# Set test environment BEFORE importing any AIMF modules
os.environ.setdefault("AIMF_ENV", "test")
os.environ.setdefault(
    "AIMF_ENCRYPTION_KEY",
    # Exactly 32 bytes (256-bit) — verified: len(b"aimf_test_key_exactly_32bytes!!!") == 32
    base64.b64encode(b"aimf_test_key_exactly_32bytes!!!").decode(),
)
os.environ.setdefault("AIMF_DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("AIMF_LOG_LEVEL", "ERROR")  # quiet tests
os.environ.setdefault("AIMF_FAISS_INDEX_PATH", ":memory_test:")


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


@pytest_asyncio.fixture(scope="function")
async def app():
    """
    Create a fresh FastAPI test application per test function.
    Uses in-memory SQLite — no files created.
    """
    from main import create_app
    test_app = create_app()
    async with test_app.router.lifespan_context(test_app):
        yield test_app


@pytest_asyncio.fixture(scope="function")
async def client(app):
    """Async httpx test client bound to the test app."""
    from httpx import AsyncClient, ASGITransport
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest_asyncio.fixture(scope="function")
async def db_session():
    """
    Isolated async SQLAlchemy session using in-memory SQLite.
    Tables created fresh per test. Rolled back after.
    """
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from core.database import Base
    import models  # noqa: F401

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        yield session

    await engine.dispose()
