"""
AIMF Backend — FastAPI Application
====================================
Entry point for the AIMF FastAPI server.

Startup sequence (lifespan):
  1. Configure structured logging
  2. Validate encryption key (fail-fast if missing/malformed)
  3. Create database tables (development) / run Alembic (production)
  4. Load FAISS index from disk
  5. Load sentence-transformers embedding model
  6. Load spaCy NLP model
  7. Start background tasks (expiry checker, decay runner)

Run locally:
  cd backend/
  uvicorn main:app --reload --port 8000

Production:
  uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
  (Single worker: FAISS index is not multiprocess-safe)
"""

from __future__ import annotations

from dotenv import load_dotenv
load_dotenv()

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from core.logging import configure_logging, get_logger

logger = get_logger(__name__)


# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    FastAPI lifespan context manager.
    All startup code runs before `yield`; shutdown code runs after.
    """

    # ── Step 1: Logging ───────────────────────────────────────────────────────
    configure_logging(level=settings.log_level)
    logger.info("AIMF starting up", extra={"env": settings.env, "version": settings.api_version})

    # ── Step 2: Encryption key validation (fail-fast) ─────────────────────────
    from core.security import validate_encryption_key
    validate_encryption_key()
    logger.info("Encryption key validated")

    # ── Step 3: Database ──────────────────────────────────────────────────────
    from core.database import create_all_tables, AsyncSessionLocal
    import models  # noqa: F401 — registers all ORM models with Base.metadata
    await create_all_tables()
    logger.info("Database tables ready", extra={"url": settings.database_url.split("///")[0]})

    # ── Step 3b: Seed default admin account ──────────────────────────────────
    from sqlalchemy import select
    from models.user import User
    from core.security import hash_password

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == settings.default_admin_email)
        )
        if result.scalar_one_or_none() is None:
            admin = User(
                email=settings.default_admin_email,
                password_hash=hash_password(settings.default_admin_password),
                full_name="AIMF Administrator",
                role="ADMIN",
                is_active=True,
            )
            session.add(admin)
            await session.commit()
            logger.info("Default admin account created", extra={"email": settings.default_admin_email})
        else:
            logger.info("Default admin account already exists")

    # ── Step 4: FAISS Index ───────────────────────────────────────────────────
    from core.faiss_index import FAISSIndex
    app.state.faiss = FAISSIndex.load()
    logger.info("FAISS index ready", extra={"size": app.state.faiss.active_count})

    # ── Step 5: Embedding model (sentence-transformers) ───────────────────────
    try:
        from sentence_transformers import SentenceTransformer
        app.state.embedding_model = SentenceTransformer(settings.embedding_model)
        logger.info("Embedding model loaded", extra={"model": settings.embedding_model})
    except Exception as exc:
        logger.warning("Embedding model not loaded (AI features disabled)", extra={"error": str(exc)})
        app.state.embedding_model = None

    # ── Step 6: spaCy NLP model ───────────────────────────────────────────────
    try:
        import spacy
        app.state.nlp = spacy.load(settings.spacy_model)
        logger.info("spaCy model loaded", extra={"model": settings.spacy_model})
    except Exception as exc:
        logger.warning("spaCy model not loaded (NER disabled)", extra={"error": str(exc)})
        app.state.nlp = None

    # ── Step 7: Background tasks ────────────────────────────────────────────────────
    import asyncio
    from core.database import AsyncSessionLocal
    from tasks.background import expiry_checker_loop, amgs_decay_loop, set_stop_event

    _stop = asyncio.Event()
    set_stop_event(_stop)
    _bg_tasks = [
        asyncio.create_task(expiry_checker_loop(AsyncSessionLocal), name="expiry_checker"),
        asyncio.create_task(amgs_decay_loop(AsyncSessionLocal),     name="amgs_decay"),
    ]

    logger.info("AIMF startup complete — server is ready")

    yield  # ← server is running while here ────────────────────────────────────

    # ── Graceful shutdown ────────────────────────────────────────────────────────────
    _stop.set()
    for t in _bg_tasks:
        t.cancel()
    await asyncio.gather(*_bg_tasks, return_exceptions=True)
    logger.info("Background tasks stopped")

    # ── Shutdown ──────────────────────────────────────────────────────────────
    logger.info("AIMF shutting down")
    if hasattr(app.state, "faiss") and app.state.faiss is not None:
        app.state.faiss.save()
        logger.info("FAISS index saved to disk")
    logger.info("AIMF shutdown complete")


# ─── Application Factory ──────────────────────────────────────────────────────

def create_app() -> FastAPI:
    """
    Build and configure the FastAPI application.
    Separated from module-level so tests can create isolated instances.
    """
    app = FastAPI(
        title="AIMF — Adaptive AI Memory Firewall",
        description=(
            "A context-aware, privacy-preserving memory management framework. "
            "Governs AI memory using the Adaptive Memory Governance Score (AMGS)."
        ),
        version=settings.api_version,
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        openapi_url="/openapi.json" if settings.is_development else None,
        lifespan=lifespan,
    )

    # ── CORS ─────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────────
    from api.v1.health import router as health_router
    from api.v1.auth   import router as auth_router
    from api.v1.memory import router as memory_router
    from api.v1.chat   import router as chat_router
    app.include_router(health_router, prefix="/api/v1")
    app.include_router(auth_router,   prefix="/api/v1")
    app.include_router(memory_router, prefix="/api/v1")
    app.include_router(chat_router,   prefix="/api/v1")

    from api.v1.baseline  import router as baseline_router
    from api.v1.research  import router as research_router
    app.include_router(baseline_router, prefix="/api/v1")
    app.include_router(research_router,  prefix="/api/v1")

    # ── Global exception handler ──────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """
        Catch-all handler: ensures no unhandled exception leaks as a raw 500
        without structured RFC 7807 format (NFR-11).
        """
        logger.error("Unhandled exception", extra={
            "path": str(request.url),
            "error": type(exc).__name__,
            "detail": str(exc)[:200],  # truncate to avoid log bloat
        })
        return JSONResponse(
            status_code=500,
            content={
                "type": "https://aimf.local/errors/internal-error",
                "title": "Internal Server Error",
                "status": 500,
                "detail": "An unexpected error occurred. Check server logs for details.",
                "instance": str(request.url.path),
            },
        )

    @app.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {
            "name": "AIMF — Adaptive AI Memory Firewall",
            "version": settings.api_version,
            "docs": "/docs",
            "health": "/api/v1/health",
        }

    return app


# ─── Application Instance ─────────────────────────────────────────────────────
# Used by uvicorn: uvicorn main:app --reload --port 8000
app = create_app()
