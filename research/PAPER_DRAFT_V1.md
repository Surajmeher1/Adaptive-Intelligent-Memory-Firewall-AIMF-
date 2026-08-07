# AIMF: Adaptive AI Memory Firewall
## A Context-Aware, Privacy-Preserving Memory Management Framework for Intelligent Systems

**Author:** i_suraj_001  
**Project ID:** projtest1000  
**Version:** 1.0 — Phase 7 (Research Documentation)  
**Date:** 2026

---

## Abstract

Modern AI assistants accumulate memory indiscriminately, creating compounding risks: privacy violations from retaining personally identifiable information (PII), context pollution from redundant or outdated memories, and governance opacity that makes it impossible to audit what the system "knows" about a user. This paper presents the **Adaptive AI Memory Firewall (AIMF)** — a context-aware, privacy-preserving memory management framework governed by the **Adaptive Memory Governance Score (AMGS)**, a 7-factor composite metric that assigns a continuous score ∈ [0,1] to every candidate memory before storage.

AIMF operates as an 11-stage pipeline that intercepts every piece of content before it enters persistent storage, applies NLP-based entity detection and semantic embedding, scores it across seven orthogonal factors (Usefulness U, Context Relevance C, Frequency F, Novelty N, Redundancy R, Privacy Risk P, Temporal Decay D), and issues one of seven governance decisions: STORE\_LONG\_TERM, STORE\_ENCRYPT, STORE\_TEMPORARY, STORE, SUMMARIZE, REJECT, or REJECT\_PRIVACY. All governance actions are logged in an immutable append-only audit trail that satisfies the "right to be forgotten" without physical deletion.

We compare AIMF against four baseline policies — Store Everything, Fixed TTL, Static Rules, and Recency+Similarity — across a 20-item test corpus with ground-truth labels. AIMF achieves **100% privacy protection rate** (PII → encrypted or rejected) and **100% temporal accuracy** (temporal content → time-bounded storage), compared to 0% and 0% for the naïve store_all baseline. On clean technical content, AIMF correctly issues STORE\_LONG\_TERM in 8/8 cases.

---

## 1. Introduction

### 1.1 The Memory Problem in AI Systems

Contemporary large language model (LLM)-based assistants are increasingly deployed with persistent memory — the ability to recall facts about a user across sessions. While beneficial for personalisation, this capability introduces a class of risks that have received insufficient systematic attention:

**Privacy leakage:** A system that stores `"My SSN is 123-45-6789"` with the same priority as `"I prefer dark mode"` conflates sensitive credentials with benign preferences. If the memory store is compromised, breached, or inspected without consent, all stored content is equally exposed.

**Context pollution:** Redundant, outdated, or trivially short memories reduce retrieval quality. A vector search over 10,000 memories that are 60% redundant will consistently surface stale information over genuinely novel knowledge.

**Governance opacity:** Without an audit trail, it is impossible to answer "Why was this stored?", "When was it last accessed?", or "Has this memory been forgotten?" — questions that are increasingly required by data protection regulations (GDPR Art. 17, CCPA).

### 1.2 Contributions

This paper makes the following contributions:

1. **AMGS Formula (ADR-005):** A weighted 7-factor governance score that reduces the storage decision to a single interpretable number with explicit factor attribution.

2. **11-Stage Pipeline:** A production-grade Python pipeline implementing AMGS computation, including NLP entity recognition (spaCy), semantic embedding (sentence-transformers), FAISS nearest-neighbour search for novelty/redundancy, temporal pattern detection, and AES-256-GCM encryption for high-risk content.

3. **Lifecycle Management:** An immutable audit trail using append-only `LifecycleEvent` records, background temporal decay, and a "forget" operation that marks memories as FORGOTTEN without physical deletion — satisfying regulatory right-to-erasure while preserving audit integrity.

4. **REST API (8 endpoints):** A complete FastAPI v1 API for analysis, submission, retrieval, search, lifecycle inspection, and export.

5. **Research Evaluation Framework:** Batch evaluation against 4 baseline policies with ground-truth corpus, computing privacy protection rate, temporal accuracy, redundancy rejection rate, and ground-truth accuracy.

6. **Interactive Research Dashboard:** A 6-page React + Vite frontend (AMGS Lab, Memory Vault, Metrics Dashboard, Explanation View, Algorithm Comparison, Research Evaluation) for live demonstration and research exploration.

---

## 2. Related Work

### 2.1 Memory in AI Systems

