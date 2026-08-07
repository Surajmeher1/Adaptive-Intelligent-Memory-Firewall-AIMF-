# AIMF — Phase 0, Task 0.6: Research Foundation Document
# Adaptive AI Memory Firewall (AIMF)
# Last Updated: 2026-07-14
# Status: FINAL — Phase 0 Complete
# Compiled From: Tasks 0.1, 0.2, 0.3, 0.4, 0.5

---

## ⚑ PHASE 0 STATUS: COMPLETE
## ⚑ GO/NO-GO DECISION: GO — Phase 1 (Architecture) Authorized

All novelty risks resolved. All contributions confirmed. Research gap
clearly identified and documented. Proceed to Phase 1.

---

## SECTION 1: PROJECT IDENTITY

**Full Title:**
  Adaptive AI Memory Firewall (AIMF): A Context-Aware Privacy-Preserving
  Memory Management Framework for Intelligent Systems

**Acronym:** AIMF

**Category:** B.Tech CSE Final-Year Research Project

**Research Domain:** Artificial Intelligence / NLP / Privacy Engineering

**Target Venues (in priority order):**
  1. IEEE conferences (ICSESS, ICCAI, SMART, ICICI)
  2. Scopus-indexed conferences in AI/NLP/Security
  3. IEEE Access (journal, if timeline permits)

**Key Differentiator (One Sentence):**
  AIMF is the first value-based pre-storage governance framework for AI memory
  systems — it decides WHETHER and HOW to store information before any storage
  system receives it, using a principled multi-factor scoring algorithm.

---

## SECTION 2: FINAL RESEARCH QUESTION

### Primary Research Question (PRQ)
Can an adaptive, multi-factor scoring algorithm — integrating predicted future
usefulness (U), contextual relevance (C), recurrence frequency (F), novelty (N),
redundancy (R), privacy risk (P), and temporal decay (D) — make AI memory
governance decisions that measurably outperform naive baselines across the
metrics of retention quality (UMR-F1), privacy protection (SIER), storage
efficiency (MRR), and retrieval quality (P@K / R@K)?

### Supporting Research Questions (Final)
SRQ-1: Which factors in the AMGS most strongly predict correct governance
        decisions? (Ablation study — Phase 11)
SRQ-2: How does temporal decay interact with recurrence frequency to determine
        optimal memory lifespan? (Phase 7 experiments)
SRQ-3: At what privacy-risk threshold is encryption preferable to plain
        storage? (Phase 6 privacy evaluation)
SRQ-4: Does providing an explainable governance decision improve user
        understanding vs. opaque policies? (Phase 13 frontend, optional study)
SRQ-5: How should contradictory or outdated memories be handled?
        (Phase 8 semantic memory management)

---

## SECTION 3: FINAL HYPOTHESES

| ID | Hypothesis | Status |
|----|-----------|--------|
| H1 | AMGA achieves higher UMR-F1 than all 4 baselines on benchmark | UNTESTED |
| H2 | Privacy factor reduces SIER without proportional recall loss | UNTESTED |
| H3 | AMGA reduces memory redundancy rate vs. store-all and recency baselines | UNTESTED |
| H4 | Temporal decay improves retrieval precision on time-sensitive queries | UNTESTED |
| H5 | Removing any single factor independently degrades at least one primary metric | UNTESTED |

All hypotheses are registered. None are to be modified without a RESEARCH_LOG entry.
All hypotheses remain UNTESTED until Phase 15 (Experiments).

---

## SECTION 4: CONFIRMED RESEARCH CONTRIBUTIONS

All 4 contributions confirmed as NOVEL by Tasks 0.2, 0.3, 0.4 audits.

### Contribution 1: AMGS Algorithm (Confidence: VERY HIGH)
The Adaptive Memory Governance Score — a multi-factor weighted scoring function:
  AMGS = αU + βC + γF + δN − εR − ζP − ηD   (conceptual v0; subject to refinement)

