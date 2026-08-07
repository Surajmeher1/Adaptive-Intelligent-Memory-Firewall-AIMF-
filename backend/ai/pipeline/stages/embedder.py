"""
AIMF — Pipeline Stage 5: Embedding Generator
=============================================
Generates a 384-dim sentence embedding using the all-MiniLM-L6-v2 model
(sentence-transformers). The embedding is L2-normalised so cosine similarity
= dot product in the FAISS IndexFlatIP index.

If the embedding model is not loaded (app.state.embedding_model is None),
this stage is a no-op. Stages 6 and 7 that depend on embeddings will also
fall back gracefully.

Output fields populated:
  - ctx.embedding  — list[float] of length 384, or None
"""

from __future__ import annotations

import numpy as np

from ai.pipeline import PipelineContext
from core.logging import get_logger

logger = get_logger(__name__)

STAGE_NAME = "Stage 5 (Embedding)"

_EMBEDDING_DIM = 384


def _l2_normalise(vec: "np.ndarray") -> "np.ndarray":
    """Normalise a vector to unit length (L2 norm)."""
    norm = np.linalg.norm(vec)
    if norm < 1e-10:
        return vec
    return vec / norm


def run(ctx: PipelineContext, embedding_model=None) -> PipelineContext:
    """
    Execute Stage 5: Embedding Generator.

    Args:
        ctx:             Pipeline context object (modified in place).
        embedding_model: SentenceTransformer instance. None → no-op.
    """
    try:
        if embedding_model is None:
            ctx.record_error(STAGE_NAME, "Embedding model not loaded — embeddings skipped")
            return ctx

        text = ctx.normalised_content
        if not text:
            return ctx

        # encode() returns shape (384,) for a single sentence
        raw = embedding_model.encode(text, normalize_embeddings=False)
        normed = _l2_normalise(raw)
        ctx.embedding = normed.tolist()

        logger.debug(STAGE_NAME, extra={
            "embedding_dim": len(ctx.embedding),
            "norm": float(np.linalg.norm(normed)),
        })

    except Exception as exc:
        ctx.record_error(STAGE_NAME, f"Embedding failed: {exc}")
        ctx.embedding = None

    return ctx