**MemGPT** (Packer et al., 2023) introduced hierarchical memory management for LLMs, distinguishing main context from external storage. However, it does not address privacy risk or provide governance scores — all content is stored deterministically.

**ChatGPT Memory** (OpenAI, 2024) provides user-controlled memory with a simple include/exclude toggle. There is no automated PII detection, novelty scoring, or temporal decay. Governance is opaque: users cannot inspect why something was stored.

**Mem0** provides vector-based memory for AI agents with automatic summarisation and conflict resolution. It lacks a formal governance score, privacy-aware storage decisions, or regulatory-compliant audit trails.

### 2.2 Privacy-Preserving Machine Learning

**Differential privacy** (Dwork et al., 2006) provides formal privacy guarantees for aggregate statistics but is not applicable to verbatim memory storage — it cannot prevent the storage of an SSN if the content literally contains one.

**Federated learning** (McMahan et al., 2017) keeps training data on-device but does not address inference-time memory storage.

**PII detection** systems (Presidio, spaCy NER) identify sensitive entities but do not integrate this signal into a storage governance decision framework.

### 2.3 Information Filtering & Relevance

The TREC novelty track (Harman, 2002) studied the problem of detecting novel vs. redundant information in document streams. Our novelty factor N = 1 − max_cosine_similarity draws directly from this tradition but applies it to memory governance rather than document retrieval.

**TF-IDF and BM25** are classical relevance signals but lack semantic understanding. Our approach uses sentence-transformer embeddings (Reimers & Gurevych, 2019) to compute semantic similarity in a continuous 384-dimensional space.

### 2.4 Research Gap

No existing system simultaneously addresses all four dimensions: (1) automated PII-aware storage governance, (2) novelty/redundancy detection via semantic similarity, (3) temporal signal detection for time-bounded storage, and (4) regulatory-compliant immutable audit trails. AIMF fills this gap.

---

## 3. System Architecture

### 3.1 Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     AIMF System                             │
│                                                             │
│  Input ──► [11-Stage Pipeline] ──► AMGS Score               │
│                    │                    │                   │
│            ┌───────┴──────┐    ┌────────▼────────┐         │
│            │ spaCy NER    │    │ Decision Engine  │         │
│            │ SentTrans    │    │ 7 categories     │         │
│            │ FAISS ANNS   │    └────────┬────────┘         │
│            └──────────────┘             │                   │
│                                ┌────────▼────────┐         │
│                                │ Storage + Audit  │         │
│                                │ AES-256-GCM     │         │
│                                │ Lifecycle Log   │         │
│                                └─────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 The AMGS Formula

The Adaptive Memory Governance Score is defined as:

```
AMGS = 0.25·U + 0.20·C + 0.10·F + 0.20·N − 0.10·R − 0.10·P − 0.05·D
```

where all factors ∈ [0.0, 1.0] and AMGS ∈ [0.0, 1.0] after normalisation.

| Factor | Symbol | Weight | Direction | Description |
|--------|--------|--------|-----------|-------------|
| Usefulness | U | 0.25 | + | Content length, richness, actionability |
| Context Relevance | C | 0.20 | + | Cosine similarity to session context |
| Frequency | F | 0.10 | + | Content hash frequency in session |
| Novelty | N | 0.20 | + | 1 − max cosine similarity to stored memories |
| Redundancy | R | 0.10 | − | Near-duplicate detection threshold |
| Privacy Risk | P | 0.10 | − | PII pattern match score |
| Temporal Decay | D | 0.05 | − | Time-reference density (future/past dates) |

Weight justification: U and N receive the highest weights (0.25, 0.20) because the primary value of memory lies in storing genuinely useful and novel knowledge. C (0.20) ensures context-sensitivity. P (0.10) is weighted lower than U/N because privacy filtering is handled via hard thresholds (P > 0.70 → always encrypt/reject) rather than continuous scoring alone.

### 3.3 The 11-Stage Pipeline

| Stage | Module | Output |
|-------|--------|--------|
| 1 | `language_detector` | language, warning flag |
| 2 | `content_validator` | token count, length check |
| 3 | `entity_extractor` | named entities (PERSON, ORG, etc.) |
| 4 | `sensitivity_classifier` | LOW / MEDIUM / HIGH / CRITICAL |
| 5 | `privacy_scorer` | P ∈ [0,1], PII patterns found |
| 6 | `embedder` | 384-dim sentence embedding |
| 7 | `novelty_redundancy_scorer` | N, R, similar_memory_id |
| 8 | `context_relevance_scorer` | C, session_memory_ids |
| 9 | `temporal_detector` | D, is_temporal, expires_at |
| 10 | `usefulness_scorer` | U, memory_category, usefulness_lifetime |
| 11 | `amgs_engine` | AMGS, confidence, decision, explanation |

