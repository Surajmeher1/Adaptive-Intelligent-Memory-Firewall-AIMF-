"""
AIMF — PipelineContext
======================
The single data object that flows through all 10 stages of the AMGS pipeline.

Each stage reads from and writes to this object.
Stages must never modify fields set by a previous stage without good reason.

Data flow:
    AnalyzeRequest
        → Stage 1 (Preprocessor)       → normalised_content, token_count, content_hash
        → Stage 2 (NER Analyzer)        → entities
        → Stage 3 (Privacy Analyzer)    → privacy_risk, sensitivity, memory_category
        → Stage 4 (Temporal Detector)   → temporal_decay, is_temporal, expires_at
        → Stage 5 (Embedding)           → embedding
        → Stage 6 (Novelty Estimator)   → novelty
        → Stage 7 (Redundancy Detector) → redundancy, similar_memory_id
        → Stage 8 (Usefulness Predictor)→ usefulness, usefulness_lifetime
        → Stage 9 (Context Analyzer)    → context_relevance, frequency
        → Stage 10 (Decision Engine)    → decision, amgs_score, explanation
    → AnalyzeResponse

References: docs/AI_PIPELINE.md, ARCHITECTURE.md §3
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class EntityInfo:
    """Named entity detected by spaCy NER."""
    text:  str
    label: str
    start: int
    end:   int


@dataclass
class PipelineContext:
    """
    Central data object flowing through all 10 AMGS pipeline stages.

    Initialized with raw user input. Each stage populates its designated fields.
    All factor scores are in [0.0, 1.0]. Default 0.0 means "not yet computed".
    """

    # ─── Input ────────────────────────────────────────────────────────────────
    raw_content:   str                  # Exact user-submitted text
    session_id:    str | None           # Session context (for Stage 9)
    request_id:    str = field(default_factory=lambda: f"req-{uuid.uuid4().hex[:12]}")
    started_at:    str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    # ─── Stage 1: Preprocessor ────────────────────────────────────────────────
    normalised_content: str = ""        # Stripped/normalised text for processing
    content_hash:       str = ""        # SHA-256 hex of normalised_content
    token_count:        int = 0         # Word count (simple split)
    language:           str = "en"      # Detected language code
    language_warning:   bool = False    # True if non-English (model accuracy may drop)

    # ─── Stage 2: NER Analyzer ────────────────────────────────────────────────
    entities:           list[EntityInfo] = field(default_factory=list)
    # entity_labels: set of unique entity type labels found (PERSON, DATE, etc.)
    entity_labels:      set[str] = field(default_factory=set)

    # ─── Stage 3: Privacy Analyzer ────────────────────────────────────────────
    privacy_risk:       float = 0.0     # P factor — penalty in [0, 1]
    sensitivity:        str   = "LOW"   # SensitivityLevel enum value
    memory_category:    str   = "GENERAL"  # MemoryCategory enum value
    privacy_patterns:   list[str] = field(default_factory=list)
    # Names of patterns matched (e.g. "EMAIL", "CREDIT_CARD") — never the content

    # ─── Prompt Injection / Adversarial Defense ──────────────────────────────
    injection_detected: bool = False    # True if prompt injection / adversarial override detected
    injection_patterns: list[str] = field(default_factory=list) # Matched injection rule names

    # ─── Stage 4: Temporal Detector ───────────────────────────────────────────
    temporal_decay:     float = 0.0     # D factor — penalty in [0, 1]
    is_temporal:        bool  = False   # True if memory has a detected expiry signal
    expires_at:         str | None = None  # ISO-8601 datetime or None
    usefulness_lifetime:str  = "MEDIUM"    # UsefulnessLifetime enum value

    # ─── Stage 5: Embedding ───────────────────────────────────────────────────
    embedding:          list[float] | None = None  # 384-dim MiniLM embedding vector

    # ─── Stage 6: Novelty Estimator ───────────────────────────────────────────
    novelty:            float = 0.5     # N factor — [0, 1], higher = more novel

    # ─── Stage 7: Redundancy Detector ────────────────────────────────────────
    redundancy:         float = 0.0     # R factor — penalty in [0, 1]
    similar_memory_id:  str | None = None   # UUID of most similar existing memory
    max_similarity:     float = 0.0     # Cosine similarity with similar_memory_id

    # ─── Stage 8: Usefulness Predictor ───────────────────────────────────────
    usefulness:         float = 0.5     # U factor — [0, 1]

    # ─── Stage 9: Context Analyzer ────────────────────────────────────────────
    context_relevance:  float = 0.5     # C factor — [0, 1]
    frequency:          float = 0.0     # F factor — [0, 1], higher = seen more often
    session_context_ids:list[str] = field(default_factory=list)  # Recent memory IDs

    # ─── Stage 10: Decision Engine + AMGS ─────────────────────────────────────
    amgs_score:         float = 0.0     # Final AMGS score in [0, 1]
    confidence:         float = 0.5     # Decision confidence in [0, 1]
    decision:           str   = ""      # GovernanceDecision enum value
    review_recommended: bool  = False   # True if pipeline had errors

    # ─── Explanation (populated by explainer.py) ──────────────────────────────
    rationale:              str = ""
    decision_boundary:      str = ""
    dominant_factor:        str = ""

    # ─── Pipeline metadata ────────────────────────────────────────────────────
    stage_errors:       list[str] = field(default_factory=list)
    # Records non-fatal errors per stage (e.g., "Stage 2: spaCy not loaded")

    # ─── Helpers ──────────────────────────────────────────────────────────────

    def record_error(self, stage: str, error: str) -> None:
        """Log a non-fatal stage error and set review_recommended flag."""
        self.stage_errors.append(f"[{stage}] {error}")
        self.review_recommended = True

    def factor_scores(self) -> dict[str, float]:
        """Return all 7 AMGS factor scores as a dict."""
        return {
            "usefulness":        self.usefulness,
            "context_relevance": self.context_relevance,
            "frequency":         self.frequency,
            "novelty":           self.novelty,
            "redundancy":        self.redundancy,
            "privacy_risk":      self.privacy_risk,
            "temporal_decay":    self.temporal_decay,
        }

    def is_complete(self) -> bool:
        """True if all 10 stages have run (decision is populated)."""
        return bool(self.decision)

    def latency_ms(self) -> float:
        """Elapsed time since pipeline start in milliseconds."""
        start = datetime.fromisoformat(self.started_at)
        now = datetime.now(timezone.utc)
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        return (now - start).total_seconds() * 1000

    def to_explanation_dict(self) -> dict[str, Any]:
        """Serialize explanation fields to JSON-ready dict (for DB storage)."""
        return {
            "rationale":             self.rationale,
            "decision_boundary":     self.decision_boundary,
            "dominant_factor":       self.dominant_factor,
            "privacy_patterns_found":self.privacy_patterns,
            "similar_memory_id":     self.similar_memory_id,
        }

    def __repr__(self) -> str:
        return (
            f"<PipelineContext "
            f"decision={self.decision or 'PENDING'} "
            f"amgs={self.amgs_score:.3f} "
            f"errors={len(self.stage_errors)}>"
        )
