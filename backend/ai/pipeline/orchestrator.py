"""
AIMF — Pipeline Orchestrator
=============================
Wires all 11 pipeline stages into a single async `run()` function.
This is the entry point called by the `/api/v1/memory/analyze` endpoint.

Execution order:
  Stage 1:  preprocessor       (sync)
  Stage 2:  ner_analyzer       (sync)  — requires nlp_model
  Stage 3:  privacy_analyzer   (sync)
  Stage 4:  temporal_detector  (sync)
  Stage 5:  embedder           (sync)  — requires embedding_model
  Stage 6:  novelty_estimator  (sync)  — requires faiss_index
  Stage 7:  redundancy_detector(sync)  — requires faiss_index
  Stage 8:  usefulness_predictor(sync)
  Stage 9:  context_analyzer   (async) — requires db session
  AMGS:     amgs_engine        (sync)
  Stage 10: decision_engine    (sync)
  Stage 11: explainer          (sync)
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from ai import amgs_engine, decision_engine, explainer
from ai.pipeline import PipelineContext
from ai.pipeline.stages import (
    context_analyzer,
    embedder,
    ner_analyzer,
    novelty_estimator,
    preprocessor,
    privacy_analyzer,
    redundancy_detector,
    temporal_detector,
    usefulness_predictor,
)
from core.faiss_index import FAISSIndex
from core.logging import get_logger

logger = get_logger(__name__)


async def run_pipeline(
    raw_content: str,
    session_id: str | None = None,
    db_session: AsyncSession | None = None,
    nlp_model=None,
    embedding_model=None,
    faiss_index: FAISSIndex | None = None,
) -> PipelineContext:
    """
    Execute the full AMGS pipeline for a single memory candidate.

    Args:
        raw_content:     The raw text to evaluate.
        session_id:      Optional session identifier for context analysis.
        db_session:      SQLAlchemy async session (for Stage 9 DB queries).
        nlp_model:       spaCy Language model (Stage 2). None → NER skipped.
        embedding_model: SentenceTransformer (Stage 5). None → embeddings skipped.
        faiss_index:     FAISSIndex (Stages 6, 7, 9). None → similarity skipped.

    Returns:
        Completed PipelineContext with decision, amgs_score, and rationale set.
    """
    ctx = PipelineContext(raw_content=raw_content, session_id=session_id)

    logger.info("Pipeline start", extra={"request_id": ctx.request_id, "session_id": session_id})

    # ── Stage 1: Preprocessor ─────────────────────────────────────────────────
    ctx = preprocessor.run(ctx)

    # ── Stage 2: NER Analyzer ─────────────────────────────────────────────────
    ctx = ner_analyzer.run(ctx, nlp_model=nlp_model)

    # ── Stage 3: Privacy Analyzer ─────────────────────────────────────────────
    ctx = privacy_analyzer.run(ctx)

    # ── Stage 4: Temporal Detector ────────────────────────────────────────────
    ctx = temporal_detector.run(ctx)

    # ── Stage 5: Embedding Generator ─────────────────────────────────────────
    ctx = embedder.run(ctx, embedding_model=embedding_model)

    # ── Stage 6: Novelty Estimator ────────────────────────────────────────────
    ctx = novelty_estimator.run(ctx, faiss_index=faiss_index)

    # ── Stage 7: Redundancy Detector ─────────────────────────────────────────
    ctx = redundancy_detector.run(ctx, faiss_index=faiss_index)

    # ── Stage 8: Usefulness Predictor ────────────────────────────────────────
    ctx = usefulness_predictor.run(ctx)

    # ── Stage 9: Context Analyzer (async) ────────────────────────────────────
    ctx = await context_analyzer.run(ctx, session=db_session, faiss_index=faiss_index)

    # ── AMGS Score Computation ────────────────────────────────────────────────
    ctx = amgs_engine.compute(ctx)

    # ── Stage 10: Decision Engine ─────────────────────────────────────────────
    ctx = decision_engine.decide(ctx)

    # ── Stage 11: Explainer ───────────────────────────────────────────────────
    ctx = explainer.explain(ctx)

    logger.info("Pipeline complete", extra={
        "request_id":   ctx.request_id,
        "decision":     ctx.decision,
        "amgs":         ctx.amgs_score,
        "confidence":   ctx.confidence,
        "latency_ms":   round(ctx.latency_ms(), 2),
        "stage_errors": len(ctx.stage_errors),
    })

    return ctx
