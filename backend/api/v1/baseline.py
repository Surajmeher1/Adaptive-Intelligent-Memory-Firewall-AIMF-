"""
AIMF API v1 — Baseline Policy Endpoints
=========================================
Implements GROUP 5 from docs/API_SPECIFICATION.md

Four deterministic baseline policies for research comparison against AMGS:

  store_all          — Always store everything (naïve baseline)
  fixed_ttl          — Always store temporarily with configurable TTL
  static_rules       — Keyword + regex rule set
  recency_similarity — Reject if too similar to recent memories

Endpoints:
  GET  /api/v1/baseline/policies
  POST /api/v1/baseline/{policy}/analyze
"""

from __future__ import annotations

import re
import time
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Path

from schemas.memory import MemoryAnalyzeRequest

router = APIRouter(tags=["baseline"])

# ─── Policy Registry ──────────────────────────────────────────────────────────

POLICIES = [
    {
        "id": "store_all",
        "name": "Store Everything",
        "description": (
            "Naïve baseline: always STORE_LONG_TERM regardless of content. "
            "No privacy, novelty, or redundancy checks. "
            "Represents the status quo in most AI assistants."
        ),
    },
    {
        "id": "fixed_ttl",
        "name": "Fixed TTL (24 h)",
        "description": (
            "Stores all content as STORE_TEMPORARY with a fixed 24-hour expiry. "
            "No content analysis; treats all memories as short-lived."
        ),
    },
    {
        "id": "static_rules",
        "name": "Static Rules",
        "description": (
            "Keyword + regex blacklist/whitelist. "
            "Rejects if PII keywords detected. "
            "Stores temporarily if temporal keywords found. "
            "Otherwise stores long-term."
        ),
    },
    {
        "id": "recency_similarity",
        "name": "Recency + Similarity",
        "description": (
            "Counts word overlap with a fixed recent-memory window. "
            "If Jaccard similarity > 0.55, rejects as redundant. "
            "Otherwise stores long-term."
        ),
    },
]

POLICY_IDS = {p["id"] for p in POLICIES}

# ─── Policy Implementations ───────────────────────────────────────────────────

# PII patterns for static_rules
_PII_PATTERNS = [
    re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),               # SSN
    re.compile(r"\b4[0-9]{15}\b"),                        # Visa card
    re.compile(r"\b5[1-5][0-9]{14}\b"),                   # Mastercard
    re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),  # email
    re.compile(r"\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b"),      # phone
    re.compile(r"(?i)\bpassword\b"),
    re.compile(r"(?i)\bssn\b"),
    re.compile(r"(?i)\bcredit.?card\b"),
    re.compile(r"(?i)\bpin\b"),
    re.compile(r"(?i)\bsocial.?security\b"),
]

_TEMPORAL_KEYWORDS = [
    "tomorrow", "today", "tonight", "this afternoon", "this morning",
    "next week", "next month", "in an hour", "at ",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "june", "july", "august",
    "september", "october", "november", "december",
    "deadline", "meeting", "appointment", "schedule", "event",
]

_REJECT_KEYWORDS = [
    "delete", "forget", "ignore", "scratch that", "never mind",
    "test test", "asdf", "hello world",
]

# Simulated recent memory store for recency_similarity (in-process only)
_RECENT_WINDOW: list[str] = []
_RECENT_MAX = 20


def _jaccard(a: str, b: str) -> float:
    sa, sb = set(a.lower().split()), set(b.lower().split())
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def _run_store_all(content: str) -> dict:
    return {
        "decision": "STORE_LONG_TERM",
        "score": 1.0,
        "rationale": "store_all: unconditionally stores all content.",
        "expires_at": None,
        "is_temporal": False,
        "privacy_risk": 0.0,
    }


def _run_fixed_ttl(content: str) -> dict:
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    return {
        "decision": "STORE_TEMPORARY",
        "score": 0.50,
        "rationale": "fixed_ttl: stores all content with a fixed 24-hour TTL.",
        "expires_at": expires_at,
        "is_temporal": True,
        "privacy_risk": 0.0,
    }


