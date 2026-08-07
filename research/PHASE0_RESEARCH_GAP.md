# AIMF — Phase 0, Task 0.5: Defensible Research Gap
# Last Updated: 2026-07-14
# Status: COMPLETE
# Input: Tasks 0.1, 0.2, 0.3, 0.4 findings

---

## 1. THE GAP IN ONE SENTENCE

**No existing AI memory system addresses the pre-storage governance problem:
deciding, through principled multi-factor scoring, whether an incoming piece
of information should be stored, how it should be protected, and for how long —
before any storage system receives it.**

---

## 2. WHAT EXISTS (EVIDENCE-BASED SUMMARY)

The current state of AI memory management can be divided into three categories:

### 2.1 Retrieval-Focused Systems
Systems that accept all inputs and optimize HOW to retrieve them later:
  - MemGPT: hierarchical paging between context and archival storage
  - mem0: vector + graph storage with scope categorization
  - Zep/Graphiti: temporal knowledge graph with deduplication
  - LangChain / LlamaIndex: pluggable memory modules for chains and agents

**These systems answer:** "Given what is stored, how do I retrieve it well?"
**They do NOT answer:** "Should this be stored? With what protection? For how long?"

### 2.2 Cognitive Science Models
Psychological models of human memory that inspire AI design:
  - ACT-R (Anderson & Lebiere, 1998): base-level activation = frequency + recency
  - Ebbinghaus forgetting curve: time-based decay of memory traces

**These models explain:** Human memory retrieval patterns (descriptive science)
**They do NOT provide:** A computational governance framework for AI privacy decisions

### 2.3 Security-Focused Memory Tools
Tools that protect memory from adversarial attacks:
  - Audrey, mguard, ShieldCortex, dent8 (GitHub, 2025-2026)
  - Focus: memory poisoning, prompt injection, tamper-evidence

**These tools answer:** "Is this memory safe from adversarial manipulation?"
**They do NOT answer:** "Is this memory worth keeping for future usefulness?"

---

## 3. THE SPECIFIC GAPS (ENUMERATED)

### Gap G-1: No Pre-Storage Governance Scoring
EVIDENCE: All 8 audited systems lack a scoring function that evaluates an input
BEFORE storage based on predicted usefulness, contextual relevance, novelty,
redundancy, privacy risk, and temporal sensitivity.
CONSEQUENCE: Systems either accept everything (store-all pathology) or rely on
fixed rules without principled adaptive weighting.

### Gap G-2: No Integrated Privacy-Risk Governance
EVIDENCE: Privacy tools redact PII but do not score privacy risk as one factor
in a holistic retention decision. No system combines privacy risk with usefulness,
redundancy, and temporal decay to make a unified governance decision.
CONSEQUENCE: Privacy and usefulness are managed by separate, uncoordinated tools.
Users cannot reason about the tradeoff: "Is this useful enough to store despite
its privacy risk?"

### Gap G-3: No Governed Forgetting Based on Value Decay
EVIDENCE: MemoryBank implements Ebbinghaus-inspired time decay; Zep tracks
temporal validity. But neither system computes a multi-dimensional governance
score that decays over time and triggers automatic forgetting when the score
falls below a threshold.
CONSEQUENCE: Systems forget based on time alone (arbitrary) or never forget
(storage bloat and noise accumulation).

### Gap G-4: No Explainable Per-Item Governance Decision
EVIDENCE: All audited systems make implicit storage decisions (everything goes in,
or fixed rules apply). None generates a structured, human-readable explanation
of WHY a specific item was stored, encrypted, rejected, or forgotten.
CONSEQUENCE: Systems are opaque; users and operators cannot verify, audit, or
appeal memory decisions.

### Gap G-5: No Governance-Labeled Benchmark Dataset
EVIDENCE: All existing benchmarks (LoCoMo, LongMemEval, MemoryAgentBench, Memora)
evaluate RETRIEVAL accuracy. None provides governance action labels
(REJECT / STORE_TEMP / STORE_LONG / ENCRYPT / etc.) for systematic evaluation.
CONSEQUENCE: Reproducible comparison of memory governance policies is impossible
with existing tools.

---

## 4. FORMAL RESEARCH GAP STATEMENT

For inclusion in the IEEE paper (Introduction and Related Work sections):

---
"Despite substantial advances in AI memory retrieval — through vector stores,
knowledge graphs, and hierarchical context management — the pre-storage governance
problem remains unaddressed. Existing frameworks [MemGPT, mem0, Zep, LangChain]
optimize retrieval efficiency, assuming all inputs are worth storing. Privacy tools
[MemPrivacy, AMP] apply redaction but do not assess whether retention itself is
warranted. Security tools [Audrey, mguard] protect against adversarial attacks but
not against the subtler harms of retaining low-value, redundant, or sensitive
information that was not maliciously injected.

