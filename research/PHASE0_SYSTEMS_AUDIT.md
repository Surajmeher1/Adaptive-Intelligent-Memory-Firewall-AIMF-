# AIMF — Phase 0, Tasks 0.3 + 0.4: Systems Audit & Similarity Matrix
# Last Updated: 2026-07-14
# Status: COMPLETE
# Tasks Combined: 0.3 (Systems Audit) + 0.4 (Similarity Matrix)

---

## SECTION 1: SYSTEMS AUDITED

This section audits 8 concrete systems/tools for features that overlap with AIMF.

---

### [S-001] MemGPT / Letta
**Type:** Research prototype → production framework
**Source:** arXiv:2310.08560; github.com/cpacker/MemGPT → letta.com
**Primary Focus:** Context window management for LLMs

**Architecture:**
  - Hierarchical tiers: Main Context (RAM) ↔ Archival Memory (Disk)
  - LLM autonomously pages info in/out via function calls
  - Interrupt-based control flow between LLM and user

**Governance Features Present:**
  - [x] Memory persistence across sessions
  - [x] Retrieval from archival storage
  - [ ] Pre-storage scoring of incoming information
  - [ ] Sensitivity classification or privacy scoring
  - [ ] REJECT / ENCRYPT / TEMPORARY decisions
  - [ ] Multi-factor worthiness scoring
  - [ ] Explainable governance decisions
  - [ ] Governed forgetting with decay function
  - [ ] Governance benchmark evaluation

**Primary Problem Solved:** "How to fit more memory into fixed context windows"
**AIMF Distinction:** AIMF governs BEFORE storage; MemGPT manages AFTER storage

---

### [S-002] mem0 (mem0.ai)
**Type:** Open-source memory abstraction layer
**Source:** github.com/mem0ai/mem0; mem0.ai
**Primary Focus:** Personalization and cross-session persistence

**Architecture:**
  - Three scopes: User / Session / Agent memory
  - Vector search + graph relationships for organization
  - Framework-agnostic SDK (Python, Node.js)
  - Interface: add / search / update / delete

**Governance Features Present:**
  - [x] Memory categorization by scope
  - [x] Semantic deduplication (graph-based)
  - [x] Update/merge of existing memories
  - [ ] Pre-storage worthiness scoring
  - [ ] Privacy risk factor in storage decisions
  - [ ] Multi-category governance decisions (REJECT, ENCRYPT, etc.)
  - [ ] Temporal decay function
  - [ ] Explainable per-memory governance decision
  - [ ] Benchmark evaluation of storage governance

**Primary Problem Solved:** "How to give AI agents persistent, personalized memory"
**AIMF Distinction:** mem0 is a storage framework; AIMF is a governance layer above storage

---

### [S-003] Zep / Graphiti
**Type:** Open-source temporal knowledge graph for AI memory
**Source:** github.com/getzep/graphiti; getzep.com
**Primary Focus:** Temporally-aware relational memory with graph structure

**Architecture:**
  - Bi-temporal model: validity window + ingestion time
  - Episodic (raw facts) → Semantic (entities/facts) → Community (summaries)
  - Autonomous deduplication and conflict invalidation
  - Optimized for low-latency retrieval (<200ms)

**Governance Features Present:**
  - [x] Temporal awareness (when facts became true / were superseded)
  - [x] Conflict detection (invalidates old facts)
  - [x] Deduplication
  - [x] Memory summarization at community level
  - [ ] Pre-storage scoring of incoming information
  - [ ] Privacy risk scoring or sensitivity classification
  - [ ] REJECT / ENCRYPT governance decisions
  - [ ] Multi-factor worthiness score (AMGS-like)
  - [ ] Explainable per-item governance decisions
  - [ ] Governed forgetting based on utility decay

**Primary Problem Solved:** "How to maintain temporally-accurate relational memory"
**AIMF Distinction:** Zep manages relational structure; AIMF governs what enters storage
**Notable:** Zep's bi-temporal model is the closest existing feature to AIMF's temporal
           component, but lacks all other AMGS factors and privacy governance.

---

### [S-004] LangChain Memory Modules
**Type:** Production LLM framework memory components
**Source:** langchain.com; LangChain Python library
**Primary Focus:** Conversation history management for LLM chains

