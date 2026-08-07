"""
AIMF — Pipeline Stage 4: Temporal Detector
===========================================
Detects time-bounded signals in memory content and computes the D
(Temporal Decay) factor.

Design:
  A memory has temporal decay when its value clearly diminishes over time.
  Examples:
    - "The meeting is tomorrow at 3pm"     → strong temporal signal
    - "Today's news: market closed up 2%"  → strong temporal signal
    - "Python best practices in 2024"      → mild temporal signal
    - "How to implement binary search"     → no temporal decay

The D factor:
  - 0.0 = permanent value (no decay)
  - 1.0 = purely temporary (expires very soon)

Signal detection:
  1. spaCy NER DATE/TIME entities (if available)
  2. Regex patterns for temporal keywords
  3. Relative time references ("today", "tomorrow", "next week")

expires_at computation:
  - Relative: "tomorrow" → now + 1 day
  - Short-term: "next week" → now + 7 days
  - Meeting/appointment keywords → now + 2 days (conservative)
  - Long-term date mentions (year only) → now + 30 days
  - No clear signal → None

Output fields populated:
  - ctx.temporal_decay      — D factor [0, 1]
  - ctx.is_temporal         — bool
  - ctx.expires_at          — ISO-8601 string or None
  - ctx.usefulness_lifetime — "SHORT" | "MEDIUM" | "LONG" | "PERMANENT"
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from ai.pipeline import PipelineContext
from core.logging import get_logger

logger = get_logger(__name__)

STAGE_NAME = "Stage 4 (Temporal Detector)"

_now = lambda: datetime.now(timezone.utc)


# High decay signals → D ≈ 0.80–1.0, expires_at in hours/days
_STRONG_TEMPORAL_PATTERNS: list[tuple[re.Pattern, float, timedelta]] = [
    # today / tonight
    (re.compile(r"\b(today|tonight|this\s+morning|this\s+evening)\b", re.IGNORECASE),
     0.90, timedelta(hours=16)),
    # tomorrow
    (re.compile(r"\btomorrow\b", re.IGNORECASE),
     0.85, timedelta(days=1)),
    # in N hours
    (re.compile(r"\bin\s+(?:a\s+few\s+|[1-9]\d?\s+)?hours?\b", re.IGNORECASE),
     0.95, timedelta(hours=6)),
    # at HH:MM (specific time reference)
    (re.compile(r"\bat\s+\d{1,2}:\d{2}\s*(?:am|pm)?\b", re.IGNORECASE),
     0.80, timedelta(days=1)),
    # meeting / appointment / call
    (re.compile(r"\b(meeting|standup|stand-?up|appointment|interview|call)\b", re.IGNORECASE),
     0.75, timedelta(days=2)),
    # deadline / due / submit by
    (re.compile(r"\b(deadline|due\s+by|submit\s+by|due\s+on)\b", re.IGNORECASE),
     0.80, timedelta(days=3)),
]

# Medium decay signals → D ≈ 0.40–0.75, expires_at in weeks
_MEDIUM_TEMPORAL_PATTERNS: list[tuple[re.Pattern, float, timedelta]] = [
    # next week / this week
    (re.compile(r"\b(next\s+week|this\s+week|next\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))\b", re.IGNORECASE),
     0.65, timedelta(days=7)),
    # next month
    (re.compile(r"\bnext\s+month\b", re.IGNORECASE),
     0.50, timedelta(days=30)),
    # this quarter
    (re.compile(r"\bthis\s+quarter\b", re.IGNORECASE),
     0.45, timedelta(days=90)),
    # recent news / current event
    (re.compile(r"\b(latest|breaking|current\s+event|news|trending)\b", re.IGNORECASE),
     0.60, timedelta(days=3)),
    # version number (software) — may become stale
    (re.compile(r"\bv\d+\.\d+(?:\.\d+)?\b"),
     0.40, timedelta(days=180)),
]

# Mild decay signals → D ≈ 0.15–0.40, expires_at in months
_MILD_TEMPORAL_PATTERNS: list[tuple[re.Pattern, float, timedelta]] = [
    # year mention like "in 2024" or "2025 roadmap"
    (re.compile(r"\b20[2-9]\d\b"),
     0.25, timedelta(days=365)),
    # recently / lately
    (re.compile(r"\b(recently|lately|just\s+released|just\s+launched)\b", re.IGNORECASE),
     0.30, timedelta(days=14)),
]


def _detect_temporal_signals(
    text: str, entity_labels: set[str]
) -> tuple[float, timedelta | None]:
    """
    Scan text for temporal signals. Returns (decay_score, expires_in).

    decay_score is the max matched weight (patterns are not additive).
    expires_in is the timedelta to expiry from now.
    """
    best_decay = 0.0
    best_expiry: timedelta | None = None

    # ── NER DATE/TIME boost ──────────────────────────────────────────────────
    if "DATE" in entity_labels or "TIME" in entity_labels:
        best_decay = max(best_decay, 0.40)
        if best_expiry is None:
            best_expiry = timedelta(days=7)

    # ── Pattern scan ─────────────────────────────────────────────────────────
    for patterns in [_STRONG_TEMPORAL_PATTERNS, _MEDIUM_TEMPORAL_PATTERNS, _MILD_TEMPORAL_PATTERNS]:
        for pattern, weight, expiry in patterns:
            if pattern.search(text):
                if weight > best_decay:
                    best_decay = weight
                    best_expiry = expiry

    return best_decay, best_expiry


def _lifetime_from_decay(decay: float) -> str:
    """Map D factor to UsefulnessLifetime enum."""
    if decay >= 0.80:
        return "SHORT"
    elif decay >= 0.50:
        return "MEDIUM"
    elif decay >= 0.20:
        return "LONG"
    else:
        return "PERMANENT"


def run(ctx: PipelineContext) -> PipelineContext:
    """Execute Stage 4: Temporal Detector. Returns ctx modified in-place."""
    try:
        text = ctx.normalised_content
        if not text:
            return ctx

        decay, expiry_delta = _detect_temporal_signals(text, ctx.entity_labels)

        ctx.temporal_decay = round(decay, 4)
        ctx.is_temporal = decay >= 0.20
        ctx.usefulness_lifetime = _lifetime_from_decay(decay)

        if expiry_delta is not None and decay >= 0.20:
            ctx.expires_at = (_now() + expiry_delta).isoformat()
        else:
            ctx.expires_at = None

        logger.debug(STAGE_NAME, extra={
            "temporal_decay": ctx.temporal_decay,
            "is_temporal": ctx.is_temporal,
            "lifetime": ctx.usefulness_lifetime,
            "expires_at": ctx.expires_at,
        })

    except Exception as exc:
        ctx.record_error(STAGE_NAME, f"Temporal detection failed: {exc}")

    return ctx