def _run_static_rules(content: str) -> dict:
    text = content.lower()

    # Check reject keywords
    for kw in _REJECT_KEYWORDS:
        if kw in text:
            return {
                "decision": "REJECT",
                "score": 0.0,
                "rationale": f"static_rules: rejected by keyword '{kw}'.",
                "expires_at": None,
                "is_temporal": False,
                "privacy_risk": 0.1,
            }

    # Check PII patterns
    pii_found = [p.pattern for p in _PII_PATTERNS if p.search(content)]
    if pii_found:
        return {
            "decision": "REJECT",
            "score": 0.0,
            "rationale": f"static_rules: PII detected ({len(pii_found)} pattern(s)). Content rejected.",
            "expires_at": None,
            "is_temporal": False,
            "privacy_risk": 0.95,
        }

    # Check temporal keywords
    for kw in _TEMPORAL_KEYWORDS:
        if kw in text:
            expires_at = (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat()
            return {
                "decision": "STORE_TEMPORARY",
                "score": 0.50,
                "rationale": f"static_rules: temporal keyword '{kw}' → STORE_TEMPORARY (48h TTL).",
                "expires_at": expires_at,
                "is_temporal": True,
                "privacy_risk": 0.0,
            }

    return {
        "decision": "STORE_LONG_TERM",
        "score": 0.75,
        "rationale": "static_rules: no blacklist patterns matched → STORE_LONG_TERM.",
        "expires_at": None,
        "is_temporal": False,
        "privacy_risk": 0.0,
    }


def _run_recency_similarity(content: str) -> dict:
    global _RECENT_WINDOW

    max_sim = max((_jaccard(content, r) for r in _RECENT_WINDOW), default=0.0)

    # Update window
    _RECENT_WINDOW.append(content)
    if len(_RECENT_WINDOW) > _RECENT_MAX:
        _RECENT_WINDOW.pop(0)

    if max_sim > 0.55:
        return {
            "decision": "REJECT",
            "score": 0.0,
            "rationale": f"recency_similarity: Jaccard similarity {max_sim:.3f} > 0.55 → REJECT (redundant).",
            "expires_at": None,
            "is_temporal": False,
            "privacy_risk": 0.0,
            "similarity": max_sim,
        }

    return {
        "decision": "STORE_LONG_TERM",
        "score": round(1.0 - max_sim, 3),
        "rationale": f"recency_similarity: max Jaccard {max_sim:.3f} ≤ 0.55 → STORE_LONG_TERM.",
        "expires_at": None,
        "is_temporal": False,
        "privacy_risk": 0.0,
        "similarity": max_sim,
    }


_RUNNERS = {
    "store_all":          _run_store_all,
    "fixed_ttl":          _run_fixed_ttl,
    "static_rules":       _run_static_rules,
    "recency_similarity": _run_recency_similarity,
}


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get(
    "/baseline/policies",
    summary="List available baseline policies",
)
async def list_policies() -> dict:
    return {"policies": POLICIES}


@router.post(
    "/baseline/{policy}/analyze",
    summary="Analyze text using a baseline policy (no storage)",
)
async def baseline_analyze(
    body: MemoryAnalyzeRequest,
    policy: str = Path(..., description="store_all | fixed_ttl | static_rules | recency_similarity"),
) -> dict:
    if policy not in POLICY_IDS:
        raise HTTPException(
            status_code=404,
            detail=f"Policy '{policy}' not found. Valid: {sorted(POLICY_IDS)}",
        )

    start = time.perf_counter()
    result = _RUNNERS[policy](body.content)
    latency_ms = (time.perf_counter() - start) * 1000

    return {
        "request_id":  str(uuid.uuid4()),
        "policy":      policy,
        "content_len": len(body.content),
        "decision":    result["decision"],
        "score":       result["score"],
        "rationale":   result["rationale"],
        "expires_at":  result.get("expires_at"),
        "is_temporal": result.get("is_temporal", False),
        "privacy_risk":result.get("privacy_risk", 0.0),
        "latency_ms":  round(latency_ms, 3),
    }
