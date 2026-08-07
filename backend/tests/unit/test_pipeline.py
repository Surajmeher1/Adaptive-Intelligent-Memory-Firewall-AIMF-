"""
AIMF Unit Tests — AMGS Pipeline Stages
=======================================
Tests all pipeline stages that don't require ML models.

Covered:
  PT-01: Preprocessor — normalise, hash, token count
  PT-02: Privacy Analyzer — PII pattern detection
  PT-03: Temporal Detector — signal detection + D factor
  PT-04: Usefulness Predictor — score calculation
  PT-05: AMGS Engine — weighted formula
  PT-06: Decision Engine — 8-way decision tree
  PT-07: Explainer — rationale generation
  PT-08: PipelineContext — helpers
"""

from __future__ import annotations

import math
import pytest
from ai.pipeline import PipelineContext
from ai.pipeline.stages import preprocessor, privacy_analyzer, temporal_detector, usefulness_predictor
from ai import amgs_engine, decision_engine, explainer


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_ctx(content: str = "Hello world") -> PipelineContext:
    """Create a context with preprocessor already run."""
    ctx = PipelineContext(raw_content=content, session_id=None)
    preprocessor.run(ctx)
    return ctx


def full_ctx(
    usefulness=0.5, context=0.5, frequency=0.0,
    novelty=0.5, redundancy=0.0, privacy=0.0, decay=0.0,
    decision="",
) -> PipelineContext:
    """Create a PipelineContext with all factor scores preset."""
    ctx = PipelineContext(raw_content="test", session_id=None)
    ctx.normalised_content = "test"
    ctx.usefulness = usefulness
    ctx.context_relevance = context
    ctx.frequency = frequency
    ctx.novelty = novelty
    ctx.redundancy = redundancy
    ctx.privacy_risk = privacy
    ctx.temporal_decay = decay
    ctx.decision = decision
    return ctx


# ─── PT-01: Preprocessor ──────────────────────────────────────────────────────

class TestPreprocessor:
    def test_normalises_whitespace(self):
        """PT-01a: Multiple spaces collapsed to single space."""
        ctx = PipelineContext(raw_content="hello   world\n\ttest", session_id=None)
        preprocessor.run(ctx)
        assert ctx.normalised_content == "hello world test"

    def test_hash_is_sha256_hex(self):
        """PT-01b: Content hash is 64-char hex string."""
        ctx = make_ctx("fixed content")
        assert len(ctx.content_hash) == 64
        assert all(c in "0123456789abcdef" for c in ctx.content_hash)

    def test_same_content_same_hash(self):
        """PT-01c: Deterministic hash."""
        ctx1 = make_ctx("hello world")
        ctx2 = make_ctx("hello world")
        assert ctx1.content_hash == ctx2.content_hash

    def test_different_content_different_hash(self):
        """PT-01c: Different content → different hash."""
        ctx1 = make_ctx("hello world")
        ctx2 = make_ctx("hello earth")
        assert ctx1.content_hash != ctx2.content_hash

    def test_token_count(self):
        """PT-01d: Word count is accurate."""
        ctx = make_ctx("one two three four five")
        assert ctx.token_count == 5

    def test_empty_content_records_error(self):
        """PT-01e: Empty string → error recorded, graceful handling."""
        ctx = PipelineContext(raw_content="   ", session_id=None)
        preprocessor.run(ctx)
        assert len(ctx.stage_errors) > 0
        assert ctx.token_count == 0

    def test_long_content_truncated(self):
        """PT-01f: Content over 10,000 chars is truncated."""
        ctx = PipelineContext(raw_content="x" * 15_000, session_id=None)
        preprocessor.run(ctx)
        assert len(ctx.normalised_content) <= 10_000
        assert any("truncat" in e.lower() for e in ctx.stage_errors)


# ─── PT-02: Privacy Analyzer ─────────────────────────────────────────────────

