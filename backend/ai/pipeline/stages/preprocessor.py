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

# ─── Prompt Injection / Adversarial Governance Patterns ──────────────────────
_INJECTION_PATTERNS: list[tuple[str, re.Pattern]] = [
    (
        "IGNORE_GOVERNANCE_RULES",
        re.compile(
            r"\bignore\s+(all\s+|previous\s+|prior\s+|the\s+)*(aimf|instructions?|rules?|policy|policies|governance|restrictions?|guardrails?|safety|checks?)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "MANIPULATE_AMGS_SCORE",
        re.compile(
            r"\b(set|change|override|force|make|give)\s+(the\s+)?(amgs(\s+score)?|score|governance|amgs_score)\s*(to|=|:)\s*([0-9\.]+|high|max|1(\.0)?)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "DISABLE_PRIVACY_SECURITY",
        re.compile(
            r"\bdisable\s+(all\s+|the\s+)*(privacy|checks?|protection|filters?|safety|governance|aimf|security|firewall)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "FORCE_DECISION_OVERRIDE",
        re.compile(
            r"\b(always|force|must|automatically)\s+(choose|select|pick|set|use|store|save)\s*(store_long_term|long_term|store|store_temporary|encrypt_and_store|store_encrypt|my\s+messages?|all\s+messages?)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "BYPASS_AIMF_GOVERNANCE",
        re.compile(
            r"\b(bypass|override|disregard|circumvent)\s+(the\s+)?(aimf|governance|amgs|firewall|rules?|policy|safety|checks?|restrictions?|results?)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "FORCE_PERSIST_REGARDLESS",
        re.compile(
            r"\b(save|store|persist|keep)\s+(this|it|data|information)?\s*(permanently|regardless|anyway|even if|at all costs)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "REJECTION_BYPASS_ATTEMPT",
        re.compile(
            r"\b(even if|regardless of whether)\s+(the\s+)?aimf\s+(rejects|denies|drops|blocks)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "REGARDLESS_OF_GOVERNANCE",
        re.compile(
            r"\bregardless\s+of\s+(the\s+)?(governance|aimf|amgs|results?|decision)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "TELL_SYSTEM_SAFE",
        re.compile(
            r"\btell\s+(the\s+)?(system|firewall|aimf|backend)\s+(that\s+)?(this\s+is\s+)?(safe|harmless|approved|clean)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "SYSTEM_JAILBREAK_OVERRIDE",
        re.compile(
            r"\b(system\s+override|jailbreak|developer\s+mode|dan\s+mode|root\s+override|system\s+instruction)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "MANDATORY_STORE_COMMAND",
        re.compile(
            r"\b(you\s+must\s+store|you\s+must\s+save)\s+(this|it|data)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "FORCE_SENSITIVE_STORE",
        re.compile(
            r"\b(store|save)\s+this\s+sensitive\s+information\b",
            re.IGNORECASE,
        ),
    ),
]


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

        # ── Adversarial Prompt Injection / Governance Manipulation Detection ──
        detected_injections = []
        for name, pattern in _INJECTION_PATTERNS:
            if pattern.search(normalised):
                detected_injections.append(name)

        if detected_injections:
            ctx.injection_detected = True
            ctx.injection_patterns = detected_injections
            logger.warning(
                "Adversarial governance manipulation attempt detected in input",
                extra={
                    "patterns": detected_injections,
                    "request_id": ctx.request_id,
                },
            )

        logger.debug(STAGE_NAME, extra={
            "token_count": ctx.token_count,
            "lang": ctx.language,
            "hash": ctx.content_hash[:8],  # log only first 8 chars of hash
            "injection_detected": ctx.injection_detected,
        })

    except Exception as exc:
        ctx.record_error(STAGE_NAME, f"Unexpected error: {exc}")
        # Best-effort fallback
        if not ctx.normalised_content:
            ctx.normalised_content = ctx.raw_content.strip()
            ctx.content_hash = _sha256_hex(ctx.normalised_content)
            ctx.token_count = _word_count(ctx.normalised_content)

    return ctx
