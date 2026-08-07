"""
AIMF — Pipeline Stage 7: Redundancy Detector
=============================================
Detects if this memory is a near-duplicate of an existing one.
Computes the R (Redundancy) factor — penalty in [0, 1].

Difference from Stage 6 (Novelty):
  - Novelty (N): measures information gain on a continuous scale
  - Redundancy (R): binary-flavoured — is this essentially the same memory?

Algorithm:
  1. Use Stage 6 top-match (re-query if not cached).
  2. Exact duplicate (hash match) → R = 1.0
  3. Near-duplicate (similarity >= REDUNDANCY_THRESHOLD) → R = similarity
  4. Distinct memory → R = 0.0

Thresholds (from DECISIONS.md ADR-005):
  REDUNDANCY_THRESHOLD = 0.85  — cosine similarity above which = redundant
  EXACT_DUPLICATE_THRESHOLD = 1.0

Output fields populated:
  - ctx.redundancy         — R factor [0, 1]
  - ctx.similar_memory_id  — UUID of most similar memory (or None)
  - ctx.max_similarity     — highest cosine similarity found
"""

from __future__ import annotations

from ai.pipeline import PipelineContext
from core.faiss_index import FAISSIndex
from core.logging import get_logger

logger = get_logger(__name__)

STAGE_NAME = "Stage 7 (Redundancy Detector)"

# From DECISIONS.md ADR-005
REDUNDANCY_THRESHOLD = 0.85


def run(ctx: PipelineContext, faiss_index: FAISSIndex | None = None) -> PipelineContext:
    """
    Execute Stage 7: Redundancy Detector.

    Args:
        ctx:         Pipeline context object (modified in place).
        faiss_index: FAISSIndex instance. None → R = 0.0.
    """
    try:
        if ctx.embedding is None:
            ctx.redundancy = 0.0
            return ctx

        if faiss_index is None or not getattr(faiss_index, "available", False):
            ctx.redundancy = 0.0
            return ctx

        import numpy as np
        embedding_array = np.array(ctx.embedding, dtype=np.float32)

        results = faiss_index.search(
            query_embedding=embedding_array,
            k=1,
            min_similarity=0.0,
        )

        if not results:
            ctx.redundancy = 0.0
            ctx.similar_memory_id = None
            ctx.max_similarity = 0.0
            return ctx

        top_id, top_similarity = results[0]
        ctx.similar_memory_id = top_id
        ctx.max_similarity = round(top_similarity, 4)

        if top_similarity >= REDUNDANCY_THRESHOLD:
            # Scale within [threshold, 1.0] → [0.0, 1.0]
            ctx.redundancy = round(
                (top_similarity - REDUNDANCY_THRESHOLD) / (1.0 - REDUNDANCY_THRESHOLD),
                4,
            )
        else:
            ctx.redundancy = 0.0

        logger.debug(STAGE_NAME, extra={
            "redundancy": ctx.redundancy,
            "max_similarity": ctx.max_similarity,
            "similar_id": ctx.similar_memory_id,
        })

    except Exception as exc:
        ctx.record_error(STAGE_NAME, f"Redundancy detection failed: {exc}")
        ctx.redundancy = 0.0

    return ctx
