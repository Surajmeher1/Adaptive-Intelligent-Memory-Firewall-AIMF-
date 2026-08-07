"""
AIMF — Decision Engine (Stage 10)
===================================
Maps the AMGS score + factor signals to one of 8 governance decisions.

Decision tree (from ARCHITECTURE.md §4.2):

  Priority overrides (checked first, in order):
  ─────────────────────────────────────────────
  1. REJECT_PRIVACY  : privacy_risk >= THRESHOLD_REJECT_PRIV (0.95)
     → Never store; content is critically sensitive.

  2. REJECT          : amgs_score < THRESHOLD_FORGET (0.15)
     → Score too low; memory has no governance value.

  Score-based decisions (checked after overrides):
  ─────────────────────────────────────────────────
  3. STORE_LONG_TERM  : amgs_score >= THRESHOLD_LONG_TERM (0.75)
     → High-value permanent memory.

  4. STORE_ENCRYPT    : amgs_score >= THRESHOLD_STORE AND privacy_risk >= THRESHOLD_ENCRYPT (0.85)
     → Store, but encrypt (medium-high value + significant privacy risk).

  5. STORE_TEMPORARY  : THRESHOLD_STORE <= amgs_score < THRESHOLD_LONG_TERM AND is_temporal
     → Memory is time-bound; set expiry.

  6. SUMMARIZE        : THRESHOLD_SUMMARIZE <= amgs_score < THRESHOLD_STORE
     → Borderline value; retain a summary instead of full content.

  7. STORE            : THRESHOLD_STORE <= amgs_score < THRESHOLD_LONG_TERM
     → Standard store.

  8. REJECT           : catch-all
     → Below all store thresholds.

Decision boundary names (for explainability):
  "above long-term threshold", "above store threshold", etc.

Output fields populated:
  - ctx.decision          — GovernanceDecision enum value (string)
  - ctx.decision_boundary — name of the threshold crossed
"""

from __future__ import annotations

from ai.pipeline import PipelineContext
from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)

STAGE_NAME = "Stage 10 (Decision Engine)"


def decide(ctx: PipelineContext) -> PipelineContext:
    """
    Apply the 8-way decision tree to ctx. Populates ctx.decision and
    ctx.decision_boundary. Modifies ctx in-place.
    """
    try:
        score = ctx.amgs_score
        t = settings  # shorthand

        # ── Priority Override 1: Critically sensitive content ─────────────────
        if ctx.privacy_risk >= t.threshold_reject_priv:
            ctx.decision = "REJECT_PRIVACY"
            ctx.decision_boundary = (
                f"privacy_risk {ctx.privacy_risk:.2f} >= "
                f"REJECT_PRIVACY threshold {t.threshold_reject_priv}"
            )
            _log(ctx)
            return ctx

        # ── Priority Override 2: Score too low (pure rejection) ───────────────
        if score < t.threshold_forget:
            ctx.decision = "REJECT"
            ctx.decision_boundary = (
                f"amgs {score:.3f} < forget threshold {t.threshold_forget}"
            )
            _log(ctx)
            return ctx

        # ── Long-term permanent memory ─────────────────────────────────────────
        if score >= t.threshold_long_term:
            ctx.decision = "STORE_LONG_TERM"
            ctx.decision_boundary = (
                f"amgs {score:.3f} >= long-term threshold {t.threshold_long_term}"
            )
            _log(ctx)
            return ctx

        # ── Mid-range decisions ────────────────────────────────────────────────
        if score >= t.threshold_store:
            # Encrypt if privacy risk is significant
            if ctx.privacy_risk >= t.threshold_encrypt:
                ctx.decision = "STORE_ENCRYPT"
                ctx.decision_boundary = (
                    f"amgs {score:.3f} >= store threshold AND "
                    f"privacy_risk {ctx.privacy_risk:.2f} >= "
                    f"encrypt threshold {t.threshold_encrypt}"
                )
            # Temporary if temporal signal detected
            elif ctx.is_temporal:
                ctx.decision = "STORE_TEMPORARY"
                ctx.decision_boundary = (
                    f"amgs {score:.3f} >= store threshold AND temporal signal detected "
                    f"(expires_at={ctx.expires_at})"
                )
            # Standard store
            else:
                ctx.decision = "STORE"
                ctx.decision_boundary = (
                    f"amgs {score:.3f} in [{t.threshold_store}, {t.threshold_long_term})"
                )
            _log(ctx)
            return ctx

        # ── Borderline: summarize instead of full storage ─────────────────────
        if score >= t.threshold_summarize:
            ctx.decision = "SUMMARIZE"
            ctx.decision_boundary = (
                f"amgs {score:.3f} in [{t.threshold_summarize}, {t.threshold_store})"
            )
            _log(ctx)
            return ctx

        # ── Below summarize threshold but above forget — reject ────────────────
        # (covers gap between threshold_forget and threshold_summarize)
        ctx.decision = "REJECT"
        ctx.decision_boundary = (
            f"amgs {score:.3f} < summarize threshold {t.threshold_summarize}"
        )
        _log(ctx)

    except Exception as exc:
        ctx.record_error(STAGE_NAME, f"Decision failed: {exc}")
        ctx.decision = "REJECT"  # fail-safe: never store on error
        ctx.decision_boundary = "Error in decision engine — defaulting to REJECT"

    return ctx


def _log(ctx: PipelineContext) -> None:
    """Structured log for the decision."""
    logger.info(STAGE_NAME, extra={
        "decision":  ctx.decision,
        "amgs":      ctx.amgs_score,
        "boundary":  ctx.decision_boundary,
        "confidence":ctx.confidence,
    })