**Memory Types Provided:**
  - ConversationBufferMemory: full verbatim history
  - ConversationSummaryMemory: LLM-summarized history
  - ConversationBufferWindowMemory: sliding window (last K turns)
  - VectorStoreRetrieverMemory: embedding-based semantic retrieval
  - ConversationEntityMemory: extract entities from conversation

**Governance Features Present:**
  - [x] Conversation summarization
  - [x] Semantic retrieval via vector store
  - [x] Entity extraction
  - [ ] Scoring inputs for worthiness before storage
  - [ ] Privacy-risk based decisions
  - [ ] REJECT / ENCRYPT / TEMPORARY decisions
  - [ ] Multi-factor governance algorithm
  - [ ] Temporal decay and forgetting
  - [ ] Governance evaluation benchmark

**Primary Problem Solved:** "How to manage conversation history for LLM chains"
**AIMF Distinction:** LangChain memory is chain plumbing; AIMF is principled governance

---

### [S-005] LlamaIndex Memory Module
**Type:** Production framework agent memory
**Source:** llamaindex.ai; LlamaIndex Python library
**Primary Focus:** Agent memory management with composable blocks

**Architecture:**
  - Short-term: sliding window FIFO buffer (token-limited)
  - Long-term blocks: Static, Fact Extraction, Vector Memory
  - Composable: stack multiple memory sources
  - Standardized BaseMemory interface (put / get)

**Governance Features Present:**
  - [x] Short/long-term memory separation
  - [x] Automatic fact extraction from conversations
  - [x] Vector-based semantic retrieval
  - [x] Composable multi-tier architecture
  - [ ] Pre-storage governance scoring
  - [ ] Privacy risk classification
  - [ ] REJECT decision for inappropriate content
  - [ ] ENCRYPT decision for sensitive content
  - [ ] Temporal decay with forgetting
  - [ ] Benchmark evaluation of governance accuracy

**Primary Problem Solved:** "How to give agents structured, composable memory"
**AIMF Distinction:** LlamaIndex organizes memory; AIMF governs admission to memory

---

### [S-006] ChatGPT Memory (OpenAI)
**Type:** Commercial AI product feature
**Source:** openai.com/memory
**Primary Focus:** Cross-conversation personalization for end users

**Architecture:**
  - Saved Memories: explicit user instructions to remember
  - Chat History Insights: automatic extraction of key facts
  - User controls: view, edit, delete, disable
  - Integration into context window before generation

**Governance Features Present:**
  - [x] Memory persistence across sessions
  - [x] User-controlled deletion
  - [x] Privacy disclaimer (don't share sensitive info)
  - [ ] Automated privacy risk scoring
  - [ ] Automatic REJECT decisions based on sensitivity
  - [ ] Multi-factor worthiness scoring
  - [ ] Temporal decay and automatic forgetting
  - [ ] Explainable governance decisions
  - [ ] Open benchmark evaluation

**Primary Problem Solved:** "How to make ChatGPT remember user preferences"
**AIMF Distinction:** ChatGPT memory is user-controlled manual curation; AIMF is automated principled governance
**Notable:** ChatGPT explicitly relies on USERS to manage sensitivity — AIMF automates this.

---

### [S-007] GitHub "Memory Firewall" Open-Source Projects
**Type:** Open-source security tools (RECENTLY EMERGED — IMPORTANT)
**Source:** GitHub search results (2025-2026)

**Projects Found:**
  A) Audrey (Evilander/Audrey): Local-first memory firewall for coding agents.
     Records tool traces; provides allow/warn/block based on prior failures or rules.
     Focus: Security (prevents harmful agent actions, not governance of information content)

  B) mguard (mguard-ai/mguard): Memory defense library.
     Prevents memory poisoning attacks (MINJA, AgentPoison, MemoryGraft).
     Focus: Security attacks, not governance scoring.

  C) ShieldCortex (Drakon-Systems-Ltd/ShieldCortex): 6-layer memory firewall.
     Input sanitization, pattern detection, behavior protection.
     Focus: Adversarial security, not retention quality governance.

  D) dent8 (xyzzylabs/dent8): Memory firewall for coding agents.
     Provenance, authority, freshness of stored information.
     Focus: Provenance and tamper-evidence, not multi-factor worthiness scoring.

  E) OpenClaw-mem (phenomenoner/openclaw-mem): Auditable memory governance.
     Trust policies, trace receipts, rollback.
     Focus: Audit and compliance, not adaptive scoring.

  F) Forgetted (Hermes Labs): Selective memory governance.
     Controls what agents remember; cleanup on exit.
     Focus: Manual policy rules, not adaptive multi-factor scoring.