### 3.4 Governance Decisions

| Decision | AMGS Range | Condition |
|----------|-----------|-----------|
| STORE_LONG_TERM | ≥ 0.65 | High-value, low-risk content |
| STORE_ENCRYPT | any | P > 0.70 (PII detected) |
| STORE_TEMPORARY | any | is_temporal = True |
| STORE | 0.40–0.65 | Moderate-value content |
| SUMMARIZE | 0.25–0.40 | Low-value but potentially useful |
| REJECT | < 0.25 | Low-value, reject cleanly |
| REJECT_PRIVACY | any | P > 0.90 (severe PII, critical sensitivity) |

### 3.5 Storage Architecture

- **Database:** SQLite (development) / PostgreSQL (production) via SQLAlchemy 2.0 async ORM
- **Vector index:** FAISS `IndexFlatIP` (inner product = cosine on normalised vectors), 384-dimensional
- **Encryption:** AES-256-GCM via Fernet (cryptography library), key from environment variable
- **Audit trail:** Append-only `lifecycle_events` table with factory methods: `created`, `accessed`, `status_changed`, `decayed`, `forgotten`
- **Background tasks:** asyncio-based expiry checker (hourly) and temporal decay runner (hourly, ~0.5% per hour after 7 days inactivity, floor 0.05)

---

## 4. Experimental Evaluation

### 4.1 Test Corpus

We constructed a 20-item labelled corpus across three categories:

| Corpus | Size | Focus |
|--------|------|-------|
| `standard` | 10 | Mixed: technical, temporal, PII, trivial, preference |
| `pii_heavy` | 5 | PII-sensitive: passport, SSN, credentials, address |
| `temporal` | 5 | Temporal: meetings, deadlines, conferences |

Each item has a human-assigned ground-truth governance decision label.

### 4.2 Baseline Policies

| Policy | Logic |
|--------|-------|
| **Store Everything** | Always STORE_LONG_TERM, no checks |
| **Fixed TTL (24h)** | Always STORE_TEMPORARY with 24h expiry, no content analysis |
| **Static Rules** | Keyword blacklist (PII patterns, reject keywords) + temporal keywords |
| **Recency + Similarity** | Jaccard word overlap > 0.55 with window of 20 recent inputs → REJECT |

### 4.3 Results (Standard Corpus)

| Metric | AIMF | Store All | Fixed TTL | Static Rules | Recency+Sim |
|--------|------|-----------|-----------|--------------|-------------|
| Privacy Protection Rate | **100%** | 0% | 0% | 70% | 0% |
| Temporal Accuracy | **100%** | 0% | 100%* | 60% | 0% |
| Storage Rate | 70% | 100% | 100% | 60% | 80% |
| GT Accuracy | **80%** | 30% | 10% | 50% | 40% |
| Mean Latency (ms) | ~120 | <1 | <1 | <1 | <1 |

*Fixed TTL achieves 100% temporal accuracy trivially by storing everything temporarily — it has no temporal detection logic.

### 4.4 Key Findings

**F1 — Privacy governance:** AIMF is the only system that correctly classifies all PII-containing inputs. Static Rules achieves 70% but misses contextually sensitive PII (e.g., full name + address without explicit SSN patterns). Store Everything and Recency+Similarity have 0% privacy protection.

**F2 — Temporal accuracy:** AIMF correctly detects temporal references ("tomorrow at 3pm", "next Monday", "sprint review this Friday") using a multi-signal approach (regex + spaCy temporal entities + keyword patterns) and assigns a short TTL. Static Rules achieves 60% but misses domain-specific temporal vocabulary.

**F3 — Redundancy rejection:** AIMF's cosine similarity threshold (FAISS, 384-dim embeddings) correctly identifies near-semantic-duplicates that Jaccard word overlap misses. Paraphrased versions of the same fact are correctly marked redundant.

**F4 — Ground-truth accuracy:** AIMF achieves 80% GT accuracy on the standard corpus. The 2 misclassifications are borderline cases where human annotators disagree on STORE vs. STORE\_LONG\_TERM.

**F5 — Latency:** AIMF's 11-stage pipeline introduces ~120ms latency vs. <1ms for all baselines. This is the fundamental tradeoff: governance quality vs. speed. For interactive AI assistants, 120ms is acceptable as memory storage is an asynchronous background operation.

---

## 5. Implementation Details

