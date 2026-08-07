# AIMF — Functional Requirements Specification
# Phase 1, Task 1.1
# Last Updated: 2026-07-14
# Status: APPROVED — Derived from research/PHASE0_FOUNDATION.md §11

---

## OVERVIEW

This document specifies all functional requirements for the Adaptive AI Memory
Firewall (AIMF) system. Each requirement has:
  - A unique ID (FR-XX)
  - A priority level: MUST (MVP) | SHOULD (Target) | COULD (Exceptional)
  - Acceptance criteria (testable)
  - Traceability to a research contribution or hypothesis

Priority definitions:
  MUST  = Required for minimum viable demonstration and paper submission
  SHOULD = Required for target success tier
  COULD  = Required for exceptional success tier only

---

## MODULE 1: MEMORY GOVERNANCE ENGINE (Core Algorithm)

### FR-01: Memory Input Acceptance
**Priority:** MUST
**Description:** The system SHALL accept a text-based memory item (a sentence
or short passage, max 1000 characters) via API and return a governance decision.
**Acceptance Criteria:**
  - AC-01a: POST /api/v1/memory/analyze returns HTTP 200 with decision payload
  - AC-01b: Input longer than 1000 characters returns HTTP 422 with error
  - AC-01c: Empty or whitespace-only input returns HTTP 422 with error
  - AC-01d: Response time ≤ 500ms for 95th percentile of inputs (measured locally)
**Traces to:** C1 (AMGS algorithm), H1 (primary hypothesis)

---

### FR-02: Eight Governance Decision Categories
**Priority:** MUST
**Description:** The system SHALL produce exactly one of 8 governance decisions:
  1. REJECT — never store; input discarded
  2. STORE_TEMPORARY — store with expiry timestamp
  3. STORE_LONG_TERM — store without expiry
  4. SUMMARIZE_AND_STORE — compress before storage
  5. ENCRYPT_AND_STORE — encrypt due to sensitivity
  6. MERGE_WITH_EXISTING — combine with a semantically similar stored memory
  7. UPDATE_EXISTING — replace an outdated stored memory
  8. FORGET — remove a previously stored memory below decay threshold
**Acceptance Criteria:**
  - AC-02a: Every analyze response contains a `decision` field with one of the 8 values
  - AC-02b: No other decision values are ever returned
  - AC-02c: Unit tests confirm all 8 paths produce valid output
**Traces to:** C1, C2 (framework), All hypotheses

---

### FR-03: Explainable Decision Output
**Priority:** MUST
**Description:** The system SHALL generate a structured, human-readable explanation
for every governance decision, citing per-factor scores and the boundary crossed.
**Acceptance Criteria:**
  - AC-03a: Response includes `explanation` object with all 7 factor scores (U,C,F,N,R,P,D)
  - AC-03b: Response includes `explanation.rationale` string ≥ 20 characters
  - AC-03c: Response includes `explanation.decision_boundary` describing which threshold triggered
  - AC-03d: Explanation is consistent with the decision (e.g., HIGH P → ENCRYPT or REJECT)
**Traces to:** C1, C4 (evaluation methodology), SRQ-4

---

### FR-04: AMGS Score Computation
**Priority:** MUST
**Description:** The system SHALL compute a scalar Adaptive Memory Governance Score
(AMGS ∈ [0.0, 1.0]) for every input, with individual per-factor component scores.
**Acceptance Criteria:**
  - AC-04a: Response includes `amgs_score` float in range [0.0, 1.0]
  - AC-04b: Response includes `factors` object with keys: usefulness, context_relevance,
            frequency, novelty, redundancy, privacy_risk, temporal_decay
  - AC-04c: Each factor value is a float in [0.0, 1.0]
  - AC-04d: `amgs_score` is reproducible (same input → same score in deterministic mode)
**Traces to:** C1, H1, H5 (ablation)

---

## MODULE 2: INFORMATION ANALYSIS PIPELINE

