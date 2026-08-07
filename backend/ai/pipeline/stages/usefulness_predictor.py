"""
AIMF — Pipeline Stage 8: Usefulness Predictor
==============================================
Estimates the long-term usefulness of the memory to predict if it will
be referenced again in the future. Computes the U (Usefulness) factor.

Usefulness Model (heuristic — replaces ML model until Phase 4):
  Base score factors:
    +0.30  token_count in 10–200 range (substantive but not bloated)
    +0.20  contains action verbs (actionable insight)
    +0.15  contains question patterns (knowledge gap)
    +0.15  contains code patterns (technical utility)
    +0.10  memory_category == TECHNICAL or PROFESSIONAL
    +0.10  sensitivity == LOW (non-sensitive = sharable = more useful)
    -0.20  token_count < 5 (too short to be useful)
    -0.10  token_count > 500 (too long, probably noise)
    -0.15  temporal_decay >= 0.80 (short-lived = low long-term usefulness)
    -0.20  privacy_risk >= 0.65 (high-privacy = restricted usefulness)

All values clipped to [0.05, 0.95] so nothing is ever completely useless
or guaranteed-useful without human review.

Output fields populated:
  - ctx.usefulness  — U factor [0, 1]
"""

from __future__ import annotations

import re

from ai.pipeline import PipelineContext
from core.logging import get_logger

logger = get_logger(__name__)

STAGE_NAME = "Stage 8 (Usefulness Predictor)"

# ─── Patterns ─────────────────────────────────────────────────────────────────

_ACTION_VERBS = re.compile(
    r"\b(implement|fix|build|create|update|configure|deploy|run|"
    r"execute|install|setup|resolve|debug|analyse|analyze|improve|optimize)\b",
    re.IGNORECASE,
)

_QUESTION_PATTERNS = re.compile(
    r"\b(how\s+to|what\s+is|why\s+does|when\s+should|where\s+to|"
    r"what\s+are|how\s+do\s+I|what\s+should)\b",
    re.IGNORECASE,
)

_CODE_PATTERNS = re.compile(
    r"(`{1,3}|def\s+\w+|class\s+\w+|import\s+\w+|"
    r"function\s+\w+|\w+\(.*\)\s*{|<\w+>|/\*.*\*/)",
    re.IGNORECASE,
)

_TECHNICAL_CATEGORIES = {"TECHNICAL", "PROFESSIONAL", "SCIENTIFIC"}


def _predict_usefulness(ctx: PipelineContext) -> float:
    """
    Compute usefulness score using the heuristic model.
    """
    text = ctx.normalised_content
    score = 0.40  # baseline

    # ── Positive signals ──────────────────────────────────────────────────────

    if 10 <= ctx.token_count <= 200:
        score += 0.30
    elif 5 <= ctx.token_count < 10:
        score += 0.10

    if _ACTION_VERBS.search(text):
        score += 0.20

    if _QUESTION_PATTERNS.search(text):
        score += 0.15

    if _CODE_PATTERNS.search(text):
        score += 0.15

    if ctx.memory_category in _TECHNICAL_CATEGORIES:
        score += 0.10

    if ctx.sensitivity == "LOW":
        score += 0.10

    # ── Negative signals ──────────────────────────────────────────────────────

    if ctx.token_count < 5:
        score -= 0.20

    if ctx.token_count > 500:
        score -= 0.10

    if ctx.temporal_decay >= 0.80:
        score -= 0.15

    if ctx.privacy_risk >= 0.65:
        score -= 0.20

    # ── Clip ──────────────────────────────────────────────────────────────────
    return round(max(0.05, min(0.95, score)), 4)


def run(ctx: PipelineContext) -> PipelineContext:
    """Execute Stage 8: Usefulness Predictor. Returns ctx modified in-place."""
    try:
        if not ctx.normalised_content:
            ctx.usefulness = 0.5
            return ctx

        ctx.usefulness = _predict_usefulness(ctx)

        logger.debug(STAGE_NAME, extra={
            "usefulness": ctx.usefulness,
            "token_count": ctx.token_count,
            "sensitivity": ctx.sensitivity,
        })

    except Exception as exc:
        ctx.record_error(STAGE_NAME, f"Usefulness prediction failed: {exc}")
        ctx.usefulness = 0.5

    return ctx