class TestPrivacyAnalyzer:
    def test_email_detected(self):
        """PT-02a: Email address → medium privacy risk."""
        ctx = make_ctx("Contact me at john.doe@example.com please")
        privacy_analyzer.run(ctx)
        assert ctx.privacy_risk >= 0.30
        assert "EMAIL" in ctx.privacy_patterns

    def test_credit_card_detected(self):
        """PT-02b: Credit card number → high privacy risk."""
        ctx = make_ctx("My Visa is 4111111111111111 expires 12/25")
        privacy_analyzer.run(ctx)
        assert ctx.privacy_risk >= 0.60
        assert "CREDIT_CARD" in ctx.privacy_patterns

    def test_ssn_detected_critical(self):
        """PT-02c: SSN → critical privacy risk."""
        ctx = make_ctx("My SSN is 123-45-6789")
        privacy_analyzer.run(ctx)
        assert ctx.privacy_risk >= 0.80
        assert ctx.sensitivity == "CRITICAL"

    def test_no_pii_low_risk(self):
        """PT-02d: Neutral content → low privacy risk."""
        ctx = make_ctx("Python is a great programming language for data science")
        privacy_analyzer.run(ctx)
        assert ctx.privacy_risk < 0.40
        assert ctx.sensitivity == "LOW"

    def test_privacy_risk_caps_at_1(self):
        """PT-02e: Multiple PII → capped at 1.0."""
        ctx = make_ctx(
            "SSN: 123-45-6789, email: x@x.com, "
            "CC: 4111111111111111, password=secret123"
        )
        privacy_analyzer.run(ctx)
        assert ctx.privacy_risk <= 1.0

    def test_pattern_names_not_content(self):
        """PT-02f: NFR-08 — only pattern names stored, never matched text."""
        ctx = make_ctx("My email is test@test.com")
        privacy_analyzer.run(ctx)
        for pattern in ctx.privacy_patterns:
            assert "@" not in pattern
            assert "test" not in pattern.lower()


# ─── PT-03: Temporal Detector ─────────────────────────────────────────────────

class TestTemporalDetector:
    def test_tomorrow_high_decay(self):
        """PT-03a: 'tomorrow' → high D factor."""
        ctx = make_ctx("The meeting is tomorrow at 3pm")
        temporal_detector.run(ctx)
        assert ctx.temporal_decay >= 0.80
        assert ctx.is_temporal is True
        assert ctx.expires_at is not None

    def test_permanent_content_no_decay(self):
        """PT-03b: Timeless content → D ≈ 0."""
        ctx = make_ctx("Binary search runs in O(log n) time complexity")
        temporal_detector.run(ctx)
        assert ctx.temporal_decay < 0.20
        assert ctx.is_temporal is False
        assert ctx.expires_at is None

    def test_today_sets_short_lifetime(self):
        """PT-03c: 'today' → SHORT usefulness lifetime."""
        ctx = make_ctx("Today I had a great meeting with the team")
        temporal_detector.run(ctx)
        assert ctx.usefulness_lifetime == "SHORT"

    def test_next_week_medium_decay(self):
        """PT-03d: 'next week' → medium D factor."""
        ctx = make_ctx("The project is due next week on Friday")
        temporal_detector.run(ctx)
        assert 0.40 <= ctx.temporal_decay <= 0.80

    def test_decay_is_capped(self):
        """PT-03e: D factor never exceeds 1.0."""
        ctx = make_ctx("today tonight this morning tomorrow at 3pm deadline in 2 hours")
        temporal_detector.run(ctx)
        assert ctx.temporal_decay <= 1.0


# ─── PT-04: Usefulness Predictor ─────────────────────────────────────────────