### FR-05: Text Preprocessing
**Priority:** MUST
**Description:** The system SHALL preprocess input text: normalize whitespace,
detect language (flag non-English), tokenize, and extract basic metadata.
**Acceptance Criteria:**
  - AC-05a: Normalized text stored alongside original in analysis output
  - AC-05b: Non-English inputs are flagged with `language_warning: true`
  - AC-05c: Token count returned in analysis metadata
**Traces to:** C1, C2

---

### FR-06: Named Entity Recognition
**Priority:** MUST
**Description:** The system SHALL detect named entities (PERSON, ORG, DATE, TIME,
GPE, MONEY, CARDINAL, etc.) in the input using spaCy, and use entity types to
inform privacy risk and temporal detection.
**Acceptance Criteria:**
  - AC-06a: Analysis output includes `entities` list with type and text for each entity
  - AC-06b: DATE and TIME entities increase temporal detection score
  - AC-06c: PERSON entities contribute to privacy risk score
**Traces to:** C1 (P factor, D factor)

---

### FR-07: Sensitivity / Privacy Risk Analysis
**Priority:** MUST
**Description:** The system SHALL classify the privacy risk of an input on a
continuous scale [0.0, 1.0] by detecting: credential patterns (passwords, tokens,
API keys), PII (SSN, credit cards, emails, phone numbers), health information
keywords, financial information, and personal identifiers.
**Acceptance Criteria:**
  - AC-07a: Input containing "password: abc123" produces privacy_risk ≥ 0.85
  - AC-07b: Input containing "My name is John" produces privacy_risk ≥ 0.30
  - AC-07c: Input "The sky is blue" produces privacy_risk ≤ 0.10
  - AC-07d: privacy_risk is documented as a factor in the explanation
**Traces to:** C1 (P factor), H2, C3 (SIER metric)

---

### FR-08: Temporal Information Detection
**Priority:** MUST
**Description:** The system SHALL detect temporal signals (absolute dates, relative
time references, deadlines, events) and compute a temporal sensitivity score [0.0, 1.0]
that reflects how time-bounded the information's usefulness is.
**Acceptance Criteria:**
  - AC-08a: "My meeting is tomorrow at 3pm" → temporal_sensitivity ≥ 0.85
  - AC-08b: "I prefer dark mode" → temporal_sensitivity ≤ 0.15
  - AC-08c: STORE_TEMPORARY decisions always include computed `expires_at` timestamp
  - AC-08d: Grace period after event is configurable (default: 24 hours)
**Traces to:** C1 (D factor), H4, SRQ-2

---

### FR-09: Novelty Estimation
**Priority:** MUST
**Description:** The system SHALL estimate how much new information the input
provides relative to existing stored memories (novelty ∈ [0.0, 1.0]).
High novelty = genuinely new information. Low novelty = already known.
**Acceptance Criteria:**
  - AC-09a: First occurrence of a unique fact → novelty ≥ 0.70
  - AC-09b: Exact duplicate of stored memory → novelty ≤ 0.15
  - AC-09c: Novelty score decreases as semantic similarity to existing memories increases
**Traces to:** C1 (N factor), H1

---

### FR-10: Redundancy Detection
**Priority:** MUST
**Description:** The system SHALL detect semantic redundancy by computing cosine
similarity between the input embedding and all stored memory embeddings.
If similarity exceeds a configured threshold, flag as redundant.
**Acceptance Criteria:**
  - AC-10a: Paraphrase of a stored memory → redundancy ≥ 0.70
  - AC-10b: Completely unrelated input → redundancy ≤ 0.15
  - AC-10c: `similar_memories` list returned in response when redundancy ≥ 0.50
  - AC-10d: High redundancy triggers MERGE_WITH_EXISTING or UPDATE_EXISTING decision
**Traces to:** C1 (R factor), H3

---