Where:
  U = predicted future usefulness      (range: 0..1)
  C = contextual relevance             (range: 0..1)
  F = recurrence frequency             (range: 0..1)
  N = novelty / information gain       (range: 0..1)
  R = redundancy                       (range: 0..1, PENALTY)
  P = privacy risk                     (range: 0..1, PENALTY)
  D = temporal decay                   (range: 0..1, PENALTY)
  α, β, γ, δ, ε, ζ, η = weights (hand-tuned in v1; optimized in Phase 11)

Novel because: No existing system combines all 7 factors. Privacy (P) and
usefulness (U) together in a governance context have no prior art.
Citation strategy: Cite ACT-R for F+D inspiration; differentiate on all other factors.

### Contribution 2: AIMF Framework (Confidence: VERY HIGH)
Open-source modular framework implementing AMGS with:
  - 8-category governance decisions
  - Sensitivity-aware encryption/rejection
  - Semantic deduplication and merge
  - Temporal decay and forgetting engine
  - Explainable decision output
  - REST API and research dashboard
  
Novel because: No existing framework addresses pre-storage value governance.

### Contribution 3: AIMF Governance Benchmark Dataset (Confidence: VERY HIGH)
First labeled benchmark for memory governance evaluation. Labels include:
  - recommended_action: REJECT | STORE_TEMP | STORE_LONG | SUMMARIZE |
                        ENCRYPT | MERGE | UPDATE | FORGET
  - sensitivity_level: LOW | MEDIUM | HIGH | CRITICAL
  - usefulness_lifetime: EPHEMERAL | SHORT | MEDIUM | LONG | PERMANENT
  - memory_category: 13 categories (temporal, credential, preference, etc.)

Novel because: All existing benchmarks (LoCoMo, LongMemEval, MemoryAgentBench,
Memora) evaluate RETRIEVAL accuracy only. No governance-labeled benchmark exists.
This is the single strongest novelty claim.

### Contribution 4: Evaluation Methodology (Confidence: HIGH)
Standardized evaluation protocol including:
  - UMR-F1 (Useful Memory Retention F1) — primary metric
  - SIER (Sensitive Information Exposure Rate) — privacy metric
  - MRR (Memory Redundancy Rate) — efficiency metric
  - Decision Latency — operational metric
  - Ablation framework for AMGS factor contribution

Novel because: No prior work defines governance-specific metrics or baseline
comparison protocol for memory management policy evaluation.

---

## SECTION 5: RESEARCH GAP (FINAL STATEMENT FOR PAPER)

"Despite substantial advances in AI memory retrieval — through vector stores,
knowledge graphs, and hierarchical context management — the pre-storage governance
problem remains unaddressed. Existing frameworks [MemGPT, mem0, Zep, LangChain]
optimize retrieval efficiency, assuming all inputs are worth storing. Privacy tools
[MemPrivacy, AMP] apply redaction but do not assess whether retention itself is
warranted. Security tools [Audrey, mguard, ShieldCortex] protect against adversarial
attacks but not against the subtler harms of retaining low-value, redundant, or
sensitive information that was not maliciously injected. Cognitive science models
(ACT-R, Ebbinghaus forgetting curve) provide inspiration for memory dynamics but
are descriptive models of human cognition, not prescriptive governance frameworks.

No existing system implements a principled, adaptive, multi-factor scoring function
that decides — for each incoming memory item — whether it should be accepted,
rejected, encrypted, temporarily held, or merged with existing knowledge. Furthermore,
no labeled benchmark exists for evaluating such governance decisions.

This paper addresses both gaps."

---

## SECTION 6: SCOPE (FINAL)

### IN SCOPE
  ✓ Text-based memory items (sentences, short passages, statements, preferences)
  ✓ English language only (v1)
  ✓ Single-user memory context
  ✓ 8 governance decisions with explainable output
  ✓ Synthetic + public benchmark dataset
  ✓ Local Docker-based deployment
  ✓ 4 baseline comparisons
  ✓ Ablation study of AMGS factors
  ✓ Full backend API + research frontend