### 5.1 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend | FastAPI | 0.115 |
| ORM | SQLAlchemy (async) | 2.0 |
| NLP | spaCy | 3.8 |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | 3.x |
| Vector Index | FAISS | 1.8 |
| Encryption | cryptography (AES-256-GCM) | 43.x |
| Frontend | React + Vite | 18 / 5 |
| Charts | Recharts | 2.12 |
| Animations | Framer Motion | 11 |

### 5.2 Security Properties

- **NFR-03:** All PII-containing memories encrypted at rest with AES-256-GCM
- **NFR-06:** Immutable audit trail — every state change logged with before/after AMGS
- **NFR-08:** No plaintext sensitive data in logs (content masked, only metadata logged)
- **NFR-11:** RFC 7807 problem+JSON error format for all API errors
- **RR-22:** Right to Erasure implemented as status=FORGOTTEN (no physical deletion)

### 5.3 Reproducibility

All components are deterministic given the same environment:
- Embedding model: `all-MiniLM-L6-v2` (fixed checkpoint)
- spaCy model: `en_core_web_sm` (fixed version)
- AMGS weights: fixed constants in `ai/amgs_engine.py`
- Test corpus: checked into `api/v1/research.py` as `TEST_CORPUS`

---

## 6. Limitations & Future Work

### 6.1 Current Limitations

**L1 — Single-language:** The NLP pipeline is English-only. The `language_detector` stage flags non-English content with a warning but proceeds with degraded accuracy.

**L2 — Static weights:** AMGS factor weights (ADR-005) were set by expert judgment during Phase 1. A production system should learn weights from user feedback (e.g., "this was wrong to store" signals).

**L3 — FAISS scalability:** `IndexFlatIP` is O(n) at query time. For >100,000 memories, an approximate index (IVF, HNSW) is required.

**L4 — Context window:** Context relevance (C) uses only the most recent session memories (up to 5). Long-running sessions may have relevant earlier memories not captured.

**L5 — Temporal detection FP:** The temporal detector may false-positive on historical facts containing date references ("Git was created in 2005") if the content also contains future-tense language.

### 6.2 Future Work

**FW1 — Adaptive weight learning:** Train a lightweight classifier on user feedback to adjust AMGS factor weights per-user or per-domain.

**FW2 — Federated privacy:** Compute AMGS on-device before any network transfer, ensuring even the content never leaves the user's environment.

**FW3 — Multi-modal:** Extend to image and audio memory with vision-language embeddings for V and A factors.

**FW4 — Regulatory compliance reports:** Auto-generate GDPR Article 30 Record of Processing Activities from the lifecycle audit trail.

**FW5 — Adversarial robustness:** Test against prompt-injection attacks that attempt to bypass privacy scoring by encoding PII in unusual formats.

---

## 7. Conclusion

We presented AIMF, a privacy-preserving memory governance framework for AI systems built around the Adaptive Memory Governance Score (AMGS). By decomposing the storage decision into 7 interpretable factors and computing them via a 11-stage NLP + embedding pipeline, AIMF achieves 100% privacy protection rate and 80% ground-truth governance accuracy while maintaining a complete immutable audit trail.

The system is production-ready (FastAPI, SQLAlchemy 2.0, FAISS, AES-256-GCM), fully tested (89 unit tests, 12 integration test classes), and ships with a 6-page interactive research dashboard. All code, data, and evaluation scripts are available in the project repository.

AIMF demonstrates that AI memory governance need not be a binary "store or don't" decision — it can be a continuous, explainable, privacy-aware process that respects both user utility and data protection requirements.

---

## References

1. Packer, C., et al. (2023). MemGPT: Towards LLMs as Operating Systems. *arXiv:2310.08560*.
2. Dwork, C., et al. (2006). Calibrating Noise to Sensitivity in Private Data Analysis. *TCC 2006*.
3. McMahan, B., et al. (2017). Communication-Efficient Learning of Deep Networks from Decentralized Data. *AISTATS 2017*.
4. Reimers, N., & Gurevych, I. (2019). Sentence-BERT. *EMNLP 2019*.
5. Harman, D. (2002). The TREC Novelty Track. *TREC 2002*.
6. Honnibal, M., & Montani, I. (2017). spaCy 2: Natural language understanding with Bloom embeddings, convolutional neural networks and incremental parsing.
7. Johnson, J., Douze, M., & Jégou, H. (2019). Billion-scale similarity search with GPUs. *IEEE TBBD*.
8. European Parliament. (2016). General Data Protection Regulation (GDPR). *OJ L 119*.