**Common Theme of ALL Found Projects:**
  These tools address SECURITY THREATS to memory (poisoning, injection, tampering).
  NONE of them address RETENTION QUALITY governance (whether an input is WORTH storing
  given its usefulness, privacy, redundancy, and temporal relevance).

**AIMF Distinction (Critical):**
  Security-focused memory firewalls: "Is this memory SAFE?"
  AIMF: "Is this memory WORTH KEEPING, and how should it be protected?"
  These are complementary concerns. AIMF addresses the value-based governance gap
  that none of the security tools cover.

**Updated Novelty Note:**
  The term "memory firewall" is being used in GitHub projects (2025-2026),
  but exclusively in a security (anti-attack) sense, not a governance/retention sense.
  AIMF must clearly distinguish: AIMF is a VALUE GOVERNANCE firewall, not a
  SECURITY ATTACK firewall. Both are needed; they are different problems.
  This distinction strengthens rather than weakens AIMF's novelty claim.

---

### [S-008] MemoryBank (Zhong et al., 2023/2024)
**Type:** Research system (covered in Task 0.2, included here for matrix)
**Source:** AAAI 2024; github.com/zhongwanjun/MemoryBank-SiliconFriend

**Governance Features Present:**
  - [x] Ebbinghaus forgetting curve (time-based decay)
  - [x] Memory reinforcement through access
  - [x] Long-term memory persistence
  - [ ] Multi-factor governance scoring
  - [ ] Privacy risk factor
  - [ ] REJECT / ENCRYPT / TEMPORARY decisions
  - [ ] Novelty and redundancy assessment
  - [ ] Governance benchmark (retrieval only, 100 Q&A pairs)

---

## SECTION 2: FORMAL SIMILARITY MATRIX

This matrix rates each system on the presence/absence of each AIMF feature.
Scale: ✓ = Present | ~ = Partial/Approximate | ✗ = Absent

```
FEATURE                          | MemGPT | mem0 | Zep  | LC   | LI   | GPT  | GH-FW| MB   | AIMF
---------------------------------|--------|------|------|------|------|------|------|------|------
Pre-storage worthiness scoring   |   ✗    |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✓
Multi-factor AMGS (U,C,F,N,R,P,D)|   ✗    |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✓
Privacy risk scoring (continuous) |   ✗    |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✓
REJECT decision (refusal to store)|   ✗    |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ~   |  ✗   |  ✓
ENCRYPT decision (sensitivity)   |   ✗    |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✓
STORE_TEMPORARY (time-bounded)   |   ✗    |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✓
STORE_LONG_TERM decision         |   ✓    |  ✓   |  ✓   |  ✓   |  ✓   |  ✓   |  ✗   |  ✓   |  ✓
SUMMARIZE_AND_STORE              |   ✗    |  ✗   |  ~   |  ~   |  ~   |  ~   |  ✗   |  ✗   |  ✓
MERGE_WITH_EXISTING              |   ✗    |  ~   |  ✓   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✓
FORGET / governed deletion       |   ✗    |  ✗   |  ✗   |  ✗   |  ✗   |  ~   |  ✗   |  ~   |  ✓
Temporal decay function          |   ✗    |  ✗   |  ~   |  ✗   |  ✗   |  ✗   |  ✗   |  ✓   |  ✓
Explainable per-item decisions   |   ✗    |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✓
Novelty / redundancy assessment  |   ✗    |  ~   |  ~   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✓
Context relevance scoring        |   ~    |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✓
Usefulness prediction            |   ✗    |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✓
Governance benchmark dataset     |   ✗    |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✓
Semantic vector retrieval        |   ✓    |  ✓   |  ✓   |  ✓   |  ✓   |  ~   |  ✗   |  ✓   |  ✓
Security attack prevention       |   ✗    |  ✗   |  ✗   |  ✗   |  ✗   |  ✗   |  ✓   |  ✗   |  ~
Open source                      |   ✓    |  ✓   |  ✓   |  ✓   |  ✓   |  ✗   |  ✓   |  ✓   |  ✓
---------------------------------|--------|------|------|------|------|------|------|------|------

LC = LangChain Memory  |  LI = LlamaIndex Memory  |  GH-FW = GitHub Memory Firewalls
MB = MemoryBank        |  GPT = ChatGPT Memory
```

