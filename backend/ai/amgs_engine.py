"""
AIMF — AMGS Engine
===================
Computes the final Adaptive Memory Governance Score (AMGS) from the
7 factor scores in the PipelineContext.

AMGS Formula (from DECISIONS.md ADR-005):
  AMGS = (U × w_U) + (C × w_C) + (F × w_F) + (N × w_N)
        - (R × w_R) - (P × w_P) - (D × w_D)
  Clipped to [0.0, 1.0]

Where:
  U = Usefulness         (positive factor)
  C = Context Relevance  (positive factor)
  F = Frequency          (positive factor)
  N = Novelty            (positive factor — reward for new info)
  R = Redundancy         (negative factor — penalty)
  P = Privacy Risk       (negative factor — penalty)
  D = Temporal Decay     (negative factor — penalty)

Default weights v1 (loaded from settings):
  w_U = 0.25  w_C = 0.15  w_F = 0.15  w_N = 0.20
  w_R = 0.10  w_P = 0.10  w_D = 0.05

Dominant factor: The factor contributing most to the final decision
(used for explainability in Stage 11).

Output fields populated:
  - ctx.amgs_score      — final score in [0, 1]
  - ctx.confidence      — confidence in [0.5, 1.0]
  - ctx.dominant_factor — name of the most influential factor
"""

from __future__ import annotations

from ai.pipeline import PipelineContext
from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)

STAGE_NAME = "AMGS Engine"


def _get_weights() -> dict[str, float]:
    """Load AMGS factor weights from settings (overridable via .env)."""
    return {
        "U": settings.weight_u,
        "C": settings.weight_c,
        "F": settings.weight_f,
        "N": settings.weight_n,
        "R": settings.weight_r,
        "P": settings.weight_p,
        "D": settings.weight_d,
    }


def _compute_amgs(ctx: PipelineContext) -> tuple[float, str]:
    """
    Compute AMGS score and identify the dominant factor.

    Returns:
        (amgs_score, dominant_factor_name)
    """
    w = _get_weights()

    # Weighted contributions (positive = adds to score, negative = penalises)
    contributions = {
        "Usefulness":        ctx.usefulness        * w["U"],
        "ContextRelevance":  ctx.context_relevance * w["C"],
        "Frequency":         ctx.frequency         * w["F"],
        "Novelty":           ctx.novelty           * w["N"],
        "Redundancy":       -(ctx.redundancy       * w["R"]),
        "PrivacyRisk":      -(ctx.privacy_risk     * w["P"]),
        "TemporalDecay":    -(ctx.temporal_decay   * w["D"]),
    }

    raw_score = sum(contributions.values())
    amgs_score = round(max(0.0, min(1.0, raw_score)), 4)

    # Dominant factor = the factor with the largest absolute weighted contribution
    dominant_factor = max(contributions, key=lambda k: abs(contributions[k]))

    return amgs_score, dominant_factor


def _compute_confidence(ctx: PipelineContext, amgs_score: float) -> float:
    """
    Confidence reflects how certain we are about the decision.

    Higher confidence when:
      - Score is far from decision boundaries (far from 0.30, 0.50, 0.75)
      - No stage errors occurred
      - All optional models were available

    Lower confidence when:
      - Score is near a threshold boundary
      - Stage errors present
    """
    boundaries = [
        settings.threshold_forget,
        settings.threshold_store,
        settings.threshold_long_term,
    ]
    min_dist = min(abs(amgs_score - b) for b in boundaries)
    # Normalize min_dist: max possible = 0.5 (middle between two boundaries)
    dist_confidence = min(1.0, min_dist / 0.125)
    base_confidence = 0.5 + dist_confidence * 0.5

    # Penalise for stage errors
    error_penalty = min(len(ctx.stage_errors) * 0.05, 0.30)
    confidence = max(0.40, base_confidence - error_penalty)

    return round(confidence, 4)


def compute(ctx: PipelineContext) -> PipelineContext:
    """
    Compute AMGS score. Modifies ctx in-place.

    This is called by the pipeline orchestrator between Stage 9 and Stage 10.
    """
    try:
        amgs_score, dominant_factor = _compute_amgs(ctx)
        confidence = _compute_confidence(ctx, amgs_score)

        ctx.amgs_score = amgs_score
        ctx.confidence = confidence
        ctx.dominant_factor = dominant_factor

        logger.debug(STAGE_NAME, extra={
            "amgs_score": amgs_score,
            "confidence": confidence,
            "dominant_factor": dominant_factor,
            "factors": {
                "U": round(ctx.usefulness, 3),
                "C": round(ctx.context_relevance, 3),
                "F": round(ctx.frequency, 3),
                "N": round(ctx.novelty, 3),
                "R": round(ctx.redundancy, 3),
                "P": round(ctx.privacy_risk, 3),
                "D": round(ctx.temporal_decay, 3),
            },
        })

    except Exception as exc:
        logger.error(STAGE_NAME, extra={"error": str(exc)})
        ctx.amgs_score = 0.5  # neutral fallback
        ctx.confidence = 0.40
        ctx.dominant_factor = "Unknown"
        ctx.record_error(STAGE_NAME, f"AMGS computation failed: {exc}")

    return ctx