class TestUsefulnessPredictor:
    def test_substantive_technical_content_high_usefulness(self):
        """PT-04a: Technical how-to → high usefulness."""
        ctx = make_ctx(
            "How to implement a binary search tree in Python. "
            "def insert(node, key): if node is None: return Node(key) "
            "if key < node.val: node.left = insert(node.left, key)"
        )
        usefulness_predictor.run(ctx)
        assert ctx.usefulness >= 0.60

    def test_very_short_content_low_usefulness(self):
        """PT-04b: Very short content → low usefulness."""
        ctx = make_ctx("ok")
        usefulness_predictor.run(ctx)
        assert ctx.usefulness < 0.50

    def test_high_privacy_reduces_usefulness(self):
        """PT-04c: High privacy risk penalises usefulness."""
        ctx = make_ctx("Credit card 4111111111111111 for John Doe")
        ctx.privacy_risk = 0.75  # preset
        usefulness_predictor.run(ctx)
        base_ctx = make_ctx("Credit card 4111111111111111 for John Doe")
        base_ctx.privacy_risk = 0.0
        usefulness_predictor.run(base_ctx)
        assert ctx.usefulness < base_ctx.usefulness

    def test_usefulness_clipped_to_range(self):
        """PT-04d: Always in [0.05, 0.95]."""
        for content in ["ok", "x" * 5_000, "How to implement everything in 500 words " * 20]:
            ctx = make_ctx(content)
            usefulness_predictor.run(ctx)
            assert 0.05 <= ctx.usefulness <= 0.95


# ─── PT-05: AMGS Engine ───────────────────────────────────────────────────────

class TestAMGSEngine:
    def test_high_factors_high_score(self):
        """PT-05a: High positive factors → high AMGS."""
        ctx = full_ctx(usefulness=0.9, context=0.8, frequency=0.7, novelty=0.9)
        amgs_engine.compute(ctx)
        assert ctx.amgs_score >= 0.60

    def test_high_privacy_lowers_score(self):
        """PT-05b: High privacy risk → lower AMGS."""
        ctx_clean = full_ctx(usefulness=0.7, privacy=0.0)
        ctx_priv  = full_ctx(usefulness=0.7, privacy=0.9)
        amgs_engine.compute(ctx_clean)
        amgs_engine.compute(ctx_priv)
        assert ctx_priv.amgs_score < ctx_clean.amgs_score

    def test_score_clipped_to_0_1(self):
        """PT-05c: Score never < 0 or > 1."""
        ctx1 = full_ctx(usefulness=1.0, context=1.0, frequency=1.0, novelty=1.0)
        ctx2 = full_ctx(redundancy=1.0, privacy=1.0, decay=1.0)
        amgs_engine.compute(ctx1)
        amgs_engine.compute(ctx2)
        assert 0.0 <= ctx1.amgs_score <= 1.0
        assert 0.0 <= ctx2.amgs_score <= 1.0

    def test_dominant_factor_is_string(self):
        """PT-05d: Dominant factor is always a non-empty string."""
        ctx = full_ctx(usefulness=0.9)
        amgs_engine.compute(ctx)
        assert isinstance(ctx.dominant_factor, str)
        assert len(ctx.dominant_factor) > 0


# ─── PT-06: Decision Engine ───────────────────────────────────────────────────

