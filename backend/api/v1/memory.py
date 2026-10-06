"""
AIMF API v1 — Memory Endpoints
================================
Implements all GROUP 2, 3, and 4 endpoints from docs/API_SPECIFICATION.md

Endpoints:
  POST  /api/v1/memory/analyze          — analyze only (no storage)
  POST  /api/v1/memory/submit           — analyze + store if approved
  GET   /api/v1/memory/                 — paginated list with filters
  GET   /api/v1/memory/search           — semantic similarity search
  GET   /api/v1/memory/{id}             — retrieve single memory
  GET   /api/v1/memory/{id}/lifecycle   — lifecycle history
  PUT   /api/v1/memory/{id}             — update content (new version)
  DELETE /api/v1/memory/{id}            — soft-delete (FORGET)
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.pipeline.orchestrator import run_pipeline
from ai.pipeline import PipelineContext
from api.deps import DBSession, RequestID
from core.logging import get_logger
from core.security import encrypt, decrypt
from models.lifecycle_event import LifecycleEvent
from models.memory import Memory
from schemas.memory import (
    AnalysisMetadata,
    AnalyzeResponse,
    EntityInfo,
    FactorExplanation,
    FactorScores,
    LifecycleEventOut,
    LifecycleHistoryResponse,
    MemoryAnalyzeRequest,
    MemoryListItem,
    MemoryOut,
    MemoryUpdateRequest,
    PaginatedMemoryList,
    SearchResponse,
    SearchResult,
    StorageMetadata,
    SubmitResponse,
)

logger = get_logger(__name__)

router = APIRouter(tags=["memory"])

_STORAGE_DECISIONS = {
    "STORE",
    "STORE_LONG_TERM",
    "STORE_ENCRYPT",
    "ENCRYPT_AND_STORE",
    "STORE_TEMPORARY",
    "SUMMARIZE",
    "SUMMARIZE_AND_STORE",
    "UPDATE_EXISTING",
    "MERGE_WITH_EXISTING",
}
_REJECT_DECISIONS  = {"REJECT", "REJECT_PRIVACY"}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _ctx_to_analyze_response(ctx: PipelineContext, request_id: str, latency_ms: float) -> AnalyzeResponse:
    """Map a completed PipelineContext to AnalyzeResponse."""
    return AnalyzeResponse(
        request_id=request_id,
        decision=ctx.decision,                                   # type: ignore[arg-type]
        amgs_score=ctx.amgs_score,
        confidence=ctx.confidence,
        review_recommended=ctx.review_recommended,
        factors=FactorScores(
            usefulness=ctx.usefulness,
            context_relevance=ctx.context_relevance,
            frequency=ctx.frequency,
            novelty=ctx.novelty,
            redundancy=ctx.redundancy,
            privacy_risk=ctx.privacy_risk,
            temporal_decay=ctx.temporal_decay,
        ),
        explanation=FactorExplanation(
            rationale=ctx.rationale,
            decision_boundary=ctx.decision_boundary,
            dominant_factor=ctx.dominant_factor,
            privacy_patterns_found=ctx.privacy_patterns,
            similar_memory_id=ctx.similar_memory_id,
        ),
        metadata=AnalysisMetadata(
            token_count=ctx.token_count,
            entities=[
                EntityInfo(text=e.text, label=e.label, start=e.start, end=e.end)
                for e in ctx.entities
            ],
            sensitivity=ctx.sensitivity,                         # type: ignore[arg-type]
            memory_category=ctx.memory_category,                 # type: ignore[arg-type]
            usefulness_lifetime=ctx.usefulness_lifetime,         # type: ignore[arg-type]
            is_temporal=ctx.is_temporal,
            expires_at=ctx.expires_at,
            language=ctx.language,
            language_warning=ctx.language_warning,
        ),
        latency_ms=latency_ms,
    )


def _memory_to_out(mem: Memory, content_override: str | None = None) -> MemoryOut:
    """Convert a Memory ORM object to MemoryOut schema."""
    return MemoryOut(
        id=mem.id,
        content=content_override or mem.content,
        decision=mem.decision,                                   # type: ignore[arg-type]
        amgs_score=mem.amgs_score,
        factors=FactorScores(
            usefulness=mem.f_usefulness,
            context_relevance=mem.f_context_rel,
            frequency=mem.f_frequency,
            novelty=mem.f_novelty,
            redundancy=mem.f_redundancy,
            privacy_risk=mem.f_privacy_risk,
            temporal_decay=mem.f_temporal_decay,
        ),
        explanation=FactorExplanation(
            rationale=mem.explanation or "",
            decision_boundary="",
            dominant_factor="",
            privacy_patterns_found=[],
            similar_memory_id=None,
        ),
        sensitivity=mem.sensitivity,                             # type: ignore[arg-type]
        memory_category=mem.memory_category,                     # type: ignore[arg-type]
        usefulness_lifetime=mem.usefulness_lifetime,             # type: ignore[arg-type]
        status=mem.status,                                       # type: ignore[arg-type]
        is_encrypted=mem.is_encrypted,
        expires_at=mem.expires_at,
        created_at=mem.created_at.isoformat() if hasattr(mem.created_at, "isoformat") else str(mem.created_at or ""),
        last_accessed=mem.last_accessed.isoformat() if hasattr(mem.last_accessed, "isoformat") else str(mem.last_accessed or ""),
        access_count=mem.access_count,
        version=mem.version,
        parent_id=mem.parent_id,
        entities=[],
        session_id=mem.session_id,
    )


async def _persist_memory(
    ctx: PipelineContext,
    db: AsyncSession,
    faiss_index=None,
    session_id: str | None = None,
) -> tuple[Memory, bool]:
    """
    Persist a memory to DB and FAISS. Returns (Memory, was_stored).
    Encrypts content when decision == STORE_ENCRYPT.
    Creates a CREATED lifecycle event.
    """
    # ── Duplicate check ───────────────────────────────────────────────────────
    existing = await db.execute(
        select(Memory).where(
            Memory.content_hash == ctx.content_hash,
        )
    )
    existing_mem = existing.scalar_one_or_none()
    if existing_mem is not None:
        if existing_mem.status != "ACTIVE":
            existing_mem.status = "ACTIVE"
            existing_mem.decision = ctx.decision
            existing_mem.amgs_score = ctx.amgs_score
            existing_mem.confidence = ctx.confidence
            existing_mem.sensitivity = ctx.sensitivity
            existing_mem.memory_category = ctx.memory_category
            existing_mem.usefulness_lifetime = ctx.usefulness_lifetime
            existing_mem.f_usefulness = ctx.usefulness
            existing_mem.f_context_rel = ctx.context_relevance
            existing_mem.f_frequency = ctx.frequency
            existing_mem.f_novelty = ctx.novelty
            existing_mem.f_redundancy = ctx.redundancy
            existing_mem.f_privacy_risk = ctx.privacy_risk
            existing_mem.f_temporal_decay = ctx.temporal_decay
            existing_mem.expires_at = ctx.expires_at
            existing_mem.explanation = ctx.rationale or ""
            existing_mem.touch()
            event = LifecycleEvent.created(
                memory_id=existing_mem.id,
                amgs_after=ctx.amgs_score,
                reason="Memory restored / re-created",
            )
            db.add(event)
            return existing_mem, True
        else:
            existing_mem.touch()
            event = LifecycleEvent.accessed(
                memory_id=existing_mem.id,
                amgs_score=existing_mem.amgs_score,
            )
            db.add(event)
            return existing_mem, True

    memory_id = str(uuid.uuid4())

    # ── Encrypt if required ────────────────────────────────────────────────────
    if ctx.decision in ("STORE_ENCRYPT", "ENCRYPT_AND_STORE"):
        payload = encrypt(ctx.normalised_content)
        stored_content = "[ENCRYPTED]"
        enc_nonce = payload.nonce
        enc_tag   = payload.tag
        enc_ct    = payload.ciphertext
        is_encrypted = True
    else:
        stored_content = ctx.normalised_content
        enc_nonce = enc_tag = enc_ct = None
        is_encrypted = False

    # ── Storage tier ───────────────────────────────────────────────────────────
    tier_map = {
        "STORE_LONG_TERM":     "LONG_TERM",
        "STORE_ENCRYPT":       "LONG_TERM",
        "ENCRYPT_AND_STORE":   "LONG_TERM",
        "STORE_TEMPORARY":     "TEMPORARY",
        "SUMMARIZE":           "SUMMARIZED",
        "SUMMARIZE_AND_STORE": "SUMMARIZED",
        "STORE":               "LONG_TERM",
        "UPDATE_EXISTING":     "LONG_TERM",
        "MERGE_WITH_EXISTING": "LONG_TERM",
    }
    storage_tier = tier_map.get(ctx.decision, "LONG_TERM")

    mem = Memory(
        id=memory_id,
        content=stored_content,
        content_hash=ctx.content_hash,
        status="ACTIVE",
        decision=ctx.decision,
        amgs_score=ctx.amgs_score,
        confidence=ctx.confidence,
        sensitivity=ctx.sensitivity,
        memory_category=ctx.memory_category,
        usefulness_lifetime=ctx.usefulness_lifetime,
        f_usefulness=ctx.usefulness,
        f_context_rel=ctx.context_relevance,
        f_frequency=ctx.frequency,
        f_novelty=ctx.novelty,
        f_redundancy=ctx.redundancy,
        f_privacy_risk=ctx.privacy_risk,
        f_temporal_decay=ctx.temporal_decay,
        expires_at=ctx.expires_at,
        is_encrypted=is_encrypted,
        nonce=enc_nonce,
        tag=enc_tag,
        ciphertext=enc_ct,
        # explanation field stores the rationale text
        explanation=ctx.rationale or "",
        session_id=session_id,
    )

    db.add(mem)

    # ── Lifecycle event ────────────────────────────────────────────────────────
    event = LifecycleEvent.created(
        memory_id=memory_id,
        amgs_after=ctx.amgs_score,
        reason=f"Memory stored via {ctx.decision} decision",
    )
    db.add(event)

    await db.flush()

    # ── FAISS index ────────────────────────────────────────────────────────────
    if ctx.embedding is not None and faiss_index is not None:
        import numpy as np
        embedding_arr = np.array(ctx.embedding, dtype=np.float32)
        faiss_index.add(memory_id, embedding_arr)

    return mem, True


async def _get_memory_or_404(memory_id: str, db: AsyncSession) -> Memory:
    """Fetch a memory by ID or raise 404."""
    result = await db.execute(select(Memory).where(Memory.id == memory_id))
    mem = result.scalar_one_or_none()
    if mem is None:
        raise HTTPException(status_code=404, detail=f"Memory '{memory_id}' not found")
    if mem.status == "FORGOTTEN":
        raise HTTPException(status_code=410, detail=f"Memory '{memory_id}' has been forgotten")
    return mem


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get(
    "/memory/stats",
    summary="Aggregate dashboard statistics for all memories",
    description="Returns counts, averages, and distribution data computed live from the memory table.",
)
async def get_memory_stats(db: DBSession) -> dict:
    """Return real-time aggregate statistics for the admin dashboard."""
    from datetime import date

    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)

    # Total count (including forgotten, for audit)
    total_result = await db.execute(select(func.count()).select_from(select(Memory).subquery()))
    total_all = total_result.scalar_one() or 0

    # Active
    active_result = await db.execute(
        select(func.count()).select_from(select(Memory).where(Memory.status == "ACTIVE").subquery())
    )
    active = active_result.scalar_one() or 0

    # Encrypted
    enc_result = await db.execute(
        select(func.count()).select_from(select(Memory).where(Memory.is_encrypted == True).subquery())  # noqa: E712
    )
    encrypted = enc_result.scalar_one() or 0

    # Forgotten
    forg_result = await db.execute(
        select(func.count()).select_from(select(Memory).where(Memory.status == "FORGOTTEN").subquery())
    )
    forgotten = forg_result.scalar_one() or 0

    # Average AMGS across all non-forgotten memories
    avg_result = await db.execute(
        select(func.avg(Memory.amgs_score)).where(Memory.status != "FORGOTTEN")
    )
    avg_amgs = round(float(avg_result.scalar_one() or 0.0), 4)

    # Memories added today
    today_result = await db.execute(
        select(func.count()).select_from(
            select(Memory).where(Memory.created_at >= today_start).subquery()
        )
    )
    memories_today = today_result.scalar_one() or 0

    # Privacy score: proportion of memories that are encrypted or rejected
    privacy_result = await db.execute(
        select(func.count()).select_from(
            select(Memory).where(
                Memory.decision.in_(["STORE_ENCRYPT", "REJECT", "REJECT_PRIVACY"])
            ).subquery()
        )
    )
    privacy_handled = privacy_result.scalar_one() or 0
    privacy_score = round(privacy_handled / total_all, 4) if total_all > 0 else 0.0

    # Storage efficiency: fraction of submitted content that was stored (not rejected/forgotten)
    stored_result = await db.execute(
        select(func.count()).select_from(
            select(Memory).where(
                Memory.decision.in_(["STORE", "STORE_LONG_TERM", "STORE_ENCRYPT", "STORE_TEMPORARY", "SUMMARIZE"])
            ).subquery()
        )
    )
    stored_count = stored_result.scalar_one() or 0
    storage_efficiency = round(stored_count / total_all, 4) if total_all > 0 else 0.0

    # Decision distribution
    dist_result = await db.execute(
        select(Memory.decision, func.count().label("cnt"))
        .group_by(Memory.decision)
        .order_by(func.count().desc())
    )
    decision_rows = dist_result.all()
    decision_distribution = [
        {
            "decision": row.decision,
            "count": row.cnt,
            "percentage": round((row.cnt / total_all * 100), 1) if total_all > 0 else 0.0,
        }
        for row in decision_rows
    ]

    return {
        "total_memories": total_all,
        "active_memories": active,
        "encrypted_memories": encrypted,
        "forgotten_memories": forgotten,
        "avg_amgs_score": avg_amgs,
        "privacy_score": privacy_score,
        "storage_efficiency": storage_efficiency,
        "memories_today": memories_today,
        "decision_distribution": decision_distribution,
    }


@router.post(
    "/memory/analyze",
    response_model=AnalyzeResponse,
    summary="Analyze a memory candidate (dry run — no storage)",
    description="Runs the full AMGS pipeline and returns a governance decision without storing anything.",
)
async def analyze_memory(
    body: MemoryAnalyzeRequest,
    request: Request,
    db: DBSession,
    request_id: RequestID,
) -> AnalyzeResponse:
    start = time.perf_counter()

    ctx = await run_pipeline(
        raw_content=body.content,
        session_id=body.session_id,
        db_session=db,
        nlp_model=getattr(request.app.state, "nlp", None),
        embedding_model=getattr(request.app.state, "embedding_model", None),
        faiss_index=getattr(request.app.state, "faiss", None),
    )

    latency_ms = (time.perf_counter() - start) * 1000

    logger.info("memory.analyze", extra={
        "request_id": request_id,
        "decision": ctx.decision,
        "amgs": ctx.amgs_score,
    })
    return _ctx_to_analyze_response(ctx, request_id, latency_ms)


@router.post(
    "/memory/submit",
    response_model=SubmitResponse,
    status_code=201,
    summary="Analyze and conditionally store a memory",
    description="Runs the full AMGS pipeline. Stores the memory if the decision approves storage.",
)
async def submit_memory(
    body: MemoryAnalyzeRequest,
    request: Request,
    response: Response,
    db: DBSession,
    request_id: RequestID,
) -> SubmitResponse:
    start = time.perf_counter()
    faiss  = getattr(request.app.state, "faiss", None)

    ctx = await run_pipeline(
        raw_content=body.content,
        session_id=body.session_id,
        db_session=db,
        nlp_model=getattr(request.app.state, "nlp", None),
        embedding_model=getattr(request.app.state, "embedding_model", None),
        faiss_index=faiss,
    )

    latency_ms = (time.perf_counter() - start) * 1000
    analyze_result = _ctx_to_analyze_response(ctx, request_id, latency_ms)

    # ── Storage ────────────────────────────────────────────────────────────────
    memory_id: str | None = None
    stored = False
    storage_meta: StorageMetadata | None = None

    if ctx.decision in _STORAGE_DECISIONS:
        try:
            mem, stored = await _persist_memory(ctx, db, faiss, body.session_id)
            memory_id = mem.id
            storage_meta = StorageMetadata(
                encrypted=mem.is_encrypted,
                expires_at=mem.expires_at,
                version=mem.version,
            )
        except Exception as exc:
            logger.error("submit.persist_failed", extra={"error": str(exc)})
            await db.rollback()

    response.status_code = status.HTTP_201_CREATED if stored else status.HTTP_200_OK
    return SubmitResponse(
        memory_id=memory_id,
        decision=ctx.decision,                                   # type: ignore[arg-type]
        amgs_score=ctx.amgs_score,
        stored=stored,
        analyze_result=analyze_result,
        storage_metadata=storage_meta,
    )


@router.get(
    "/memory/search",
    response_model=SearchResponse,
    summary="Semantic similarity search over stored memories",
)
async def search_memories(
    request: Request,
    db: DBSession,
    q: str = Query(..., min_length=1, max_length=500, description="Search query text"),
    k: int = Query(5, ge=1, le=20, description="Number of results to return"),
    min_similarity: float = Query(0.30, ge=0.0, le=1.0),
) -> SearchResponse:
    start = time.perf_counter()

    faiss          = getattr(request.app.state, "faiss", None)
    embedding_model= getattr(request.app.state, "embedding_model", None)

    results: list[SearchResult] = []

    if embedding_model is not None and faiss is not None and getattr(faiss, "available", False):
        import numpy as np
        raw = embedding_model.encode(q, normalize_embeddings=True)
        embedding_arr = np.array(raw, dtype=np.float32)

        matches = faiss.search(
            query_embedding=embedding_arr,
            k=k,
            min_similarity=min_similarity,
        )

        if matches:
            memory_ids = [m[0] for m in matches]
            similarities = {m[0]: m[1] for m in matches}

            rows = await db.execute(
                select(Memory).where(
                    Memory.id.in_(memory_ids),
                    Memory.status == "ACTIVE",
                )
            )
            mems = rows.scalars().all()
            mem_map = {m.id: m for m in mems}

            for mid in memory_ids:
                if mid in mem_map:
                    mem = mem_map[mid]
                    # Decrypt content if encrypted
                    content = mem.content
                    if mem.is_encrypted and mem.nonce:
                        try:
                            from core.security import EncryptedPayload, decrypt as sec_decrypt
                            payload = EncryptedPayload(
                                ciphertext=mem.ciphertext,
                                nonce=mem.nonce,
                                tag=mem.tag,
                            )
                            content = sec_decrypt(payload)
                        except Exception:
                            content = "[ENCRYPTED — decryption failed]"

                    results.append(SearchResult(
                        memory_id=mem.id,
                        content=content,
                        similarity=round(similarities[mid], 4),
                        decision=mem.decision,                   # type: ignore[arg-type]
                        amgs_score=mem.amgs_score,
                        sensitivity=mem.sensitivity,             # type: ignore[arg-type]
                        memory_category=mem.memory_category,     # type: ignore[arg-type]
                    ))

    latency_ms = (time.perf_counter() - start) * 1000
    return SearchResponse(
        query=q,
        results=results,
        total_found=len(results),
        latency_ms=round(latency_ms, 2),
    )


@router.get(
    "/memory/",
    response_model=PaginatedMemoryList,
    summary="List stored memories (paginated, filterable)",
)
async def list_memories(
    db: DBSession,
    page:        int = Query(1, ge=1),
    page_size:   int = Query(20, ge=1, le=100),
    status:      str | None = Query(None, description="ACTIVE|EXPIRED|FORGOTTEN"),
    decision:    str | None = Query(None),
    sensitivity: str | None = Query(None),
    session_id:  str | None = Query(None),
) -> PaginatedMemoryList:
    stmt = select(Memory)

    if status:
        stmt = stmt.where(Memory.status == status)
    else:
        stmt = stmt.where(Memory.status != "FORGOTTEN")  # default: exclude forgotten

    if decision:
        d_map = {
            "STORE_ENCRYPTED": "STORE_ENCRYPT",
            "LONG_TERM": "STORE_LONG_TERM",
        }
        stmt = stmt.where(Memory.decision == d_map.get(decision, decision))
    if sensitivity:
        stmt = stmt.where(Memory.sensitivity == sensitivity)
    if session_id:
        stmt = stmt.where(Memory.session_id == session_id)

    # Count total
    count_result = await db.execute(
        select(func.count()).select_from(stmt.subquery())
    )
    total = count_result.scalar_one()

    # Paginate
    stmt = stmt.order_by(Memory.created_at.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    rows = await db.execute(stmt)
    mems = rows.scalars().all()

    items = []
    for mem in mems:
        items.append(MemoryListItem(
            id=mem.id,
            content=mem.content if not mem.is_encrypted else "[ENCRYPTED]",
            decision=mem.decision,                               # type: ignore[arg-type]
            amgs_score=mem.amgs_score,
            sensitivity=mem.sensitivity,                         # type: ignore[arg-type]
            status=mem.status,                                   # type: ignore[arg-type]
            memory_category=mem.memory_category,                 # type: ignore[arg-type]
            created_at=mem.created_at if isinstance(mem.created_at, str) else (mem.created_at.isoformat() if mem.created_at else ""),
            last_accessed=mem.last_accessed if isinstance(mem.last_accessed, str) else (mem.last_accessed.isoformat() if mem.last_accessed else ""),
            access_count=mem.access_count,
            expires_at=mem.expires_at,
            is_encrypted=mem.is_encrypted,
        ))

    return PaginatedMemoryList(total=total, page=page, page_size=page_size, items=items)


@router.get(
    "/memory/{memory_id}",
    response_model=MemoryOut,
    summary="Retrieve a single memory by ID",
    description="Increments access_count. Decrypts content for STORE_ENCRYPT memories.",
)
async def get_memory(memory_id: str, db: DBSession) -> MemoryOut:
    mem = await _get_memory_or_404(memory_id, db)

    # ── Decrypt if needed ─────────────────────────────────────────────────────
    content = mem.content
    if mem.is_encrypted and mem.nonce:
        try:
            from core.security import EncryptedPayload, decrypt as sec_decrypt
            payload = EncryptedPayload(
                ciphertext=mem.ciphertext,
                nonce=mem.nonce,
                tag=mem.tag,
            )
            content = sec_decrypt(payload)
        except Exception as exc:
            raise HTTPException(
                status_code=403,
                detail=f"Decryption failed: {exc}",
            )

    # ── Update access metadata ─────────────────────────────────────────────────
    mem.access_count += 1
    mem.last_accessed = datetime.now(timezone.utc)

    # ── Lifecycle event ────────────────────────────────────────────────────────
    event = LifecycleEvent.accessed(
        memory_id=mem.id,
        amgs_score=mem.amgs_score,
    )
    db.add(event)

    return _memory_to_out(mem, content_override=content)


@router.get(
    "/memory/{memory_id}/lifecycle",
    response_model=LifecycleHistoryResponse,
    summary="Full lifecycle history for a memory",
)
async def get_lifecycle(memory_id: str, db: DBSession) -> LifecycleHistoryResponse:
    mem = await _get_memory_or_404(memory_id, db)

    rows = await db.execute(
        select(LifecycleEvent)
        .where(LifecycleEvent.memory_id == memory_id)
        .order_by(LifecycleEvent.created_at.asc())
    )
    events = rows.scalars().all()

    # Compute decayed AMGS (simple: current value, decay applied separately by background task)
    decayed_amgs = mem.amgs_score

    return LifecycleHistoryResponse(
        memory_id=memory_id,
        current_status=mem.status,
        current_amgs=mem.amgs_score,
        decayed_amgs=decayed_amgs,
        events=[
            LifecycleEventOut(
                id=e.id,
                event_type=e.event_type,
                old_status=e.old_status,
                new_status=e.new_status,
                amgs_before=e.amgs_before,
                amgs_after=e.amgs_after,
                reason=e.reason,
                created_at=e.created_at if isinstance(e.created_at, str) else (e.created_at.isoformat() if e.created_at else ""),
            )
            for e in events
        ],
    )


@router.put(
    "/memory/{memory_id}",
    response_model=MemoryOut,
    summary="Update memory content (creates new version)",
    description=(
        "Runs AMGS pipeline on new content. If approved, creates a new memory version "
        "and archives the old one. Old version status → ARCHIVED."
    ),
)
async def update_memory(
    memory_id: str,
    body: MemoryUpdateRequest,
    request: Request,
    db: DBSession,
) -> MemoryOut:
    old_mem = await _get_memory_or_404(memory_id, db)

    # Run pipeline on new content
    faiss = getattr(request.app.state, "faiss", None)
    ctx = await run_pipeline(
        raw_content=body.content,
        session_id=None,
        db_session=db,
        nlp_model=getattr(request.app.state, "nlp", None),
        embedding_model=getattr(request.app.state, "embedding_model", None),
        faiss_index=faiss,
    )

    if ctx.decision in _REJECT_DECISIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Updated content rejected by AMGS pipeline: {ctx.decision} (score={ctx.amgs_score:.3f}). {ctx.rationale}",
        )

    # Archive old version
    old_mem.status = "ARCHIVED"
    event = LifecycleEvent.status_changed(
        memory_id=old_mem.id,
        old_status="ACTIVE",
        new_status="ARCHIVED",
        amgs_before=old_mem.amgs_score,
        amgs_after=old_mem.amgs_score,
        reason=f"Archived on version update — new version being created",
    )
    db.add(event)

    # Create new version
    new_mem, _ = await _persist_memory(ctx, db, faiss)
    new_mem.version = old_mem.version + 1
    new_mem.parent_id = old_mem.id

    return _memory_to_out(new_mem)


@router.delete(
    "/memory/{memory_id}",
    status_code=204,
    response_model=None,
    summary="Soft-delete (FORGET) a memory",
    description=(
        "Sets status=FORGOTTEN. Does NOT delete the DB row — "
        "required for research audit trail (NFR-06)."
    ),
)
async def delete_memory(memory_id: str, db: DBSession) -> None:
    result = await db.execute(select(Memory).where(Memory.id == memory_id))
    mem = result.scalar_one_or_none()

    if mem is None:
        raise HTTPException(status_code=404, detail=f"Memory '{memory_id}' not found")
    if mem.status == "FORGOTTEN":
        raise HTTPException(status_code=409, detail=f"Memory '{memory_id}' is already forgotten")

    old_status = mem.status
    mem.status = "FORGOTTEN"

    event = LifecycleEvent.forgotten(
        memory_id=mem.id,
        amgs=mem.amgs_score,
        reason="Soft-deleted via DELETE /memory/{id}",
    )
    db.add(event)
    # Returns 204 No Content
