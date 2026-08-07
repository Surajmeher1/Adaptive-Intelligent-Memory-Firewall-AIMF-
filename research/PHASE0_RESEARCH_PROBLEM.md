# AIMF — Phase 0, Task 0.1: Research Problem Definition
# Last Updated: 2026-07-14
# Status: DRAFT — Awaiting literature verification in Task 0.2

---

## 1. REFINED PROBLEM STATEMENT

Modern AI-powered systems — including conversational agents, personal assistants,
recommendation engines, and autonomous agents — accumulate information across
interactions. This information is heterogeneous:

  - Some is permanently useful (a user's name, long-term preferences)
  - Some is transiently useful (a meeting in two hours)
  - Some is highly sensitive (passwords, health conditions)
  - Some is redundant (repetitions of already-known facts)
  - Some is actively harmful to retain (outdated or contradictory beliefs)

Despite this diversity, the overwhelming majority of AI memory systems apply one
of two naive policies:

  (a) Store everything indefinitely — maximizing recall at the cost of privacy
      and efficiency.
  (b) Apply a fixed time-to-live — losing valuable memories arbitrarily.

Neither policy is principled. Neither accounts for future utility, privacy risk,
temporal sensitivity, contextual relevance, semantic redundancy, or confidence
in the stored information.

The result is that intelligent systems either:
  - Accumulate sensitive data they should never have retained, creating
    privacy and security vulnerabilities.
  - Forget information that a user reasonably expected to be remembered.
  - Retrieve semantically redundant or contradictory information, degrading
    response quality.
  - Have no explainable rationale for what was retained or discarded.

**This project addresses the absence of a principled, adaptive, explainable, and
privacy-aware memory governance framework for intelligent AI systems.**

---

## 2. TARGET USE CASES

### Primary Use Case
An AI personal assistant that processes natural language inputs (statements,
facts, tasks, instructions, preferences) and must decide — in real time —
whether each input should be stored, how it should be stored, for how long,
and under what protection level.

### Secondary Use Cases (In Scope)
The framework is designed to generalize to:
  - Conversational AI agents (chatbots, LLM-based assistants)
  - Autonomous agent long-term planning systems
  - AI-powered knowledge management tools
  - Privacy-sensitive recommendation systems

### Out of Scope (Explicit Exclusions)
The project does NOT attempt to:
  - Build a general-purpose vector database
  - Replicate a production LLM system (GPT, Claude, etc.)
  - Solve the full AI alignment or memory problem
  - Create a commercial product
  - Handle multimodal memory (images, audio) — text only in v1
  - Replace cryptographic standards — only apply them correctly
  - Perform adversarial machine learning attacks
  - Build a distributed or federated memory system

---

## 3. CORE RESEARCH QUESTION

### Primary Research Question (PRQ)

Can an adaptive, multi-factor scoring algorithm — integrating predicted future
usefulness, contextual relevance, recurrence frequency, novelty, redundancy,
privacy risk, temporal decay, and model confidence — make memory governance
decisions that measurably outperform naive baselines (store-all, fixed-TTL,
static rules, recency-similarity) across metrics of retention precision,
privacy protection, storage efficiency, and retrieval quality?

### Supporting Research Questions (SRQ)

SRQ-1: Which factors most strongly predict whether a memory item should be
        retained long-term versus discarded?
        [Target: Ablation study in Phase 11]

SRQ-2: How does temporal decay interact with recurrence frequency to determine
        optimal memory lifespan?
        [Target: Phase 7 temporal experiments]

SRQ-3: At what privacy-risk threshold does encryption or rejection become
        preferable to plain storage, and can this threshold be data-driven?
        [Target: Phase 6 privacy evaluation]

SRQ-4: Does providing a decision explanation for memory governance improve
        user understanding compared to opaque retention policies?
        [Target: Phase 13 frontend design + possible user study]

SRQ-5: How should contradictory or outdated memories be handled — rejection,
        replacement, or co-retention with confidence weighting?
        [Target: Phase 8 semantic memory management]

---

## 4. INITIAL HYPOTHESES

H1 (Primary Hypothesis):
  An adaptive multi-factor memory governance algorithm (AMGA) will achieve
  higher Useful Memory Retention F1-Score than all four baseline strategies
  on a balanced benchmark dataset.

H2 (Privacy Hypothesis):
  The AMGA's privacy-risk factor will reduce Sensitive Information Exposure
  Rate (SIER) compared to store-all and fixed-TTL baselines without
  proportionally reducing useful memory recall.

H3 (Efficiency Hypothesis):
  The AMGA will achieve measurably lower memory redundancy rate compared to
  store-all and recency-based baselines, reducing storage footprint without
  significant recall loss.

H4 (Temporal Hypothesis):
  Integrating a temporal decay function into the governance score will improve
  retrieval precision on time-sensitive queries compared to static rule baselines.

H5 (Ablation Hypothesis):
  Removing any single factor from the AMGS independently degrades at least one
  primary metric, validating that each factor contributes measurable value.

NOTE: All hypotheses are subject to revision based on experimental results.
Null results will be reported and analyzed, not fabricated.

---

## 5. MEASURABLE VARIABLES

### 5.1 Independent Variable
Memory governance policy applied:
  - Baseline A: Store Everything
  - Baseline B: Fixed TTL (24h / 7d / 30d variants)
  - Baseline C: Static Rule-Based Policy
  - Baseline D: Recency + Similarity Policy
  - Proposed:   AMGA (Adaptive Memory Governance Algorithm)

### 5.2 Primary Dependent Variables

**Useful Memory Retention Precision (UMRP)**
  Of all retained memories, what fraction were genuinely useful?
  Measurement: Human-labeled benchmark dataset.

**Useful Memory Retention Recall (UMRR)**
  Of all genuinely useful memories, what fraction were retained?
  Measurement: Human-labeled benchmark dataset.

**Useful Memory Retention F1 (UMR-F1)**
  Harmonic mean of UMRP and UMRR.
  Primary ranking metric for comparing policies.

**Sensitive Information Exposure Rate (SIER)**
  Fraction of sensitive memories stored without encryption or rejection.
  Measurement: Sensitivity annotations in benchmark.

**Memory Redundancy Rate (MRR)**
  Fraction of stored memories that are semantic duplicates of another stored memory.
  Measurement: Cosine similarity threshold on sentence embeddings.

**Retrieval Precision@K / Recall@K**
  Quality of retrieval given a query.
  Measurement: Query-answer pairs in benchmark.

**Decision Latency (ms)**
  Time from input submission to governance decision output.
  Measurement: Automated timing in test suite.

**Storage Efficiency Ratio (SER)**
  Useful stored memories / total stored memories.

### 5.3 Confounding Variables (To Be Controlled)
  - Dataset composition: balanced across memory categories
  - Embedding model: fixed to one model across all experiments
  - Hardware: same machine for all timing experiments
  - Random seeds: fixed and reported for reproducibility
  - Decision thresholds: reported and held fixed for main experiments

---

## 6. POTENTIAL RESEARCH CONTRIBUTIONS

**Contribution 1 (Algorithmic) — NOVELTY: UNVERIFIED**
  Adaptive Memory Governance Score (AMGS): a multi-factor weighted scoring
  function with per-factor explainability for memory retention decisions.
  Novelty distinction from baselines: multi-dimensional integration with
  privacy-awareness, distinct from pure recency, BM25, or utility functions.
  [RISK: Must verify against ACT-R model, MemGPT, mem0 — see Task 0.2/0.3]

**Contribution 2 (Framework) — NOVELTY: HIGH CONFIDENCE**
  Open-source Memory Firewall framework implementing the AMGS with:
  multi-category memory decisions, sensitivity-aware encryption/rejection,
  semantic deduplication, temporal decay and forgetting, and retrieval.
  Frameworks are contributions even if individual algorithms overlap.

**Contribution 3 (Dataset) — NOVELTY: MEDIUM CONFIDENCE**
  First labeled benchmark dataset for memory governance evaluation, annotated
  for usefulness lifetime, sensitivity level, redundancy, and recommended action.
  [RISK: Must verify no existing benchmark — see Task 0.3]

**Contribution 4 (Evaluation Methodology) — NOVELTY: MEDIUM CONFIDENCE**
  Standardized evaluation framework including SIER and UMR-F1 metrics,
  enabling reproducible comparison of memory governance policies.

---

## 7. MAJOR NOVELTY RISKS

**Risk NR-1 (HIGH PRIORITY) — ACT-R Overlap**
  The AMGS formula may overlap with ACT-R (Adaptive Control of Thought-Rational),
  a cognitive architecture whose base-level activation equation integrates
  recency and frequency: A = ln(Σ t_i^-d).
  ACT-R is a psychological memory model; our contribution is its computational
  application in an AI privacy context, but we must clearly differentiate.
  Action: Task 0.2 must review Anderson & Lebiere (1998), ACT-R-based AI memory.

**Risk NR-2 (HIGH PRIORITY) — MemGPT / mem0 / Zep Overlap**
  MemGPT (Packer et al., 2023) uses a virtual context management system.
  mem0, Zep, and LangChain Memory implement agent memory management.
  These systems may already implement related concepts.
  Action: Task 0.3 will audit these systems for algorithmic overlap.

**Risk NR-3 (MEDIUM PRIORITY) — Privacy-Aware Memory**
  Differential privacy applied to AI memory is an active area.
  Our approach uses sensitivity classification + encryption, not DP noise.
  This distinction may constitute sufficient novelty but must be verified.
  Action: Task 0.2 will search privacy-preserving AI memory literature.

**Risk NR-4 (LOW PRIORITY) — Benchmark Dataset**
  PERSONA-CHAT, MemoryBank, and similar datasets exist for conversational memory.
  Our benchmark is governance-oriented (action labels), which is different.
  Risk is low but must be confirmed.
  Action: Task 0.3 will audit these datasets.

---

## 8. SUCCESS CRITERIA

### Minimum Success (Acceptable B.Tech Project Demonstration)
  - [ ] AMGS algorithm implemented and functional
  - [ ] At least 3 baselines implemented for comparison
  - [ ] Benchmark dataset of >= 300 annotated memory statements
  - [ ] Reproducible experiment: AMGS outperforms >= 2 baselines on UMR-F1
  - [ ] Complete IEEE-style paper draft (not necessarily published)
  - [ ] Working frontend + backend demonstration
  - [ ] Full test coverage on core algorithm modules
  - [ ] Docker-runnable local deployment

### Target Success (Strong Research Project)
  - [ ] AMGS achieves statistically significant improvement over all 4 baselines
  - [ ] SIER demonstrates measurable privacy protection improvement
  - [ ] Ablation study validates >= 3 individual AMGS factors
  - [ ] Benchmark dataset of >= 500 annotated samples
  - [ ] Inter-annotator agreement measured (Cohen's Kappa >= 0.6)
  - [ ] Paper submitted to an IEEE/Scopus-indexed venue

### Exceptional Success
  - [ ] AMGS V2 with learned adaptive weights (data-driven, not hand-tuned)
  - [ ] User study with >= 20 participants on explainability preference
  - [ ] Journal submission (IEEE Access, Expert Systems)
  - [ ] Open-source GitHub release

---

## 9. SCOPE BOUNDARIES

### IN SCOPE
  - Text-based memory items (statements, facts, preferences, events, tasks)
  - Single-user memory system
  - English language only (v1)
  - Rule-based + ML-assisted decision making
  - Sentence-level granularity
  - Local deployment (Docker-based)
  - Synthetic + public benchmark dataset

### OUT OF SCOPE
  - Real-time streaming data ingestion
  - Multi-user or federated memory
  - Multimodal inputs (images, audio, video)
  - Languages other than English (v1)
  - Full LLM training or fine-tuning
  - Production-grade deployment (scalability, load balancing)
  - Legal compliance certification (architectural alignment only)
  - Adversarial attacks against the memory system

---

## 10. DEFINITIONS

**Memory Item:** A discrete unit of information — one sentence or short passage
— submitted to the AIMF system for governance decision.

**Memory Governance:** The principled process of deciding whether and how a
memory item should be stored, protected, retained, updated, or forgotten.

**Adaptive Memory Governance Score (AMGS):** The scalar score produced by the
AIMF algorithm that drives the governance decision for a given memory item.

**Memory Firewall:** The decision boundary enforced by the AIMF system that
prevents inappropriate storage of sensitive, redundant, or low-value information.

**Temporal Decay:** The reduction in a memory item's AMGS over time as the
information ages and its expected future utility decreases.

**Forgetting:** The deliberate removal of a memory item when its AMGS falls
below a defined forgetting threshold.

**Sensitivity Level:** A categorical assessment (LOW / MEDIUM / HIGH / CRITICAL)
of the privacy risk associated with retaining a memory item in plain text.

**Decision Explanation:** A structured, human-readable justification for the
governance decision, citing per-factor scores and the decision boundary crossed.

---

## STATUS CHECKLIST

- [x] Problem statement refined
- [x] Target use cases defined
- [x] Out-of-scope explicitly documented
- [x] Primary research question formulated
- [x] Supporting research questions formulated (5 SRQs)
- [x] Initial hypotheses stated (H1–H5)
- [x] Measurable variables identified
- [x] Potential contributions listed (4 contributions)
- [x] Novelty risks identified (4 risks, priorities assigned)
- [x] Success criteria defined (3 tiers)
- [x] Scope boundaries documented
- [x] Critical terms defined (8 definitions)

PENDING:
- [ ] Literature verification (Task 0.2) — novelty claims unverified
- [ ] Contribution 1 novelty rating: UNVERIFIED until Task 0.2 complete
- [ ] ACT-R similarity analysis (Risk NR-1) — HIGH priority for Task 0.2
- [ ] MemGPT/mem0 audit (Risk NR-2) — HIGH priority for Task 0.3

---
_Document Owner: AIMF Research Team_
_Next Review: After Task 0.2 completion_
