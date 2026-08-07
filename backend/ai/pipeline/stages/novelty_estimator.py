"""
AIMF — Pipeline Stage 6: Novelty Estimator
===========================================
Estimates how novel the incoming memory is relative to the existing
knowledge base. Computes the N (Novelty) factor.

N factor:
  - 1.0 = completely novel (never seen anything like this)
  - 0.0 = perfectly redundant (duplicate)
  - 0.5 = default when FAISS unavailable

Algorithm:
  1. Query FAISS for the top-k most similar memories
  2. Novelty = 1.0 - max_cosine_similarity
     (if max_cosine_similarity = 0.95 → novelty = 0.05, almost redundant)
  3. If no similar memories found → novelty = 1.0
  4. If embedding is None → novelty = 0.5 (neutral fallback)

Note: This stage only computes N. Redundancy (R) with hard deduplication
is handled separately in Stage 7.

Output fields populated:
  - ctx.novelty  — N factor [0, 1]
"""

from __future__ import annotations

from ai.pipeline import PipelineContext
from core.faiss_index import FAISSIndex
from core.logging import get_logger

logger = get_logger(__name__)

STAGE_NAME = "Stage 6 (Novelty Estimator)"

_TOP_K_SIMILAR = 5


def run(ctx: PipelineContext, faiss_index: FAISSIndex | None = None) -> PipelineContext:
    """
    Execute Stage 6: Novelty Estimator.

    Args:
        ctx:         Pipeline context object (modified in place).
        faiss_index: FAISSIndex instance. None → neutral fallback (0.5).
    """
    try:
        if ctx.embedding is None:
            # No embedding → neutral novelty (can't compute)
            ctx.novelty = 0.5
            return ctx

        if faiss_index is None or not getattr(faiss_index, "available", False):
            ctx.novelty = 0.5
            ctx.record_error(STAGE_NAME, "FAISS not available — using default novelty 0.5")
            return ctx

        import numpy as np
        embedding_array = np.array(ctx.embedding, dtype=np.float32)

        results = faiss_index.search(
            query_embedding=embedding_array,
            k=_TOP_K_SIMILAR,
            min_similarity=0.0,
        )

        if not results:
            # No similar memories at all → fully novel
            ctx.novelty = 1.0
        else:
            max_similarity = results[0][1]          # sorted descending by similarity
            ctx.novelty = round(1.0 - max_similarity, 4)

        logger.debug(STAGE_NAME, extra={
            "novelty": ctx.novelty,
            "top_match_similarity": results[0][1] if results else None,
        })

    except Exception as exc:
        ctx.record_error(STAGE_NAME, f"Novelty estimation failed: {exc}")
        ctx.novelty = 0.5

    return ctx
