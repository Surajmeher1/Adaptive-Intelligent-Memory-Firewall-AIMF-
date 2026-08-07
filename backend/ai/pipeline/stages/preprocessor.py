"""
AIMF — Pipeline Stage 1: Preprocessor
=======================================
Normalises raw input text for downstream pipeline stages.

Operations:
  1. Strip leading/trailing whitespace
  2. Collapse multiple internal whitespace into single space
  3. Compute SHA-256 content hash (for exact-duplicate detection)
  4. Count word tokens
  5. Detect language (using langdetect; falls back to 'en' on failure)
  6. Warn if non-English (model accuracy degrades for other languages)

Output fields populated:
  - ctx.normalised_content
  - ctx.content_hash
  - ctx.token_count
  - ctx.language
  - ctx.language_warning
"""

from __future__ import annotations

import hashlib
import re
import unicodedata

from ai.pipeline import PipelineContext
from core.logging import get_logger

logger = get_logger(__name__)

STAGE_NAME = "Stage 1 (Preprocessor)"

# Languages for which our NLP models have full support
_SUPPORTED_LANGUAGES = {"en"}

# Maximum raw content length accepted (chars) — enforced here, not at API level
_MAX_CONTENT_CHARS = 10_000


def _normalise(text: str) -> str:
    """
    Normalise text for consistent processing.

    Steps:
      1. Unicode NFKC normalisation (standardise fancy quotes, ligatures, etc.)
      2. Collapse all whitespace (tabs, newlines, multiple spaces) → single space
      3. Strip leading/trailing whitespace
    """
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _sha256_hex(text: str) -> str:
    """Return SHA-256 hex digest of the UTF-8 encoded string."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _word_count(text: str) -> int:
    """Simple whitespace-split word count."""
    return len(text.split()) if text else 0


def _detect_language(text: str) -> str:
    """
    Detect language using langdetect (Facebook's language-detection library).

    Returns ISO 639-1 code (e.g. 'en', 'fr', 'de').
    Falls back to 'en' on any error (insufficient text, model failure, etc.).
    """
    try:
        from langdetect import detect, DetectorFactory  # type: ignore[import]
        # Seed for reproducibility (langdetect is non-deterministic by default)
        DetectorFactory.seed = 0
        return detect(text)
    except Exception:
        return "en"


def run(ctx: PipelineContext) -> PipelineContext:
    """
    Execute Stage 1: Preprocessor.

    Modifies ctx in-place. Always returns ctx (even on error).
    """
    try:
        raw = ctx.raw_content

        # ── Guard: empty or whitespace-only ───────────────────────────────────
        if not raw or not raw.strip():
            ctx.record_error(STAGE_NAME, "Empty or whitespace-only content received")
            ctx.normalised_content = ""
            ctx.content_hash = _sha256_hex("")
            ctx.token_count = 0
            return ctx

        # ── Guard: length limit ───────────────────────────────────────────────
        if len(raw) > _MAX_CONTENT_CHARS:
            ctx.record_error(
                STAGE_NAME,
                f"Content truncated from {len(raw)} to {_MAX_CONTENT_CHARS} chars",
            )
            raw = raw[:_MAX_CONTENT_CHARS]

        # ── Normalise ─────────────────────────────────────────────────────────
        normalised = _normalise(raw)
        ctx.normalised_content = normalised
        ctx.content_hash = _sha256_hex(normalised)
        ctx.token_count = _word_count(normalised)

        # ── Language detection ────────────────────────────────────────────────
        lang = _detect_language(normalised)
        ctx.language = lang
        if lang not in _SUPPORTED_LANGUAGES:
            ctx.language_warning = True
            ctx.record_error(
                STAGE_NAME,
                f"Language '{lang}' may reduce NLP accuracy (models trained on English)",
            )

        logger.debug(STAGE_NAME, extra={
            "token_count": ctx.token_count,
            "lang": ctx.language,
            "hash": ctx.content_hash[:8],  # log only first 8 chars of hash
        })

    except Exception as exc:
        ctx.record_error(STAGE_NAME, f"Unexpected error: {exc}")
        # Best-effort fallback
        if not ctx.normalised_content:
            ctx.normalised_content = ctx.raw_content.strip()
            ctx.content_hash = _sha256_hex(ctx.normalised_content)
            ctx.token_count = _word_count(ctx.normalised_content)

    return ctx