**AIMF unique features (all ✗ across existing systems):**
  1. Pre-storage worthiness scoring
  2. Multi-factor AMGS (combining all 7 factors)
  3. Privacy risk scoring (continuous 0..1)
  4. ENCRYPT decision
  5. STORE_TEMPORARY decision
  6. Usefulness prediction
  7. Explainable per-item governance decisions
  8. Governance benchmark dataset

---

## SECTION 3: COMPETITIVE POSITIONING STATEMENT

For the IEEE paper, AIMF should be positioned as:

**"A pre-storage governance layer complementary to existing AI memory systems."**

Key language:
- AIMF does NOT replace MemGPT, mem0, or LlamaIndex
- AIMF SITS ABOVE these systems as a governance filter
- AIMF answers "should this enter the memory store?" before any storage system
  receives the information
- Existing systems (MemGPT, mem0, Zep) answer "how to retrieve efficiently"
- GitHub security firewalls answer "is this a security attack?"
- AIMF answers "is this worth storing, and with what protection?"

This positioning is:
  (a) Honest — no overclaiming that existing systems are bad
  (b) Defensible — the governance gap is real and documented
  (c) Architecturally clean — AIMF as a preprocessing governance stage
  (d) Technically motivated — no existing tool fills this specific role

---

## SECTION 4: CRITICAL TERMINOLOGY NOTE

The GitHub search revealed that "memory firewall" as a term is now in use in the
security/adversarial sense. This creates a naming risk:

**Risk:** An examiner may find Audrey, mguard, or ShieldCortex and claim AIMF
          is not novel because "memory firewalls" already exist.

**Response (to be included in paper):**
  "Existing memory firewall tools [Audrey, mguard, ShieldCortex] address
  adversarial threats to memory integrity — preventing poisoning attacks and
  malicious injections. AIMF addresses a distinct and complementary problem:
  value-based governance — determining whether an input is worth storing based
  on its predicted usefulness, privacy risk, temporal relevance, and redundancy.
  These are orthogonal concerns; a comprehensive memory management system
  requires both."

**Decision (to record in DECISIONS.md):**
  AIMF should subtitle itself:
  "A Value-Based Memory Governance Framework" rather than relying solely on
  the "Memory Firewall" name, to clearly distinguish from security firewalls.

---

## SECTION 5: FINAL CONTRIBUTION STATUS

| Contribution | Evidence from Audit | Confidence |
|-------------|---------------------|-----------|
| C1: AMGS multi-factor scoring | ✗ in all 8 systems | VERY HIGH |
| C2: Memory Firewall framework (value governance) | ✗ in all 8 systems | VERY HIGH |
| C3: Governance benchmark dataset | ✗ in all 8 systems | VERY HIGH |
| C4: Evaluation methodology (UMR-F1, SIER) | ✗ in all 8 systems | VERY HIGH |

---

## SECTION 6: ADDITIONAL CITATIONS IDENTIFIED

From this systems audit, add to must-cite list:
  14. Zep/Graphiti paper (bi-temporal knowledge graph — cite for temporal context)
  15. LangChain Memory documentation (cite as baseline system)
  16. OpenAI ChatGPT Memory announcement (cite as industry evidence of problem)
  17. Audrey / ShieldCortex papers if available (distinguish from security firewalls)

---

## STATUS CHECKLIST

- [x] MemGPT / Letta audited
- [x] mem0 audited
- [x] Zep / Graphiti audited
- [x] LangChain Memory audited
- [x] LlamaIndex Memory audited
- [x] ChatGPT Memory audited
- [x] GitHub "memory firewall" projects audited (6 projects)
- [x] MemoryBank audited (carried from Task 0.2)
- [x] Similarity matrix produced (19 features × 8 systems)
- [x] Competitive positioning statement drafted
- [x] Terminology risk identified and mitigation drafted
- [x] All 4 contributions confirmed as VERY HIGH confidence

PENDING:
- [ ] Task 0.5: Identify Defensible Research Gap (formal document)
- [ ] Task 0.6: Finalize Research Foundation Document

---
_Document Owner: AIMF Research Team_
_Tasks 0.3 and 0.4 Complete | Task 0.5 Next_