class TestDecisionEngine:
    def test_critical_privacy_reject(self):
        """PT-06a: Privacy risk >= 0.95 → REJECT_PRIVACY."""
        ctx = full_ctx(privacy=0.96, usefulness=0.9)
        ctx.amgs_score = 0.80  # even with high AMGS
        decision_engine.decide(ctx)
        assert ctx.decision == "REJECT_PRIVACY"

    def test_very_low_score_reject(self):
        """PT-06b: AMGS < 0.15 → REJECT."""
        ctx = full_ctx()
        ctx.amgs_score = 0.10
        decision_engine.decide(ctx)
        assert ctx.decision == "REJECT"

    def test_high_score_long_term(self):
        """PT-06c: AMGS >= 0.75 → STORE_LONG_TERM."""
        ctx = full_ctx()
        ctx.amgs_score = 0.85
        ctx.is_temporal = False
        ctx.privacy_risk = 0.1
        decision_engine.decide(ctx)
        assert ctx.decision == "STORE_LONG_TERM"

    def test_temporal_store_temporary(self):
        """PT-06d: AMGS in store range + temporal → STORE_TEMPORARY."""
        ctx = full_ctx()
        ctx.amgs_score = 0.60
        ctx.is_temporal = True
        ctx.expires_at = "2026-07-23T12:00:00+00:00"
        ctx.privacy_risk = 0.1
        decision_engine.decide(ctx)
        assert ctx.decision == "STORE_TEMPORARY"

    def test_border_summarize(self):
        """PT-06e: AMGS in [0.30, 0.50) → SUMMARIZE."""
        ctx = full_ctx()
        ctx.amgs_score = 0.40
        ctx.is_temporal = False
        ctx.privacy_risk = 0.1
        decision_engine.decide(ctx)
        assert ctx.decision == "SUMMARIZE"

    def test_encrypt_when_high_privacy(self):
        """PT-06f: AMGS >= store AND privacy >= encrypt threshold → STORE_ENCRYPT."""
        ctx = full_ctx(privacy=0.86)
        ctx.amgs_score = 0.60
        ctx.is_temporal = False
        decision_engine.decide(ctx)
        assert ctx.decision == "STORE_ENCRYPT"

    def test_error_defaults_to_reject(self):
        """PT-06g: Any error → REJECT (fail-safe)."""
        ctx = PipelineContext(raw_content="test", session_id=None)
        ctx.amgs_score = float("nan")  # causes error
        decision_engine.decide(ctx)
        assert ctx.decision == "REJECT"


# ─── PT-07: Explainer ─────────────────────────────────────────────────────────

class TestExplainer:
    def test_rationale_is_non_empty(self):
        """PT-07a: Every decision produces a non-empty rationale."""
        for decision in ["STORE_LONG_TERM", "REJECT", "REJECT_PRIVACY",
                         "STORE_ENCRYPT", "STORE_TEMPORARY", "SUMMARIZE", "STORE"]:
            ctx = full_ctx(decision=decision)
            ctx.amgs_score = 0.5
            ctx.privacy_risk = 0.0
            ctx.expires_at = "2026-07-23T00:00:00+00:00"
            ctx.dominant_factor = "Usefulness"
            ctx.privacy_patterns = []
            explainer.explain(ctx)
            assert len(ctx.rationale) > 10, f"Empty rationale for {decision}"

    def test_reject_privacy_mentions_risk(self):
        """PT-07b: REJECT_PRIVACY rationale mentions 'privacy'."""
        ctx = full_ctx(decision="REJECT_PRIVACY", privacy=0.96)
        ctx.amgs_score = 0.5
        ctx.privacy_patterns = ["SSN_US"]
        ctx.dominant_factor = "PrivacyRisk"
        ctx.expires_at = None
        explainer.explain(ctx)
        assert "privacy" in ctx.rationale.lower() or "Privacy" in ctx.rationale


# ─── PT-08: PipelineContext helpers ───────────────────────────────────────────

class TestPipelineContext:
    def test_factor_scores_dict(self):
        """PT-08a: factor_scores() returns all 7 factors."""
        ctx = full_ctx()
        scores = ctx.factor_scores()
        assert set(scores.keys()) == {
            "usefulness", "context_relevance", "frequency",
            "novelty", "redundancy", "privacy_risk", "temporal_decay",
        }

    def test_record_error_sets_review_flag(self):
        """PT-08b: record_error → review_recommended = True."""
        ctx = PipelineContext(raw_content="x", session_id=None)
        assert ctx.review_recommended is False
        ctx.record_error("TestStage", "something failed")
        assert ctx.review_recommended is True
        assert len(ctx.stage_errors) == 1

    def test_is_complete(self):
        """PT-08c: is_complete() requires decision to be set."""
        ctx = PipelineContext(raw_content="x", session_id=None)
        assert ctx.is_complete() is False
        ctx.decision = "STORE"
        assert ctx.is_complete() is True