### OUT OF SCOPE
  ✗ Multimodal inputs (images, audio, video)
  ✗ Multi-user or federated memory
  ✗ Languages other than English
  ✗ Production-scale deployment (load balancing, HA)
  ✗ Full LLM training or fine-tuning
  ✗ Adversarial security attacks
  ✗ Legal compliance certification (GDPR/HIPAA — architectural alignment only)
  ✗ Real-time streaming data

---

## SECTION 7: LIMITATIONS (TO REPORT IN PAPER)

L-1: AMGS weights are initially hand-tuned (α, β, γ, δ, ε, ζ, η).
     Phase 11 will optimize; report both v1 and v2.

L-2: Benchmark dataset is synthetic + public, not real-world user memory.
     Reduces ecological validity. Mitigate by diverse category coverage.

L-3: English-only limits generalizability to multilingual systems.

L-4: Single-user system; multi-user memory sharing not evaluated.

L-5: Privacy risk scoring is heuristic (rule + ML hybrid), not certified.
     Not a substitute for formal privacy engineering (DP, GDPR compliance).

L-6: Forgetting is governed but irreversible. Deleted memories are gone.
     "Soft delete" (archive) may be preferable in some contexts.

---

## SECTION 8: MUST-CITE REFERENCES (17 Papers)

| # | Reference | Reason to Cite |
|---|-----------|----------------|
| 1 | Packer et al. (2023) MemGPT arXiv:2310.08560 | Related system — context paging |
| 2 | Zhong et al. (2023/2024) MemoryBank AAAI 2024 | Related system — Ebbinghaus decay |
| 3 | Anderson & Lebiere (1998) ACT-R book | Theoretical foundation — B+L activation |
| 4 | arXiv:2512.13564 Memory in the Age of AI Agents | Memory survey |
| 5 | arXiv:2605.06716 From Storage to Experience | Memory survey |
| 6 | LongMemEval benchmark (OpenReview) | Related benchmark |
| 7 | Memora / FAMA metric (arXiv) | Related benchmark — forgetting metric |
| 8 | MemoryAgentBench ICLR 2026 | Related benchmark |
| 9 | MemPrivacy paper (arXiv) | Related privacy work |
| 10 | OWASP GenAI Security Project | Privacy threat taxonomy |
| 11 | Reimers & Gurevych (2019) sentence-BERT | Embedding model |
| 12 | Johnson et al. (2019) FAISS | Vector retrieval |
| 13 | Zep / Graphiti (getzep.com technical docs) | Related system — temporal graph |
| 14 | LangChain Memory docs | Baseline system |
| 15 | NIST AES-GCM spec (FIPS 197) | Encryption standard |
| 16 | Ebbinghaus (1885) Memory monograph | Forgetting curve origin |
| 17 | mem0 GitHub documentation | Related system |

NOTE: References 1, 2, 3, 6, 7, 11, 12, 16 are verified publications.
References 4, 5, 8, 9 are arXiv preprints — verify publication status before submission.
All references must be verified with correct DOI/URL before paper submission.
DO NOT cite any reference not verified in this document.

---

## SECTION 9: TECHNOLOGY STACK (CONFIRMED FOR PHASE 1)

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Backend | Python 3.11+, FastAPI | Async, type-safe, production-grade |
| ORM | SQLAlchemy + Alembic | Mature, tested, supports SQLite→PG migration |
| Database (dev) | SQLite | Zero-config for local development |
| Database (prod) | PostgreSQL | Production-grade, JSON support |
| NLP | spaCy (en_core_web_sm) | Entity detection, dependency parsing |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | Fast, free, good quality |
| Vector Store | FAISS (CPU) | Free, offline, sufficient for research scale |
| ML | scikit-learn | Classifiers, metrics, calibration |
| Encryption | Python cryptography library (AES-256-GCM) | Authenticated encryption |
| Frontend | React + TypeScript + Vite | Fast dev server, strong typing |
| CSS | Tailwind CSS | Rapid UI development |
| Testing | pytest + httpx | Standard Python testing |
| Containers | Docker + Docker Compose | Reproducible environment |
| Experiment logging | pandas + matplotlib + JSON files | No external dependency needed |

