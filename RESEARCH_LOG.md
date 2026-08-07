# RESEARCH_LOG.md
# Adaptive AI Memory Firewall (AIMF)
# Research decisions, experiments, observations
# Last Updated: 2026-07-14

---

## ENTRY RL-001 — Task 0.1: Research Problem Definition
**Date:** 2026-07-14
**Phase:** 0 | **Task:** 0.1
**Type:** Problem Formulation

### Research Question Finalized
Primary: Can an adaptive multi-factor scoring algorithm make memory governance
decisions that measurably outperform naive baselines across precision, privacy,
efficiency, and retrieval quality?

### Hypotheses Registered

| ID | Hypothesis | Status |
|----|-----------|--------|
| H1 | AMGA achieves higher UMR-F1 than all 4 baselines | UNTESTED |
| H2 | Privacy factor reduces SIER without proportional recall loss | UNTESTED |
| H3 | AMGA reduces memory redundancy vs store-all and recency baselines | UNTESTED |
| H4 | Temporal decay improves retrieval precision on time-sensitive queries | UNTESTED |
| H5 | Each factor contributes independently (ablation) | UNTESTED |

### Algorithm Conceptual State

Initial formulation (CONCEPTUAL ONLY — not yet validated or implemented):

  AMGS = αU + βC + γF + δN - εR - ζP - ηD

  Where:
  U = predicted future usefulness   (range: 0..1)
  C = contextual relevance          (range: 0..1)
  F = access/recurrence frequency   (range: 0..1)
  N = novelty                       (range: 0..1)
  R = redundancy                    (range: 0..1, PENALTY)
  P = privacy risk                  (range: 0..1, PENALTY)
  D = temporal decay                (range: 0..1, PENALTY)
  α,β,γ,δ,ε,ζ,η = weights (to be determined)

  NOTE: This is a CONCEPTUAL STARTING POINT.
  - ACT-R similarity must be investigated (Task 0.2)
  - Weights must be justified or learned (Phase 11)
  - Formula may change based on evidence
  - Confidence factor Q not yet integrated
  - Threshold for each decision category not yet defined

### Risks to Research Novelty

| Risk ID | Description | Priority | Action |
|---------|-------------|----------|--------|
| NR-1 | ACT-R base-level activation overlap | HIGH | Task 0.2 |
| NR-2 | MemGPT/mem0 functional overlap | HIGH | Task 0.3 |
| NR-3 | Privacy-preserving memory overlap | MEDIUM | Task 0.2 |
| NR-4 | Existing governance benchmarks | LOW | Task 0.3 |

### Failed Experiments
None yet — pre-implementation phase.

### Observations
- The problem of memory governance is under-studied compared to memory retrieval.
- Most existing AI memory systems focus on WHAT to retrieve, not WHETHER to store.
- This asymmetry may be the core research gap to exploit.
- Privacy angle is likely strong differentiator from purely cognitive-science models.

---

## ENTRY TEMPLATE (Copy for New Entries)

## ENTRY RL-XXX — Task X.X: Title
**Date:** YYYY-MM-DD
**Phase:** X | **Task:** X.X
**Type:** [Problem Formulation / Algorithm Design / Experiment / Failure Analysis / Observation]

### Context
[What prompted this entry]

### Findings / Decision
[What was found or decided]

### Evidence
[Data, papers, code, test results]

### Impact on Project
[What changes as a result]

### Open Questions
[What remains unresolved]

---

## ENTRY RL-002 — Task 0.2: Literature Search Results
**Date:** 2026-07-14
**Phase:** 0 | **Task:** 0.2
**Type:** Literature Review

### Key Findings

**NR-1 (ACT-R) — RESOLVED:**
  ACT-R BLA uses frequency + recency only.
  AMGS adds: usefulness, context relevance, novelty, redundancy, privacy risk.
  5 of 7 AMGS factors have NO analogue in ACT-R.
  Paper must cite Anderson & Lebiere (1998) and explicitly differentiate.

**NR-2 (MemGPT/mem0) — REDUCED:**
  MemGPT: manages what is in the context window (retrieval optimization).
  mem0: storage abstraction layer (stores and retrieves facts).
  Neither scores inputs for governance worthiness before storage.
  Neither has a privacy firewall, sensitivity classification, or REJECT decision.
  These are complementary, not competing systems.

**NR-3 (Privacy literature) — RESOLVED:**
  Existing privacy work: PII redaction, pseudonymization, access control.
  None proposes continuous privacy-risk scoring as a governance factor.
  None integrates privacy risk with usefulness/novelty in a single score.
  AIMF's governance-first privacy angle is genuinely novel.

**NR-4 (Governance benchmark) — STRONGLY CONFIRMED NOVEL:**
  All existing benchmarks evaluate RETRIEVAL accuracy.
  No benchmark provides governance action labels:
    (REJECT | STORE_TEMP | STORE_LONG | SUMMARIZE | ENCRYPT | MERGE | UPDATE | FORGET)
  No benchmark measures SIER (Sensitive Information Exposure Rate).
  Contribution 3 (dataset) is the STRONGEST novelty claim.

### Algorithm Version Status
  AMGS conceptual formula unchanged, but now better differentiated:
  - Temporal decay factor D: cite Ebbinghaus curve (MemoryBank), ACT-R
  - All other factors: genuinely novel additions

### Must-Cite Papers Identified (13 total)
  1. MemGPT (arXiv:2310.08560)
  2. MemoryBank / SiliconFriend (AAAI 2024, Zhong et al.)
  3. ACT-R (Anderson & Lebiere, 1998)
  4. Memory in the Age of AI Agents (arXiv:2512.13564)
  5. From Storage to Experience Survey (arXiv:2605.06716)
  6. LongMemEval benchmark
  7. Memora / FAMA metric
  8. MemoryAgentBench (ICLR 2026)
  9. MemPrivacy (pseudonymization)
  10. OWASP GenAI Security
  11. sentence-transformers
  12. FAISS
  13. AES-GCM spec

### Research Gap Confirmed
  "No existing framework addresses pre-storage governance scoring for
  AI memory systems. AIMF is the first to define this as a distinct
  problem with a principled, multi-factor, explainable solution."

### Impact on Project
  - All 4 contributions now CONFIRMED as novel
  - AMGS formula differentiation from ACT-R is clear and defensible
  - Must cite MemoryBank and explicitly compare temporal decay approaches
  - Governance benchmark is strongest novel contribution

### Open Questions
  - Exact AMGS formula weights: still TBD (Task 5.1 / Phase 11)
  - Whether Q (confidence) should be integrated or reported separately
  - Whether to reference Ebbinghaus directly or only through MemoryBank

---

_Maintained by: AIMF Research Team_
_Protocol: Every experimental decision must be logged here before implementation_
