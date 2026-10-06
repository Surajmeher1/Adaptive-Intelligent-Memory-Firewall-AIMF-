"""
AIMF Schemas — Memory Request/Response Models
==============================================
Pydantic v2 models for all memory-related API endpoints.
All user inputs pass through these models before any processing (NFR-09).
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator

from schemas.governance import (
    GovernanceDecision,
    MemoryCategory,
    MemoryStatus,
    SensitivityLevel,
    UsefulnessLifetime,
)


# ─── Request Models ───────────────────────────────────────────────────────────

class MemoryAnalyzeRequest(BaseModel):
    """
    Input for POST /api/v1/memory/analyze and /api/v1/memory/submit.
    Enforces all input constraints from FR-01.
    """
    model_config = ConfigDict(str_strip_whitespace=True)

    content: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Text content to analyze. 1–1000 characters.",
        examples=["My meeting with Dr. Smith is tomorrow at 3pm"],
    )
    session_id: str | None = Field(
        None,
        max_length=128,
        description="Optional session identifier for context relevance computation.",
    )

    @field_validator("content")
    @classmethod
    def content_not_whitespace_only(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("content must not be empty or whitespace-only")
        return v


# ─── Sub-models ───────────────────────────────────────────────────────────────

class FactorScores(BaseModel):
    """Per-factor AMGS component scores. All values in [0.0, 1.0]."""
    usefulness:       float = Field(ge=0.0, le=1.0)
    context_relevance:float = Field(ge=0.0, le=1.0)
    frequency:        float = Field(ge=0.0, le=1.0)
    novelty:          float = Field(ge=0.0, le=1.0)
    redundancy:       float = Field(ge=0.0, le=1.0)
    privacy_risk:     float = Field(ge=0.0, le=1.0)
    temporal_decay:   float = Field(ge=0.0, le=1.0)


class EntityInfo(BaseModel):
    """Named entity detected by spaCy NER."""
    text:  str
    label: str
    start: int
    end:   int


class FactorExplanation(BaseModel):
    """Human-readable explanation of a governance decision (FR-03)."""
    rationale:          str = Field(description="Natural language explanation ≥ 20 chars")
    decision_boundary:  str = Field(description="Which threshold/rule triggered the decision")
    dominant_factor:    str = Field(description="Factor with highest absolute contribution")
    privacy_patterns_found: list[str] = Field(
        default_factory=list,
        description="List of PII pattern names detected (not matched text)",
    )
    similar_memory_id: str | None = Field(
        None,
        description="Memory ID of closest match (for MERGE/UPDATE decisions)",
    )


class AnalysisMetadata(BaseModel):
    """Processing metadata returned alongside every governance decision."""
    token_count:        int
    entities:           list[EntityInfo] = Field(default_factory=list)
    sensitivity:        SensitivityLevel
    memory_category:    MemoryCategory
    usefulness_lifetime:UsefulnessLifetime
    is_temporal:        bool
    expires_at:         str | None = None
    language:           str = "en"
    language_warning:   bool = False


# ─── Response Models ──────────────────────────────────────────────────────────

class AnalyzeResponse(BaseModel):
    """
    Response from POST /api/v1/memory/analyze.
    Contains decision, AMGS score, all factor scores, explanation, and metadata.
    No memory is stored — analysis only.
    """
    request_id:         str
    decision:           GovernanceDecision
    amgs_score:         float = Field(ge=0.0, le=1.0)
    confidence:         float = Field(ge=0.0, le=1.0)
    review_recommended: bool = False
    factors:            FactorScores
    explanation:        FactorExplanation
    metadata:           AnalysisMetadata
    latency_ms:         float


class StorageMetadata(BaseModel):
    """Storage details returned by /submit."""
    encrypted:  bool
    expires_at: str | None = None
    version:    int = 1


class SubmitResponse(BaseModel):
    """
    Response from POST /api/v1/memory/submit.
    Includes analyze_result plus storage outcome.
    """
    memory_id:       str | None
    decision:        GovernanceDecision
    amgs_score:      float = Field(ge=0.0, le=1.0)
    stored:          bool
    analyze_result:  AnalyzeResponse
    storage_metadata:StorageMetadata | None = None


class MemoryOut(BaseModel):
    """
    Full memory representation returned by GET /api/v1/memory/{id}.
    Includes decrypted content for encrypted memories (via AES-GCM).
    """
    id:                 str
    content:            str
    decision:           GovernanceDecision
    amgs_score:         float
    factors:            FactorScores
    explanation:        FactorExplanation
    sensitivity:        SensitivityLevel
    memory_category:    MemoryCategory
    usefulness_lifetime:UsefulnessLifetime
    status:             MemoryStatus
    is_encrypted:       bool
    expires_at:         str | None
    created_at:         str
    last_accessed:      str
    access_count:       int
    version:            int
    parent_id:          str | None
    entities:           list[EntityInfo] = Field(default_factory=list)
    session_id:         str | None = None

    model_config = {"from_attributes": True}


class MemoryListItem(BaseModel):
    """Lightweight memory summary for list views."""
    id:              str
    content:         str
    decision:        GovernanceDecision
    amgs_score:      float
    sensitivity:     SensitivityLevel
    status:          MemoryStatus
    memory_category: MemoryCategory
    created_at:      str
    last_accessed:   str
    access_count:    int
    expires_at:      str | None
    is_encrypted:    bool

    model_config = {"from_attributes": True}


class PaginatedMemoryList(BaseModel):
    """Paginated list response for GET /api/v1/memory/."""
    total:     int
    page:      int
    page_size: int
    items:     list[MemoryListItem]


class SearchResult(BaseModel):
    """Single semantic search result."""
    memory_id:       str
    content:         str
    similarity:      float
    decision:        GovernanceDecision
    amgs_score:      float
    sensitivity:     SensitivityLevel
    memory_category: MemoryCategory


class SearchResponse(BaseModel):
    """Response from GET /api/v1/memory/search."""
    query:       str
    results:     list[SearchResult]
    total_found: int
    latency_ms:  float


class LifecycleEventOut(BaseModel):
    """Single lifecycle event for history view."""
    id:          str
    event_type:  str
    old_status:  str | None
    new_status:  str | None
    amgs_before: float | None
    amgs_after:  float | None
    reason:      str | None
    created_at:  str

    model_config = {"from_attributes": True}


class LifecycleHistoryResponse(BaseModel):
    """Response from GET /api/v1/memory/{id}/lifecycle."""
    memory_id:     str
    current_status:str
    current_amgs:  float
    decayed_amgs:  float
    events:        list[LifecycleEventOut]


class MemoryUpdateRequest(BaseModel):
    """Request body for PUT /api/v1/memory/{id}."""
    model_config = ConfigDict(str_strip_whitespace=True)

    content: str = Field(..., min_length=1, max_length=1000)
