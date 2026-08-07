"""
Unit tests — Phase 6: Baseline Policies & Research Metrics
===========================================================
Tests for api/v1/baseline.py and api/v1/research.py

Test groups:
  - TestStoreAllPolicy     (5 tests)
  - TestFixedTTLPolicy     (5 tests)
  - TestStaticRulesPolicy  (8 tests)
  - TestRecencySimilarity  (5 tests)
  - TestMetricsComputation (8 tests)
  - TestResearchHelpers    (5 tests)

Total: 36 tests
"""

from __future__ import annotations

import pytest
from datetime import datetime, timezone

# Import baseline runners directly — no AI/numpy dependency
from api.v1.baseline import (
    _run_store_all,
    _run_fixed_ttl,
    _run_static_rules,
    _run_recency_similarity,
    _RUNNERS,
    POLICIES,
    POLICY_IDS,
)

# Import only the pure helpers from research (not the FastAPI endpoints)
# _compute_metrics and TEST_CORPUS have no AI dependency
from api.v1.research import _compute_metrics, TEST_CORPUS, SingleEvalResult


# ─── Helpers ─────────────────────────────────────────────────────────────────

def make_result(
    decision: str = "STORE_LONG_TERM",
    amgs_score: float = 0.70,
    privacy_risk: float = 0.0,
    is_temporal: bool = False,
    redundancy: float = 0.0,
    latency_ms: float = 50.0,
    ground_truth: str | None = None,
    label: str | None = None,
    baselines: dict | None = None,
) -> SingleEvalResult:
    return SingleEvalResult(
        index=0,
        label=label,
        content_preview="test content",
        ground_truth=ground_truth,
        aimf={
            "decision": decision,
            "amgs_score": amgs_score,
            "confidence": 0.85,
            "latency_ms": latency_ms,
            "factors": {
                "usefulness": 0.7, "context_relevance": 0.6,
                "frequency": 0.1, "novelty": 0.8,
                "redundancy": redundancy, "privacy_risk": privacy_risk,
                "temporal_decay": 0.9 if is_temporal else 0.0,
            },
            "metadata": {
                "sensitivity": "LOW", "memory_category": "GENERAL",
                "is_temporal": is_temporal, "token_count": 10,
            },
            "rationale": "test",
        },
        baselines=baselines or {},
    )


# ─── TestStoreAllPolicy ───────────────────────────────────────────────────────

class TestStoreAllPolicy:
    def test_always_store_long_term(self):
        r = _run_store_all("any content whatsoever")
        assert r["decision"] == "STORE_LONG_TERM"

    def test_score_is_one(self):
        r = _run_store_all("hello world")
        assert r["score"] == 1.0

    def test_no_expiry(self):
        r = _run_store_all("test")
        assert r["expires_at"] is None

    def test_pii_ignored(self):
        """store_all must not reject PII — it stores everything."""
        r = _run_store_all("My SSN is 123-45-6789")
        assert r["decision"] == "STORE_LONG_TERM"

    def test_empty_like_content(self):
        r = _run_store_all("ok")
        assert r["decision"] == "STORE_LONG_TERM"
        assert r["score"] == 1.0


# ─── TestFixedTTLPolicy ───────────────────────────────────────────────────────

class TestFixedTTLPolicy:
    def test_always_store_temporary(self):
        r = _run_fixed_ttl("important knowledge")
        assert r["decision"] == "STORE_TEMPORARY"

    def test_score_is_half(self):
        r = _run_fixed_ttl("test")
        assert r["score"] == 0.50

    def test_expires_at_is_set(self):
        r = _run_fixed_ttl("test")
        assert r["expires_at"] is not None
        dt = datetime.fromisoformat(r["expires_at"].replace("Z", "+00:00"))
        assert dt > datetime.now(timezone.utc)

    def test_is_temporal_true(self):
        r = _run_fixed_ttl("anything")
        assert r["is_temporal"] is True

    def test_no_privacy_modelling(self):
        """fixed_ttl does not compute privacy risk."""
        r = _run_fixed_ttl("My password is abc")
        assert r["decision"] == "STORE_TEMPORARY"
        assert r["privacy_risk"] == 0.0


# ─── TestStaticRulesPolicy ────────────────────────────────────────────────────

class TestStaticRulesPolicy:
    def test_ssn_pattern_rejected(self):
        r = _run_static_rules("My SSN is 123-45-6789")
        assert r["decision"] == "REJECT"
        assert r["privacy_risk"] > 0.5

    def test_email_rejected(self):
        r = _run_static_rules("Contact me at user@example.com for details")
        assert r["decision"] == "REJECT"

    def test_password_keyword_rejected(self):
        r = _run_static_rules("The password for prod is abc123")
        assert r["decision"] == "REJECT"

    def test_temporal_keyword_store_temporary(self):
        r = _run_static_rules("Meeting tomorrow at 3pm in room 204")
        assert r["decision"] == "STORE_TEMPORARY"
        assert r["expires_at"] is not None

    def test_clean_technical_content(self):
        r = _run_static_rules("Binary search runs in O(log n) time complexity")
        assert r["decision"] == "STORE_LONG_TERM"
        assert r["score"] > 0.5

    def test_reject_keyword_triggers(self):
        r = _run_static_rules("delete this memory immediately")
        assert r["decision"] == "REJECT"

    def test_visa_card_pattern_rejected(self):
        r = _run_static_rules("Card number 4111111111111111 expires 12/27")
        assert r["decision"] == "REJECT"

    def test_phone_pattern_rejected(self):
        r = _run_static_rules("Call me at 555-123-4567 anytime")
        assert r["decision"] == "REJECT"


