"""
AIMF — Explainer (Stage 11)
============================
Generates a natural-language rationale for the AMGS decision.
This is the "why" that gets returned to the API caller and stored in the DB.

The explainer is purely rule-based (no LLM required) for:
  1. Determinism — same inputs always produce same explanation
  2. Research auditability — decisions traceable to specific factors
  3. Speed — no additional model inference

Output format (stored in GovernanceExplanation):
  - rationale:          Plain English sentence explaining the decision
  - decision_boundary:  Which threshold was crossed (from decision_engine)
  - dominant_factor:    The most influential factor (from amgs_engine)
  - privacy_patterns:   List of PII patterns found (names only, not values)
  - similar_memory_id:  UUID of the near-duplicate if found

Output fields populated:
  - ctx.rationale       — plain-English explanation string
  (ctx.decision_boundary and ctx.dominant_factor already set by earlier stages)
"""

from __future__ import annotations

from ai.pipeline import PipelineContext
from core.logging import get_logger

logger = get_logger(__name__)

STAGE_NAME = "Stage 11 (Explainer)"


# ─── Decision-specific templates ──────────────────────────────────────────────

_TEMPLATES: dict[str, str] = {
    "REJECT_PRIVACY": (
        "Memory REJECTED due to critically high privacy risk "
        "(score: {privacy_risk:.2f}). "
        "Detected PII patterns: {patterns}. "
        "This content exceeds the privacy threshold ({threshold}) "
        "and must not be stored to protect data subject rights."
    ),
    "REJECT": (
        "Memory REJECTED — insufficient governance value "
        "(AMGS: {amgs:.3f}, threshold: {threshold_forget}). "
        "Dominant factor: {dominant}. "
        "This memory is unlikely to provide long-term utility."
    ),
    "STORE_LONG_TERM": (
        "Memory approved for LONG-TERM STORAGE "
        "(AMGS: {amgs:.3f}, threshold: {threshold_long_term}). "
        "Dominant factor: {dominant}. "
        "High governance score indicates lasting value and low risk."
    ),
    "STORE_ENCRYPT": (
        "Memory approved for ENCRYPTED STORAGE "
        "(AMGS: {amgs:.3f}). "
        "Privacy risk ({privacy_risk:.2f}) requires encryption before persistence. "
        "Patterns detected: {patterns}."
    ),
    "STORE_TEMPORARY": (
        "Memory approved for TEMPORARY STORAGE with expiry at {expires_at}. "
        "(AMGS: {amgs:.3f}). "
        "Temporal signal detected — this memory's value is time-bounded. "
        "Dominant factor: {dominant}."
    ),
    "SUMMARIZE": (
        "Memory queued for SUMMARIZATION "
        "(AMGS: {amgs:.3f}, borderline zone). "
        "Score is above forget threshold but below store threshold. "
        "A condensed version will be stored instead of full content."
    ),
    "STORE": (
        "Memory approved for STANDARD STORAGE "
        "(AMGS: {amgs:.3f}). "
        "Dominant factor: {dominant}. "
        "Governance score meets the store threshold."
    ),
}


def _format_patterns(patterns: list[str]) -> str:
    """Format pattern list as readable string."""
    if not patterns:
        return "none"
    return ", ".join(patterns)


def explain(ctx: PipelineContext) -> PipelineContext:
    """
    Generate natural-language rationale for the decision.
    Populates ctx.rationale. Modifies ctx in-place.
    """
    try:
        from core.config import settings
        t = settings

        if ctx.injection_detected and ctx.decision == "REJECT":
            patterns_str = _format_patterns(ctx.injection_patterns)
            rationale = (
                f"Memory REJECTED — detected prompt manipulation or adversarial governance bypass attempt ({patterns_str}). "
                "User prompts and generative AI instructions cannot modify AIMF governance policies, alter AMGS scores, or force memory persistence."
            )
        else:
            template = _TEMPLATES.get(ctx.decision, "Decision: {decision}. AMGS: {amgs:.3f}.")

            rationale = template.format(
                decision=ctx.decision,
                amgs=ctx.amgs_score,
                privacy_risk=ctx.privacy_risk,
                patterns=_format_patterns(ctx.privacy_patterns),
                threshold=t.threshold_reject_priv,
                threshold_forget=t.threshold_forget,
                threshold_store=t.threshold_store,
                threshold_long_term=t.threshold_long_term,
                dominant=ctx.dominant_factor,
                expires_at=ctx.expires_at or "not set",
            )

        ctx.rationale = rationale

        logger.debug(STAGE_NAME, extra={"rationale_length": len(rationale)})

    except Exception as exc:
        ctx.record_error(STAGE_NAME, f"Explanation generation failed: {exc}")
        ctx.rationale = (
            f"Decision: {ctx.decision}. AMGS score: {ctx.amgs_score:.3f}. "
            f"(Detailed explanation unavailable due to error: {exc})"
        )

    return ctx