### FR-11: Usefulness Prediction
**Priority:** MUST
**Description:** The system SHALL estimate the predicted future usefulness of an
input [0.0, 1.0] based on: information type classification, semantic signals
(facts, preferences, events, credentials), and entity richness.
**Acceptance Criteria:**
  - AC-11a: "My favorite color is blue" → usefulness ≥ 0.55 (preference)
  - AC-11b: "ok" → usefulness ≤ 0.15 (trivial)
  - AC-11c: "My blood type is A+" → usefulness ≥ 0.70 (personal fact)
  - AC-11d: Memory type classification included in response
**Traces to:** C1 (U factor), H1

---

### FR-12: Context Relevance Estimation
**Priority:** SHOULD
**Description:** The system SHALL estimate how contextually relevant an input is
to the current user session or recently submitted memories [0.0, 1.0].
**Acceptance Criteria:**
  - AC-12a: Input topically related to the last 5 submitted memories → context_relevance ≥ 0.55
  - AC-12b: Input about a completely unrelated topic → context_relevance ≤ 0.30
  - AC-12c: Context window is configurable (default: last 10 memories, last 30 minutes)
**Traces to:** C1 (C factor), SRQ-1

---

### FR-13: Model Confidence Score
**Priority:** SHOULD
**Description:** The system SHALL report a confidence score [0.0, 1.0] for the
governance decision, reflecting certainty of the factor estimates.
**Acceptance Criteria:**
  - AC-13a: Very clear cases (obvious credential, obvious trivial input) → confidence ≥ 0.85
  - AC-13b: Ambiguous inputs → confidence ≤ 0.65
  - AC-13c: Low confidence triggers a `review_recommended: true` flag in response
**Traces to:** C1 (Q factor, optional), C4

---

## MODULE 3: MEMORY STORAGE

### FR-14: Memory Persistence
**Priority:** MUST
**Description:** The system SHALL persist approved memory items (all decisions
except REJECT and FORGET) to a structured database with full metadata.
**Acceptance Criteria:**
  - AC-14a: Stored memory retrievable by ID after system restart
  - AC-14b: Stored memory includes: id, content, decision, amgs_score, factors,
            sensitivity_level, expires_at (nullable), created_at, last_accessed_at,
            access_count, embedding (binary), is_encrypted, is_active
  - AC-14c: REJECT and FORGET decisions result in no persistent record (or soft-delete)
**Traces to:** C2 (framework), FR-01

---

### FR-15: Encryption of Sensitive Memories
**Priority:** MUST
**Description:** The system SHALL encrypt memory content for ENCRYPT_AND_STORE
decisions using AES-256-GCM authenticated encryption. The encryption key SHALL
be stored in environment variables, never in source code.
**Acceptance Criteria:**
  - AC-15a: Encrypted memories stored as ciphertext + nonce + tag in database
  - AC-15b: Decrypted content returned only through authenticated API calls
  - AC-15c: Encryption key loaded from environment variable AIMF_ENCRYPTION_KEY
  - AC-15d: Direct database inspection of encrypted memory shows no plaintext
  - AC-15e: Attempt to use wrong key raises AuthenticatedEncryptionError
**Traces to:** ADR-004, C2, H2

---

### FR-16: Temporary Memory Expiry
**Priority:** MUST
**Description:** The system SHALL automatically mark STORE_TEMPORARY memories
as expired when their expiry timestamp is passed, and exclude them from active
retrieval. A background task SHALL run expiry checks on a configurable schedule.
**Acceptance Criteria:**
  - AC-16a: Expired memories do not appear in standard retrieval results
  - AC-16b: Expired memories are still accessible via admin/research endpoints
  - AC-16c: Expiry check background task runs on configurable interval (default: 1 hour)
  - AC-16d: Expiry can be extended via API before it triggers
**Traces to:** C1 (D factor), H4, SRQ-2

---

