"""
AIMF — Pipeline Stage 2: NER Analyzer
=======================================
Runs spaCy Named Entity Recognition on normalised_content.

Extracts entities and their types to inform downstream stages:
  - Stage 3 (Privacy): PERSON, EMAIL entities → elevate sensitivity
  - Stage 4 (Temporal): DATE, TIME entities → potential expiry signals
  - Stage 8 (Usefulness): ORG, PRODUCT entities → domain relevance

Output fields populated:
  - ctx.entities       — list[EntityInfo]
  - ctx.entity_labels  — set[str] of unique entity type labels

If spaCy is not loaded (app.state.nlp is None) this stage is a no-op
and records a non-fatal error.

spaCy entity label reference:
  PERSON   — people, including fictional
  NORP     — nationalities, religious or political groups
  FAC      — buildings, airports, highways, bridges
  ORG      — companies, agencies, institutions
  GPE      — countries, cities, states
  LOC      — non-GPE locations
  PRODUCT  — objects, vehicles, foods
  EVENT    — named hurricanes, battles, wars, sports events
  WORK_OF_ART — titles of books, songs, etc.
  LAW      — named documents made into laws
  LANGUAGE — any named language
  DATE     — absolute or relative dates or periods
  TIME     — times smaller than a day
  PERCENT  — percentage (including "%")
  MONEY    — monetary values, including unit
  QUANTITY — measurements
  ORDINAL  — "first", "second", etc.
  CARDINAL — numerals not under another type
"""

from __future__ import annotations

from ai.pipeline import EntityInfo, PipelineContext
from core.logging import get_logger

logger = get_logger(__name__)

STAGE_NAME = "Stage 2 (NER Analyzer)"

# Entity labels we care about for privacy/temporal analysis
PRIVACY_SENSITIVE_LABELS = {"PERSON", "ORG", "GPE", "LOC", "EMAIL", "PHONE"}
TEMPORAL_LABELS = {"DATE", "TIME", "EVENT"}

# Minimum content length to run NER (too short → poor results)
_MIN_NER_TOKENS = 3


def run(ctx: PipelineContext, nlp_model=None) -> PipelineContext:
    """
    Execute Stage 2: NER Analyzer.

    Args:
        ctx:       Pipeline context object (modified in place).
        nlp_model: spaCy Language object. Pass None to skip (no-op).

    Returns:
        ctx with entities and entity_labels populated.
    """
    try:
        if nlp_model is None:
            ctx.record_error(STAGE_NAME, "spaCy model not loaded — NER skipped")
            return ctx

        if ctx.token_count < _MIN_NER_TOKENS:
            logger.debug(STAGE_NAME, extra={
                "skipped": True,
                "reason": "too few tokens",
                "token_count": ctx.token_count,
            })
            return ctx

        text = ctx.normalised_content
        if not text:
            return ctx

        # ── Run spaCy NER ─────────────────────────────────────────────────────
        # disable: tagger, parser, lemmatizer → NER only for speed
        doc = nlp_model(text, disable=["tagger", "parser", "lemmatizer"])

        entities: list[EntityInfo] = []
        labels: set[str] = set()

        for ent in doc.ents:
            entities.append(EntityInfo(
                text=ent.text,
                label=ent.label_,
                start=ent.start_char,
                end=ent.end_char,
            ))
            labels.add(ent.label_)

        ctx.entities = entities
        ctx.entity_labels = labels

        logger.debug(STAGE_NAME, extra={
            "entity_count": len(entities),
            "labels": sorted(labels),
            # NFR-08: log entity types only, never entity text
        })

    except Exception as exc:
        ctx.record_error(STAGE_NAME, f"NER failed: {exc}")

    return ctx
