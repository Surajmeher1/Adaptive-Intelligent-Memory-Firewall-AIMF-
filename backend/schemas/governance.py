"""
AIMF Schemas — Governance Enums and Types
==========================================
All enum types used throughout the API and AI pipeline.
Defined here as a single source of truth — imported by both
schemas/ and ai/ modules.
"""

from __future__ import annotations
from enum import Enum


class GovernanceDecision(str, Enum):
    """The governance decisions AIMF can make for any input.

    Values match exactly what the decision_engine.py outputs — do NOT rename
    without updating the engine, explainer, and memory API in lockstep.
    """
    REJECT          = "REJECT"
    REJECT_PRIVACY  = "REJECT_PRIVACY"
    STORE           = "STORE"
    STORE_TEMPORARY = "STORE_TEMPORARY"
    STORE_LONG_TERM = "STORE_LONG_TERM"
    STORE_ENCRYPT   = "STORE_ENCRYPT"
    SUMMARIZE       = "SUMMARIZE"
    FORGET          = "FORGET"


class SensitivityLevel(str, Enum):
    """Privacy/sensitivity classification of a memory item."""
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


class MemoryCategory(str, Enum):
    """Classification of what kind of information a memory contains."""
    CREDENTIAL    = "CREDENTIAL"
    PERSONAL_FACT = "PERSONAL_FACT"
    PREFERENCE    = "PREFERENCE"
    TEMPORAL_EVENT= "TEMPORAL_EVENT"
    TASK          = "TASK"
    RELATIONSHIP  = "RELATIONSHIP"
    HEALTH        = "HEALTH"
    FINANCIAL     = "FINANCIAL"
    PROFESSIONAL  = "PROFESSIONAL"
    LOCATION      = "LOCATION"
    KNOWLEDGE     = "KNOWLEDGE"
    TECHNICAL     = "TECHNICAL"
    GENERAL       = "GENERAL"


class UsefulnessLifetime(str, Enum):
    """Expected useful lifespan of a memory item."""
    EPHEMERAL = "EPHEMERAL"   # hours
    SHORT     = "SHORT"        # days
    MEDIUM    = "MEDIUM"       # weeks
    LONG      = "LONG"         # months
    PERMANENT = "PERMANENT"    # indefinite


class MemoryStatus(str, Enum):
    """Lifecycle status of a stored memory."""
    ACTIVE    = "ACTIVE"
    EXPIRED   = "EXPIRED"
    FORGOTTEN = "FORGOTTEN"
    ARCHIVED  = "ARCHIVED"


class LifecycleEventType(str, Enum):
    """Types of lifecycle events that can be recorded."""
    CREATED  = "CREATED"
    ACCESSED = "ACCESSED"
    DECAYED  = "DECAYED"
    EXPIRED  = "EXPIRED"
    FORGOTTEN= "FORGOTTEN"
    UPDATED  = "UPDATED"
    ARCHIVED = "ARCHIVED"
    MERGED   = "MERGED"


class BaselinePolicy(str, Enum):
    """Available baseline governance policies for comparison."""
    STORE_ALL           = "store_all"
    FIXED_TTL           = "fixed_ttl"
    STATIC_RULES        = "static_rules"
    RECENCY_SIMILARITY  = "recency_similarity"