### FR-17: Memory Lifecycle Tracking
**Priority:** MUST
**Description:** The system SHALL track the complete lifecycle of every memory:
creation, last access, access count, current AMGS score (decayed), and status
(ACTIVE | EXPIRED | FORGOTTEN | ARCHIVED).
**Acceptance Criteria:**
  - AC-17a: GET /api/v1/memory/{id}/lifecycle returns full lifecycle history
  - AC-17b: Every memory access increments access_count and updates last_accessed_at
  - AC-17c: Memory status transitions are logged to lifecycle_events table
**Traces to:** C2, H3

---

## MODULE 4: SEMANTIC MEMORY MANAGEMENT

### FR-18: Sentence Embedding Generation
**Priority:** MUST
**Description:** The system SHALL generate a 384-dimensional sentence embedding
for every memory item using sentence-transformers (all-MiniLM-L6-v2) and store
it alongside the memory for vector similarity operations.
**Acceptance Criteria:**
  - AC-18a: Embedding generated synchronously during analyze call
  - AC-18b: Embedding stored as binary BLOB in database
  - AC-18c: Embedding dimension is always 384 (all-MiniLM-L6-v2 output)
**Traces to:** C2, FR-10, FR-19

---

### FR-19: Semantic Memory Retrieval
**Priority:** MUST
**Description:** The system SHALL support semantic similarity search over stored
memories using FAISS (CPU mode), returning top-K most similar memories for a
given query string.
**Acceptance Criteria:**
  - AC-19a: GET /api/v1/memory/search?q={query}&k={k} returns top-K results
  - AC-19b: Results sorted by cosine similarity (descending)
  - AC-19c: Each result includes memory content, similarity score, and metadata
  - AC-19d: Search latency ≤ 200ms for index of up to 10,000 memories (local)
**Traces to:** C2, C4 (Retrieval P@K, R@K metrics)

---