Cognitive science models (ACT-R, Ebbinghaus forgetting curve) provide inspiration
for memory dynamics but are descriptive models of human cognition, not prescriptive
governance frameworks for AI systems.

No existing system implements a principled, adaptive, multi-factor scoring function
that decides — for each incoming memory item — whether it should be accepted,
rejected, encrypted, temporarily held, or merged with existing knowledge, based on
a quantified assessment of its usefulness, contextual relevance, privacy risk,
redundancy, novelty, and temporal sensitivity.

Furthermore, no labeled benchmark exists for evaluating the accuracy of such
governance decisions, making reproducible research comparison impossible.

This paper addresses both gaps: we propose the Adaptive Memory Governance Score
(AMGS) algorithm, the AIMF framework implementing it, and the first governance-
labeled benchmark dataset for systematic evaluation."
---

---

## 5. DIFFERENTIATION TABLE

This table maps each related system to the specific part of AIMF that goes beyond it:

| Related System | What It Does Well | What AIMF Adds |
|---------------|-------------------|----------------|
| MemGPT | Context window paging | Pre-storage governance scoring |
| mem0 | Persistent personalized memory | Privacy-aware rejection/encryption |
| Zep/Graphiti | Temporal relational knowledge | Multi-factor AMGS with usefulness and privacy |
| LangChain Memory | Pluggable memory for chains | Principled governance, not plumbing |
| LlamaIndex Memory | Composable memory blocks | Adaptive worthiness scoring |
| ChatGPT Memory | User-controlled persistence | Automated governance without user intervention |
| Security firewalls | Attack prevention | Value-based governance (orthogonal concern) |
| ACT-R | Cognitive memory modeling | Computational AI governance extension |
| MemoryBank | Ebbinghaus temporal decay | Temporal decay as ONE of SEVEN governance factors |

---

## 6. POTENTIAL EXAMINER CHALLENGES AND RESPONSES

**Challenge 1:** "mem0 and Zep already do memory management. How is this different?"
Response: "mem0 and Zep optimize retrieval. They never evaluate whether an input
should be stored. AIMF adds a governance scoring layer that evaluates worthiness
BEFORE storage. These are complementary: AIMF feeds into a storage system like mem0."

**Challenge 2:** "Security memory firewalls already exist on GitHub."
Response: "Those tools address adversarial attacks (poisoning, injection). AIMF
addresses value-based governance: is this memory worth storing given its usefulness
and privacy risk? These are orthogonal problems requiring different approaches."

**Challenge 3:** "Isn't this just a classification problem (store/don't store)?"
Response: "AIMF produces 8 distinct governance decisions with per-factor explanations
and a continuous score. It integrates privacy constraints, temporal dynamics, semantic
deduplication, and usefulness prediction. A binary classifier would not capture
ENCRYPT vs REJECT vs STORE_TEMPORARY distinctions, would not generate explanations,
and would not adaptively decay importance over time."

**Challenge 4:** "ACT-R already has activation-based memory management."
Response: "ACT-R is a descriptive cognitive science model validated against human
response times. AIMF is a prescriptive computational governance framework for AI
systems. AIMF integrates privacy risk, novelty, and redundancy — factors that have
no analogue in ACT-R and are irrelevant to human memory psychology but critical
for AI governance."

**Challenge 5:** "You don't have enough novelty for an IEEE paper."
Response: (Point to the 4 confirmed contributions) "C1 (AMGS algorithm), C2
(open framework), C3 (first governance benchmark), C4 (evaluation methodology)
constitute a research package typical of IEEE workshops and conferences.
The benchmark dataset alone justifies publication as a resource paper."

---

## 7. IDENTIFIED THREATS TO VALIDITY (To Address in Paper)

TV-1 (Internal): AMGS weights are initially hand-tuned, not learned.
  Mitigation: Report ablation study; Phase 11 adds weight optimization.

TV-2 (Construct): "Usefulness" is subjective and annotator-dependent.
  Mitigation: Define operationally; measure inter-annotator agreement.

TV-3 (External): Synthetic dataset may not represent real-world memory distribution.
  Mitigation: Include diverse categories; discuss as limitation; supplement with public data.

TV-4 (Statistical): Small dataset may limit statistical power.
  Mitigation: Target N >= 500; report effect sizes and confidence intervals.

TV-5 (Terminology): "Memory Firewall" now used in security context.
  Mitigation: Explicitly distinguish in abstract, intro, and related work.

---

## STATUS

- [x] Research gap formally stated in 5 enumerated sub-gaps
- [x] Formal gap statement drafted for paper
- [x] Differentiation table completed
- [x] Examiner challenge responses prepared
- [x] Threats to validity identified
- [x] All 4 contributions substantiated against gap

PENDING:
- [ ] Task 0.6: Finalize Research Foundation Document (compile all Phase 0 findings)
- [ ] Phase 1: Begin architecture design

---
_Document Owner: AIMF Research Team_
_Task 0.5 Complete | Task 0.6 Next_
