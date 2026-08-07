"""
AIMF — Pipeline Stage 3: Privacy Analyzer
==========================================
Detects PII and sensitive information using regex patterns + NER signals.
Computes the P (Privacy Risk) factor: penalty in [0, 1].

Privacy Risk Model:
  - Multiple weighted pattern classes
  - NER entity boosting (PERSON, ORG entities elevate base score)
  - Caps at 1.0

Sensitivity levels (SensitivityLevel enum):
  CRITICAL  → P >= 0.85  — healthcare, biometric, SSN
  HIGH      → P >= 0.65  — financial, passwords, keys
  MEDIUM    → P >= 0.40  — names + contact info
  LOW       → P < 0.40   — general non-PII

Pattern weights (tuned to AMGS v1 — see DECISIONS.md ADR-005):
  CRITICAL_PII_PATTERNS:   +0.85 (SSN, passport, medical)
  HIGH_PII_PATTERNS:       +0.60 (credit card, bank, password)
  MEDIUM_PII_PATTERNS:     +0.30 (email, phone, name)
  NER_PERSON_BOOST:        +0.15 per PERSON entity (max +0.30)
  NER_ORG_BOOST:           +0.05 per ORG entity (max +0.10)

Output fields populated:
  - ctx.privacy_risk     — P factor [0, 1]
  - ctx.sensitivity      — "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  - ctx.memory_category  — "PRIVATE" | "GENERAL" | "PUBLIC" etc.
  - ctx.privacy_patterns — list of pattern names matched (NOT the matched text)
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from ai.pipeline import PipelineContext
from core.logging import get_logger

logger = get_logger(__name__)

STAGE_NAME = "Stage 3 (Privacy Analyzer)"


# ─── Pattern Definitions ──────────────────────────────────────────────────────

@dataclass
class PrivacyPattern:
    name:   str
    regex:  re.Pattern
    weight: float


_CRITICAL_PATTERNS: list[PrivacyPattern] = [
    PrivacyPattern(
        name="SSN_US",
        regex=re.compile(r"\b(?:\d{3}-\d{2}-\d{4}|\d{9})\b"),
        weight=0.85,
    ),
    PrivacyPattern(
        name="MEDICAL_KEYWORD",
        regex=re.compile(
            r"\b(diagnosis|prescribed|patient\s+id|medical\s+record|"
            r"icd-?\d{1,2}|diagnostic|treatment\s+plan)\b",
            re.IGNORECASE,
        ),
        weight=0.70,
    ),
    PrivacyPattern(
        name="BIOMETRIC",
        regex=re.compile(
            r"\b(fingerprint|retinal\s+scan|dna\s+sequence|biometric)\b",
            re.IGNORECASE,
        ),
        weight=0.80,
    ),
    PrivacyPattern(
        name="PASSPORT_NUMBER",
        regex=re.compile(r"\b[A-Z]{1,2}[0-9]{6,9}\b"),
        weight=0.75,
    ),
]

_HIGH_PATTERNS: list[PrivacyPattern] = [
    PrivacyPattern(
        name="CREDIT_CARD",
        regex=re.compile(
            r"\b(?:4[0-9]{12}(?:[0-9]{3})?|"       # Visa
            r"5[1-5][0-9]{14}|"                      # MC
            r"3[47][0-9]{13}|"                       # Amex
            r"6(?:011|5[0-9]{2})[0-9]{12})\b"       # Discover
        ),
        weight=0.75,
    ),
    PrivacyPattern(
        name="API_KEY_SECRET",
        regex=re.compile(
            r"\b(api[_-]?key|secret[_-]?key|access[_-]?token|private[_-]?key|"
            r"bearer\s+[A-Za-z0-9\-_.~+/]+=*)\b",
            re.IGNORECASE,
        ),
        weight=0.65,
    ),
    PrivacyPattern(
        name="PASSWORD_MENTION",
        regex=re.compile(
            r"\b(password|passwd|passphrase|pin|puk)\s*(?:is|[:=])\s*\S+",
            re.IGNORECASE,
        ),
        weight=0.75,
    ),
    PrivacyPattern(
        name="BANK_ACCOUNT",
        regex=re.compile(
            r"\b(IBAN|account\s+number|routing\s+number|sort\s+code)\b",
            re.IGNORECASE,
        ),
        weight=0.60,
    ),
    PrivacyPattern(
        name="IP_ADDRESS_INTERNAL",
        regex=re.compile(
            r"\b(192\.168\.|10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.)\d{1,3}\.\d{1,3}\b"
        ),
        weight=0.40,
    ),
]

_MEDIUM_PATTERNS: list[PrivacyPattern] = [
    PrivacyPattern(
        name="EMAIL",
        regex=re.compile(
            r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"
        ),
        weight=0.35,
    ),
    PrivacyPattern(
        name="PHONE_NUMBER",
        regex=re.compile(
            r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
        ),
        weight=0.30,
    ),
    PrivacyPattern(
        name="HOME_ADDRESS",
        regex=re.compile(
            r"\b\d{1,5}\s+[A-Za-z\s]{3,30}\s+(Street|St|Avenue|Ave|"
            r"Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|"
            r"Place|Pl|Way)\b",
            re.IGNORECASE,
        ),
        weight=0.35,
    ),
    PrivacyPattern(
        name="DATE_OF_BIRTH",
        regex=re.compile(
            r"\b(born|dob|date\s+of\s+birth|birthday)\b",
            re.IGNORECASE,
        ),
        weight=0.25,
    ),
]

_ALL_PATTERNS: list[PrivacyPattern] = (
    _CRITICAL_PATTERNS + _HIGH_PATTERNS + _MEDIUM_PATTERNS
)

# ─── NER boosts ───────────────────────────────────────────────────────────────
_NER_PERSON_BOOST = 0.15
_NER_PERSON_MAX   = 0.30
_NER_ORG_BOOST    = 0.05
_NER_ORG_MAX      = 0.10


def _compute_privacy_risk(
    text: str,
    entity_labels: set[str],
) -> tuple[float, list[str]]:
    """
    Compute base privacy risk score and list of matched pattern names.

    Returns:
        (risk_score, matched_pattern_names)
    """
    risk = 0.0
    matched: list[str] = []

    for pattern in _ALL_PATTERNS:
        if pattern.regex.search(text):
            risk += pattern.weight
            matched.append(pattern.name)

    # ── NER boosts ────────────────────────────────────────────────────────────
    person_count = sum(1 for lbl in entity_labels if lbl == "PERSON")
    org_count    = sum(1 for lbl in entity_labels if lbl == "ORG")

    risk += min(person_count * _NER_PERSON_BOOST, _NER_PERSON_MAX)
    risk += min(org_count    * _NER_ORG_BOOST,    _NER_ORG_MAX)

    # ── Cap at 1.0 ────────────────────────────────────────────────────────────
    return min(risk, 1.0), matched


def _sensitivity_from_risk(risk: float) -> str:
    """Map risk score to sensitivity label."""
    if risk >= 0.85:
        return "CRITICAL"
    elif risk >= 0.65:
        return "HIGH"
    elif risk >= 0.40:
        return "MEDIUM"
    else:
        return "LOW"


def _category_from_risk_and_sensitivity(risk: float, sensitivity: str) -> str:
    """
    Derive MemoryCategory from risk and sensitivity.

    - CRITICAL / HIGH → PRIVATE
    - MEDIUM + PERSON entity → PRIVATE
    - LOW + structural data → TECHNICAL
    - Otherwise → GENERAL
    """
    if sensitivity in ("CRITICAL", "HIGH"):
        return "PRIVATE"
    elif sensitivity == "MEDIUM":
        return "PRIVATE"
    else:
        return "GENERAL"


def run(ctx: PipelineContext) -> PipelineContext:
    """Execute Stage 3: Privacy Analyzer. Returns ctx modified in-place."""
    try:
        text = ctx.normalised_content
        if not text:
            return ctx

        risk, matched_patterns = _compute_privacy_risk(text, ctx.entity_labels)
        sensitivity = _sensitivity_from_risk(risk)
        category = _category_from_risk_and_sensitivity(risk, sensitivity)

        ctx.privacy_risk = risk
        ctx.sensitivity = sensitivity
        ctx.memory_category = category
        ctx.privacy_patterns = matched_patterns

        logger.debug(STAGE_NAME, extra={
            "privacy_risk": round(risk, 3),
            "sensitivity": sensitivity,
            "patterns_matched": matched_patterns,
            # NFR-08: patterns list only, never the matched content
        })

    except Exception as exc:
        ctx.record_error(STAGE_NAME, f"Privacy analysis failed: {exc}")

    return ctx