### FR-20: Memory Contradiction Detection
**Priority:** SHOULD
**Description:** The system SHALL detect when an input directly contradicts an
existing stored memory (e.g., "I live in London" vs. previously stored "I live
in Paris") and flag it for the UPDATE_EXISTING decision.
**Acceptance Criteria:**
  - AC-20a: Contradicting input triggers UPDATE_EXISTING or REJECT decision
  - AC-20b: Contradiction detected memory included in `conflicts_with` response field
  - AC-20c: Both the new and old version preserved with versioning metadata
**Traces to:** C2, SRQ-5

---

## MODULE 5: TEMPORAL DECAY ENGINE

### FR-21: Temporal Decay Computation
**Priority:** MUST
**Description:** The system SHALL implement a configurable temporal decay function
that reduces a memory's AMGS over time. The decay SHALL be applied when retrieving
or evaluating memories, reducing their effective score based on age and access history.
**Acceptance Criteria:**
  - AC-21a: Decay function is configurable: exponential (default), linear, or step
  - AC-21b: Memory created 30 days ago with no accesses has lower effective AMGS
            than a memory created today
  - AC-21c: Access events reinforce AMGS (partial reset of decay component)
**Traces to:** C1 (D factor), H4, SRQ-2

---

### FR-22: Governed Forgetting
**Priority:** MUST
**Description:** The system SHALL automatically trigger a FORGET decision for
memories whose decayed AMGS falls below a configurable forgetting threshold.
Forgotten memories are soft-deleted (marked FORGOTTEN, excluded from retrieval).
**Acceptance Criteria:**
  - AC-22a: Forgetting background task runs on configurable schedule (default: daily)
  - AC-22b: Memories with decayed AMGS < FORGET_THRESHOLD transition to FORGOTTEN status
  - AC-22c: Forgotten memories do not appear in standard retrieval
  - AC-22d: Forgetting events are logged to lifecycle_events table with reason
**Traces to:** C1 (D factor), H4, C2

---

## MODULE 6: BASELINE POLICY ENGINE

### FR-23: Baseline Policy Interface
**Priority:** MUST
**Description:** The system SHALL implement 4 baseline memory governance policies
through a standardized interface, enabling like-for-like comparison with AMGS.
Each baseline SHALL accept the same input and produce a governance decision.
**Acceptance Criteria:**
  - AC-23a: POST /api/v1/baseline/{policy}/analyze accepts same payload as main endpoint
  - AC-23b: 4 policies available: store_all | fixed_ttl | static_rules | recency_similarity
  - AC-23c: All 4 baselines operate on the same input set during experiments
**Traces to:** C4, H1

---

### FR-24: Baseline A — Store Everything
**Priority:** MUST
**Description:** Always returns STORE_LONG_TERM regardless of input content.
**Acceptance Criteria:**
  - AC-24a: Every input → STORE_LONG_TERM
  - AC-24b: No analysis performed beyond input validation
**Traces to:** C4

---

### FR-25: Baseline B — Fixed TTL
**Priority:** MUST
**Description:** Always returns STORE_TEMPORARY with a fixed TTL (configurable;
default variants: 24h, 7d, 30d).
**Acceptance Criteria:**
  - AC-25a: Every input → STORE_TEMPORARY with configured TTL
  - AC-25b: TTL configurable via query parameter (?ttl=24h | 7d | 30d)
**Traces to:** C4

---

### FR-26: Baseline C — Static Rules
**Priority:** MUST
**Description:** Applies a manually defined rule set: if input contains credential
patterns → REJECT; if temporal → STORE_TEMPORARY; else → STORE_LONG_TERM.
**Acceptance Criteria:**
  - AC-26a: Input with "password" or credit card pattern → REJECT
  - AC-26b: Input with temporal keywords (tomorrow, tonight, next week) → STORE_TEMPORARY
  - AC-26c: All other inputs → STORE_LONG_TERM
**Traces to:** C4

---

### FR-27: Baseline D — Recency + Similarity
**Priority:** MUST
**Description:** Stores if input is novel relative to recently stored memories
(cosine similarity < threshold); rejects if highly similar to a recent memory;
uses recency (time since last access) to decay older memories.
**Acceptance Criteria:**
  - AC-27a: Input with similarity > 0.85 to recent memory → REJECT (redundant)
  - AC-27b: Novel input → STORE_LONG_TERM
  - AC-27c: Old memories (>30d no access) → FORGET
**Traces to:** C4

---

## MODULE 7: API LAYER

### FR-28: REST API — Memory Operations
**Priority:** MUST
**Description:** The system SHALL expose a complete REST API for all memory operations.
**Required Endpoints:**
  POST   /api/v1/memory/analyze        — analyze input, return decision
  POST   /api/v1/memory/submit         — analyze + store approved memories
  GET    /api/v1/memory/{id}           — retrieve single memory
  GET    /api/v1/memory/search         — semantic search
  PUT    /api/v1/memory/{id}           — update memory content
  DELETE /api/v1/memory/{id}           — soft-delete (FORGET) memory
  GET    /api/v1/memory/{id}/lifecycle — lifecycle history
  GET    /api/v1/memory/              — list memories (paginated)
  GET    /api/v1/health                — health check
**Acceptance Criteria:**
  - AC-28a: All endpoints documented with OpenAPI/Swagger (auto-generated by FastAPI)
  - AC-28b: All endpoints return JSON responses
  - AC-28c: Error responses follow RFC 7807 Problem Details format
**Traces to:** C2, Phase 12

---

### FR-29: Research & Experiment API
**Priority:** SHOULD
**Description:** The system SHALL expose additional endpoints for research experiments.
**Required Endpoints:**
  GET  /api/v1/research/metrics         — current evaluation metrics
  POST /api/v1/research/experiment/run  — run comparison experiment
  GET  /api/v1/research/experiment/{id} — get experiment results
  POST /api/v1/baseline/{policy}/analyze — baseline policy analysis
  GET  /api/v1/research/ablation        — ablation study results
**Traces to:** C4, Phase 15

---

## MODULE 8: FRONTEND DASHBOARD

### FR-30: Research Demonstration Dashboard
**Priority:** MUST
**Description:** The system SHALL serve a React/TypeScript frontend dashboard
demonstrating all core AIMF capabilities for research and viva presentation.
**Required Sections:**
  1. Memory Input Lab — submit text, see live governance decision + factor scores
  2. Memory Vault — browse stored memories with status and metadata
  3. Decision Explanation View — per-memory detailed explanation
  4. Encrypted Memory View — show ciphertext for encrypted memories
  5. Temporal Memory Timeline — show STORE_TEMPORARY with countdown
  6. Algorithm Comparison — AMGS vs. all 4 baselines on same input
  7. Research Metrics Dashboard — live experiment metrics
**Acceptance Criteria:**
  - AC-30a: Dashboard accessible at http://localhost:5173 in local Docker environment
  - AC-30b: Memory Input Lab shows all 7 factor scores visually
  - AC-30c: Decision rendered with color-coded category and explanation text
**Traces to:** C2, C4, SRQ-4

---

## MODULE 9: INFRASTRUCTURE

### FR-31: Docker Local Deployment
**Priority:** MUST
**Description:** The system SHALL run completely in a local Docker Compose
environment with a single `docker-compose up` command.
**Acceptance Criteria:**
  - AC-31a: `docker-compose up` starts backend, frontend, and database
  - AC-31b: All services healthy within 60 seconds on first run
  - AC-31c: No internet connection required after images are pulled
**Traces to:** C2

---

### FR-32: Structured Logging
**Priority:** MUST
**Description:** The system SHALL emit structured JSON logs for all governance
decisions, with fields: timestamp, request_id, decision, amgs_score, latency_ms.
**Acceptance Criteria:**
  - AC-32a: Every analyze request produces one log line with all required fields
  - AC-32b: No sensitive memory content appears in log output
  - AC-32c: Log level configurable via environment variable (DEBUG/INFO/WARNING/ERROR)
**Traces to:** C2 (security), ADR-004

---

### FR-33: Experiment Result Export
**Priority:** SHOULD
**Description:** The system SHALL support exporting experiment results in JSON
and CSV formats for analysis in pandas/matplotlib.
**Acceptance Criteria:**
  - AC-33a: GET /api/v1/research/export?format=json returns full experiment results
  - AC-33b: GET /api/v1/research/export?format=csv returns CSV-formatted results
  - AC-33c: Export includes: per-memory decisions, factor scores, AMGS, ground truth labels
**Traces to:** C4, Phase 15

---

## REQUIREMENTS SUMMARY

| Priority | Count | FR IDs |
|----------|-------|--------|
| MUST     | 25    | FR-01..17, FR-18..19, FR-21..22, FR-23..27, FR-28, FR-30, FR-31, FR-32 |
| SHOULD   | 5     | FR-12, FR-13, FR-20, FR-29, FR-33 |
| COULD    | 0     | (Phase 11 adaptive weights counted as research, not FR) |

**Total Functional Requirements: 33**

---

## TRACEABILITY MATRIX (FR → Contribution)

| FR Group | FR IDs | Contribution |
|----------|--------|-------------|
| AMGS Algorithm | FR-01..04, FR-07..13 | C1 |
| Framework | FR-14..22, FR-28..32 | C2 |
| Benchmark prep | FR-23..27 | C4 |
| Evaluation metrics | FR-29, FR-33 | C4 |
| Privacy governance | FR-07, FR-15 | H2 |
| Temporal decay | FR-08, FR-16, FR-21, FR-22 | H4 |

---
_Document Owner: AIMF Architecture Team_
_Status: APPROVED — Ready for Task 1.4 (Architecture Design)_
_Last Reviewed: 2026-07-14_
