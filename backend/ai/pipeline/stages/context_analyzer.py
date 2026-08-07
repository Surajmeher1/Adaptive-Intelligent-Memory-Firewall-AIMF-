"""
AIMF — Pipeline Stage 9: Context Analyzer
==========================================
Computes the C (Context Relevance) and F (Frequency) factors by analyzing
the current session context and historical memory access patterns.

C factor — Context Relevance [0, 1]:
  How relevant is this memory to the current conversation context?
  Computed by:
    1. Semantic similarity between this embedding and recent context embeddings
    2. Topic overlap with session keywords
    3. Recency weighting (more recent context = higher weight)

F factor — Frequency [0, 1]:
  How often has this type of information been stored/accessed?
  Computed by:
    1. Exact hash match → F = 1.0 (same content seen before)
    2. Near-semantic match count in session → normalized frequency

If no session context is provided, both default to neutral (0.5 for C, 0.0 for F).

Output fields populated:
  - ctx.context_relevance    — C factor [0, 1]
  - ctx.frequency            — F factor [0, 1]
  - ctx.session_context_ids  — list of recent context memory UUIDs used
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from ai.pipeline import PipelineContext
from core.logging import get_logger

logger = get_logger(__name__)

STAGE_NAME = "Stage 9 (Context Analyzer)"

_CONTEXT_SIMILARITY_THRESHOLD = 0.50
_MAX_CONTEXT_MEMORIES = 10


async def run(
    ctx: PipelineContext,
    session: AsyncSession | None = None,
    faiss_index=None,
) -> PipelineContext:
    """
    Execute Stage 9: Context Analyzer.

    This is the only async stage because it queries the database.

    Args:
        ctx:         Pipeline context object.
        session:     SQLAlchemy async session. None → neutral fallback.
        faiss_index: FAISSIndex for similarity search. None → no semantic C.
    """
    try:
        # ── Default neutral values ─────────────────────────────────────────────
        ctx.context_relevance = 0.50
        ctx.frequency = 0.0

        if session is None:
            return ctx

        # ── F factor: check if exact content hash exists in DB ─────────────────
        from sqlalchemy import select, func
        from models.memory import Memory

        # Count memories with the same content hash (exact duplicate)
        exact_count_result = await session.execute(
            select(func.count()).select_from(Memory).where(
                Memory.content_hash == ctx.content_hash,
                Memory.status == "ACTIVE",
            )
        )
        exact_count = exact_count_result.scalar_one_or_none() or 0
        if exact_count > 0:
            ctx.frequency = 1.0  # Exact duplicate exists

        # ── C factor: session context similarity ───────────────────────────────
        if ctx.embedding is not None and ctx.session_id and faiss_index is not None:
            import numpy as np
            embedding_arr = np.array(ctx.embedding, dtype=np.float32)

            # Get top-k most similar memories from session context
            results = faiss_index.search(
                query_embedding=embedding_arr,
                k=_MAX_CONTEXT_MEMORIES,
                min_similarity=_CONTEXT_SIMILARITY_THRESHOLD,
            )

            if results:
                # C = average similarity with contextually relevant memories
                similarities = [sim for _, sim in results]
                ctx.context_relevance = round(
                    sum(similarities) / len(similarities), 4
                )
                ctx.session_context_ids = [mem_id for mem_id, _ in results]
            # else: keep default 0.5

        logger.debug(STAGE_NAME, extra={
            "context_relevance": ctx.context_relevance,
            "frequency": ctx.frequency,
            "exact_count": exact_count,
        })

    except Exception as exc:
        ctx.record_error(STAGE_NAME, f"Context analysis failed: {exc}")
        # Keep neutral defaults

    return ctx