# ─── TestRecencySimilarity ────────────────────────────────────────────────────

class TestRecencySimilarity:
    def setup_method(self):
        """Clear the shared window before each test."""
        from api.v1 import baseline as b_module
        b_module._RECENT_WINDOW.clear()

    def test_first_submission_stored(self):
        r = _run_recency_similarity("Python binary search O log n implementation")
        assert r["decision"] == "STORE_LONG_TERM"

    def test_exact_duplicate_rejected(self):
        content = "Python binary search algorithm implementation tutorial"
        _run_recency_similarity(content)  # First: stored
        r = _run_recency_similarity(content)  # Second: identical → should reject
        assert r["decision"] == "REJECT"

    def test_dissimilar_content_stored(self):
        _run_recency_similarity("machine learning neural networks deep learning")
        r = _run_recency_similarity("database indexing SQL query optimization")
        assert r["decision"] == "STORE_LONG_TERM"

    def test_similarity_score_reported(self):
        content = "hello world test string"
        _run_recency_similarity(content)
        r = _run_recency_similarity(content)
        assert "similarity" in r
        assert r["similarity"] > 0.5

    def test_unique_scores_high(self):
        r = _run_recency_similarity("completely unique never seen before content about quantum physics")
        assert r["score"] > 0.5  # unique content → high score


# ─── TestMetricsComputation ───────────────────────────────────────────────────

class TestMetricsComputation:
    def test_empty_input_graceful(self):
        metrics = _compute_metrics([])
        assert metrics["n"] == 0
        assert metrics["storage_rate"] == 0.0

    def test_n_equals_input_count(self):
        results = [make_result(), make_result(), make_result()]
        m = _compute_metrics(results)
        assert m["n"] == 3

    def test_storage_rate_all_stored(self):
        results = [
            make_result(decision="STORE_LONG_TERM"),
            make_result(decision="STORE_TEMPORARY"),
            make_result(decision="STORE_ENCRYPT"),
        ]
        m = _compute_metrics(results)
        assert m["storage_rate"] == 1.0

    def test_storage_rate_mixed(self):
        results = [
            make_result(decision="STORE_LONG_TERM"),
            make_result(decision="REJECT"),
            make_result(decision="REJECT_PRIVACY"),
        ]
        m = _compute_metrics(results)
        assert abs(m["storage_rate"] - 1/3) < 0.01

    def test_privacy_protection_rate_perfect(self):
        """All high-privacy items get STORE_ENCRYPT → rate = 1.0"""
        results = [
            make_result(decision="STORE_ENCRYPT", privacy_risk=0.9),
            make_result(decision="STORE_ENCRYPT", privacy_risk=0.8),
        ]
        m = _compute_metrics(results)
        assert m["privacy_protection_rate"] == 1.0
        assert m["privacy_items_found"] == 2

    def test_temporal_accuracy_perfect(self):
        results = [
            make_result(decision="STORE_TEMPORARY", is_temporal=True),
            make_result(decision="STORE_TEMPORARY", is_temporal=True),
        ]
        m = _compute_metrics(results)
        assert m["temporal_accuracy"] == 1.0

    def test_ground_truth_accuracy(self):
        results = [
            make_result(decision="STORE_LONG_TERM", ground_truth="STORE_LONG_TERM"),
            make_result(decision="REJECT", ground_truth="STORE_LONG_TERM"),
        ]
        m = _compute_metrics(results)
        assert m["ground_truth_accuracy"] == 0.5

    def test_latency_stats_present(self):
        results = [make_result(latency_ms=100.0), make_result(latency_ms=200.0)]
        m = _compute_metrics(results)
        assert "latency_mean_ms" in m
        assert "latency_p95_ms" in m
        assert "latency_p99_ms" in m
        assert m["latency_mean_ms"] == 150.0


# ─── TestResearchHelpers ──────────────────────────────────────────────────────

class TestResearchHelpers:
    def test_policy_registry_complete(self):
        assert POLICY_IDS == {"store_all", "fixed_ttl", "static_rules", "recency_similarity"}

    def test_runners_match_policy_ids(self):
        assert set(_RUNNERS.keys()) == POLICY_IDS

    def test_policies_list_has_required_fields(self):
        for p in POLICIES:
            assert "id" in p
            assert "name" in p
            assert "description" in p

    def test_test_corpus_standard_exists(self):
        assert "standard" in TEST_CORPUS
        assert len(TEST_CORPUS["standard"]) >= 5

    def test_test_corpus_has_ground_truth(self):
        """Every standard corpus item should have a ground truth."""
        for item in TEST_CORPUS["standard"]:
            assert item.ground_truth is not None, f"Missing GT for: {item.content[:40]}"