---

## SECTION 10: PHASE 1 ENTRY CRITERIA

All must be TRUE before Phase 1 begins:

  [x] Research problem formally defined (Task 0.1)
  [x] Literature search complete — all novelty risks resolved (Task 0.2)
  [x] All competing systems audited — no functional overlap with AMGS (Task 0.3)
  [x] Similarity matrix produced — AIMF features confirmed unique (Task 0.4)
  [x] Research gap formally stated — 5 enumerated gaps (Task 0.5)
  [x] Research foundation document compiled (Task 0.6 — this document)
  [x] All 4 contributions confirmed as novel
  [x] Technology stack decided
  [x] Success criteria defined
  [x] Scope boundaries documented

  → PHASE 0 COMPLETE: ALL CRITERIA MET
  → PROCEED TO PHASE 1: Requirements and Architecture

---

## SECTION 11: PHASE 1 FIRST ACTION

Phase 1, Task 1.1: Define Functional Requirements

The system must support the following functional capabilities:
(Confirmed requirements derived from research problem):

FR-01: Accept a text input and return a governance decision within 500ms
FR-02: Produce one of 8 governance decisions per input
FR-03: Generate a per-factor explanation for every governance decision
FR-04: Compute AMGS score (0.0 to 1.0) with per-factor component breakdown
FR-05: Store approved memories in structured database
FR-06: Encrypt memories classified as HIGH/CRITICAL sensitivity
FR-07: Set expiry timestamps for STORE_TEMPORARY decisions
FR-08: Detect semantic similarity to existing memories (redundancy detection)
FR-09: Support manual memory retrieval by semantic query
FR-10: Support memory lifecycle: create → store → decay → forget
FR-11: Support baseline comparison (4 baseline policies)
FR-12: Expose REST API for all memory operations
FR-13: Serve a research dashboard (React frontend)
FR-14: Export experiment results in JSON/CSV format
FR-15: Run fully in local Docker environment

---

## SECTION 12: SUMMARY OF PHASE 0 OUTPUTS

| Task | Output File | Status |
|------|-------------|--------|
| 0.1 | research/PHASE0_RESEARCH_PROBLEM.md | COMPLETE |
| 0.2 | research/PHASE0_LITERATURE.md | COMPLETE |
| 0.3 | research/PHASE0_SYSTEMS_AUDIT.md | COMPLETE |
| 0.4 | research/PHASE0_SYSTEMS_AUDIT.md (§2) | COMPLETE |
| 0.5 | research/PHASE0_RESEARCH_GAP.md | COMPLETE |
| 0.6 | research/PHASE0_FOUNDATION.md (this file) | COMPLETE |

---

## SECTION 13: ARCHITECTURAL DECISIONS MADE IN PHASE 0

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-001 | Primary metric = UMR-F1 | ACCEPTED |
| ADR-002 | Text-only, English-only, single-user for v1 | ACCEPTED |
| ADR-003 | Synthetic + public benchmark dataset | ACCEPTED |
| ADR-004 | AIMF = value governance, not security firewall | ACCEPTED |

---

## PHASE 0 SIGN-OFF

All Phase 0 tasks complete.
Research gap identified, documented, and defensible.
All novelty claims verified against literature and existing systems.
Technology stack confirmed.
Phase 1 authorized.

Date: 2026-07-14
Status: PHASE 0 — COMPLETE ✓

---
_Next: Phase 1, Task 1.1 — Define Functional Requirements_
