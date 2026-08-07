"""
AIMF API — Health Check Endpoint
=================================
GET /api/v1/health

Returns overall system health including database connectivity,
FAISS index status, and component readiness.
This is the first endpoint to implement — used to verify Phase 2 completion.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel

from core.config import settings
from core.database import check_database_connection
from core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["health"])


class ComponentStatus(BaseModel):
    database:        Literal["ok", "error"]
    faiss_index:     Literal["ok", "error"]
    embedding_model: Literal["ok", "not_loaded", "error"]
    nlp_model:       Literal["ok", "not_loaded", "error"]
    encryption:      Literal["ok", "error"]


class HealthResponse(BaseModel):
    status:       Literal["healthy", "degraded", "unhealthy"]
    version:      str
    timestamp:    str
    environment:  str
    components:   ComponentStatus
    memory_count: int
    index_size:   int


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System health check",
    description=(
        "Returns the operational status of all AIMF system components. "
        "Use this to verify the server is running and all dependencies are available."
    ),
)
async def health_check(request: Request) -> HealthResponse:
    """
    Performs live health checks on:
    - Database (SELECT 1 query)
    - FAISS index (initialized and correct dimension)
    - Embedding model (loaded in app.state)
    - spaCy NLP model (loaded in app.state)
    - Encryption key (env var present and valid)
    """
    # ─── Database check ───────────────────────────────────────────────────────
    db_ok = await check_database_connection()
    db_status: Literal["ok", "error"] = "ok" if db_ok else "error"

    # ─── FAISS check ──────────────────────────────────────────────────────────
    faiss = getattr(request.app.state, "faiss", None)
    faiss_ok = faiss is not None and faiss.is_healthy()
    faiss_available = faiss is not None and getattr(faiss, "available", False)
    faiss_status: Literal["ok", "error"] = "ok" if faiss_available else "error"
    index_size = faiss.active_count if faiss is not None else 0

    # ─── Embedding model check ────────────────────────────────────────────────
    embedding_model = getattr(request.app.state, "embedding_model", None)
    if embedding_model is not None:
        emb_status: Literal["ok", "not_loaded", "error"] = "ok"
    else:
        emb_status = "not_loaded"

    # ─── NLP model check ──────────────────────────────────────────────────────
    nlp_model = getattr(request.app.state, "nlp", None)
    if nlp_model is not None:
        nlp_status: Literal["ok", "not_loaded", "error"] = "ok"
    else:
        nlp_status = "not_loaded"

    # ─── Encryption key check ─────────────────────────────────────────────────
    try:
        from core.security import validate_encryption_key
        validate_encryption_key()
        enc_status: Literal["ok", "error"] = "ok"
    except Exception:
        enc_status = "error"

    # ─── Memory count ─────────────────────────────────────────────────────────
    memory_count = 0
    if db_ok:
        try:
            from sqlalchemy import text, func, select
            from models.memory import Memory
            from core.database import AsyncSessionLocal
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(func.count()).select_from(Memory).where(
                        Memory.status == "ACTIVE"
                    )
                )
                memory_count = result.scalar_one_or_none() or 0
        except Exception:
            memory_count = 0

    # ─── Overall status ───────────────────────────────────────────────────────
    critical_failures = [db_status, enc_status]
    if any(s == "error" for s in critical_failures):
        overall: Literal["healthy", "degraded", "unhealthy"] = "unhealthy"
    elif faiss_status == "error" or emb_status != "ok" or nlp_status != "ok":
        overall = "degraded"
    else:
        overall = "healthy"

    logger.info("health_check", extra={
        "status": overall,
        "db": db_status,
        "faiss": faiss_status,
        "memory_count": memory_count,
    })

    return HealthResponse(
        status=overall,
        version=settings.api_version,
        timestamp=datetime.now(timezone.utc).isoformat(),
        environment=settings.env,
        components=ComponentStatus(
            database=db_status,
            faiss_index=faiss_status,
            embedding_model=emb_status,
            nlp_model=nlp_status,
            encryption=enc_status,
        ),
        memory_count=memory_count,
        index_size=index_size,
    )
