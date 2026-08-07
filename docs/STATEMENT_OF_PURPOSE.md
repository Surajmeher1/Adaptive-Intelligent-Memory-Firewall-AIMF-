# Statement of Purpose (SOP)
## Project Title: Adaptive AI Memory Firewall (AIMF)
**Subtitle:** A Context-Aware, Privacy-Preserving Memory Management Framework for Intelligent Systems
**Project Level:** B.Tech Computer Science & Engineering Final-Year Capstone Research Project

---

## 1. Introduction & Background
As artificial intelligence (AI) transitions from stateless chat interfaces to persistent autonomous agents, the capacity to remember past interactions becomes critical. Modern agent architectures utilize vector databases and retrieval-augmented generation (RAG) to implement long-term memory. 

However, existing memory management frameworks suffer from a severe architectural limitation: **they store all inputs unconditionally** and defer optimization to the retrieval stage. This "store-all" pathology leads to:
1. **Unbounded Storage Growth:** Infinite accumulation of redundant or low-value information.
2. **Privacy Vulnerabilities:** Sensitive data (such as passwords, health details, or private keys) is persistently stored without consent or encryption, increasing the attack surface.
3. **Retrieval Degradation (Noise):** Accumulation of outdated or irrelevant memories degrades the precision and response time of memory searches over time.

To address these limitations, this project proposes the **Adaptive AI Memory Firewall (AIMF)**. AIMF is a value-based memory governance layer that intercepts, evaluates, and filters incoming memories *before* they reach the storage layer.

---

## 2. Problem Statement & Research Gap
### The Research Gap
A comprehensive review of existing literature reveals a distinct gap:
* **Memory Management Systems (e.g., MemGPT, mem0):** Focus heavily on *retrieval optimization* (paging context windows or indexing facts) but lack pre-storage filters. They do not evaluate whether a memory is worth saving, nor do they support automated deletion (forgetting) based on utility decay.
* **Security & Adversarial Firewalls (e.g., Audrey, ShieldCortex):** Filter inputs for adversarial attacks (prompt injection, jailbreaks, malicious payloads) but lack cognitive- or utility-based evaluation of memory usefulness, frequency, and temporal decay.
* **Privacy Solutions:** Typically apply simple regex-based redact-and-store or static access control, failing to integrate privacy risks into an adaptive utility-relevance framework.

### Formal Problem Statement
> Given a continuous stream of textual interaction memories, how can an intelligent system dynamically and explainably determine what to store, how to store it, when to encrypt it, and when to forget it, so as to maximize useful information retention while minimizing privacy risks, storage footprint, and retrieval noise?

---

## 3. Core Objectives
The primary objectives of this project are:
1. **Develop the Adaptive Memory Governance Score (AMGS):** Formulate a multi-factor mathematical scoring algorithm that computes a memory's utility and privacy risk.
2. **Implement the AIMF Governance Framework:** Build a containerized REST API backend (FastAPI) and a React dashboard that executes the 10-stage AI pipeline, mapping scores to concrete governance decisions.
3. **Establish a Labeled Governance Benchmark Dataset:** Generate a high-quality, annotated evaluation dataset containing memories categorized across usefulness, privacy risk, temporal sensitivity, and redundancy.
4. **Evaluate Performance against Baselines:** Rigorously compare the AIMF framework against traditional policies (such as "Store Everything" and "Fixed TTL") using novel evaluation metrics.

---

## 4. Methodology & Key Innovations

### The AMGS Formula
AIMF evaluates every incoming memory item using the **Adaptive Memory Governance Score (AMGS)**:

$$\text{AMGS} = \alpha \cdot U + \beta \cdot C + \gamma \cdot F + \delta \cdot N - \epsilon \cdot R - \zeta \cdot P - \eta \cdot D$$

Where:
* $U$ = **Usefulness** (predicted future utility of the memory)
* $C$ = **Context Relevance** (semantic relevance to the active session context)
* $F$ = **Frequency** (recurrence of similar semantic concepts)
* $N$ = **Novelty** (information gain compared to existing database entries)
* $R$ = **Redundancy Penalty** (overlap with existing saved memories)
* $P$ = **Privacy Risk Penalty** (sensitivity classification: Low, Medium, High, Critical)
* $D$ = **Temporal Decay Penalty** (ephemeral or time-sensitive nature of the memory)
* $\alpha, \beta, \gamma, \delta, \epsilon, \zeta, \eta$ = **Weights** governing the importance of each factor (optimized dynamically).

### The Eight Governance Decisions
Based on the AMGS score and override thresholds, AIMF assigns one of eight actions to each memory:
1. `REJECT`: Low-utility or high-risk content; discarded immediately.
2. `STORE_TEMPORARY`: Time-sensitive memory; stored with a Time-To-Live (TTL) expiry timestamp.
3. `STORE_LONG_TERM`: High-utility, evergreen memory; stored indefinitely.
4. `SUMMARIZE_AND_STORE`: Moderate utility with high length; compressed using NLP summarization before storage.
5. `ENCRYPT_AND_STORE`: High privacy risk but high usefulness; encrypted with AES-256-GCM before writing to disk.
6. `MERGE_WITH_EXISTING`: Semantically redundant with a saved memory; combined to consolidate information.
7. `UPDATE_EXISTING`: Directly contradicts a previously stored memory; replaces/updates the stale entry.
8. `FORGET`: A background lifecycle task that purges memories whose decayed AMGS score falls below a minimum retention threshold.

---

## 5. Labeled Governance Benchmark Dataset (Data Source & Types)

To scientifically validate the AIMF framework, we establish a standardized, governance-labeled benchmark dataset. 

### Data Source
The dataset consists of a minimum of **500 labeled interaction memory statements** (targeting 1,000) sourced from:
1. **Manually Authored Synthetic Items (60%):** Designed scenario-based memory statements covering specific utility and risk boundaries (e.g., specific time-sensitive requests, credentials, user preferences, and redundant assertions).
2. **Public Conversational Datasets (40%):** Dialogue samples from established datasets (e.g., PERSONA-CHAT, MemoryBank) relabeled using our specific memory governance taxonomy.

*Ethics Note:* The dataset is systematically filtered and reviewed to ensure it contains **zero actual Personally Identifiable Information (PII)** or private user data, and it is released under a CC-BY 4.0 license for research replication.

### Data Type & Structure
The data consists of textual dialogue entries annotated with four ground-truth research labels:
* **Recommended Action (`recommended_action`):** The target governance decision (1 of 8 actions).
* **Sensitivity Level (`sensitivity_level`):** Rated as `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
* **Usefulness Lifetime (`usefulness_lifetime`):** Classified as `EPHEMERAL`, `SHORT_TERM`, `LONG_TERM`, or `EVERGREEN`.
* **Memory Category (`memory_category`):** Segmented across 13 distinct memory types (including credentials, contact details, user preferences, temporal facts, and relational details).

---

## 6. Key System Features of AIMF

AIMF integrates several state-of-the-art software and cognitive features:
* **Multi-Factor Cognitive Scoring Engine (AMGS):** Dynamically computes real-time utility scores by combining cognitive parameters (usefulness, context, frequency, novelty) with regulatory and storage costs (redundancy, privacy, temporal decay).
* **10-Stage AI Pipeline:** Executes text preprocessing, spaCy-based Named Entity Recognition (NER), sentence-transformers embedding generation, novelty estimation, semantic redundancy checks via FAISS, usefulness prediction, and context analysis before mapping to a decision.
* **Zero-Knowledge Privacy Vault:** Intercepts sensitive inputs (`HIGH`/`CRITICAL` sensitivity) and enforces automated client/server AES-256-GCM encryption, ensuring credentials and private data are never stored in plaintext on disk.
* **Real-time Explainable AI (XAI):** Generates transparent, factor-by-factor natural language explanations for every governance action (e.g., explaining why a memory was compressed or rejected).
* **Lifecycle Decay & Forgetting:** Background scheduler that updates memory strength using mathematical decay curves (linear or exponential) and automatically purges (`FORGET`) memories whose utility decays below a retention threshold.
* **Baselines Sandbox:** Evaluation environment to test AMGS against four traditional memory policies (Store Everything, Fixed TTL, Static Rule-Based, Recency + Similarity).
* **Research & Metrics Dashboard:** Interactive React UI displaying real-time system performance metrics (UMR-F1, SIER, MRR, latency percentiles) and ablated model comparisons.

---

## 7. Scope of Work & Technology Stack

### Scope Boundaries (Version 1)
* **Modality:** Text-only interactions (English language).
* **System Boundaries:** Sits as an intermediate API gateway between the user/agent and the database. It is not an LLM itself, but uses smaller, efficient models for local inference.
* **Environment:** Fully containerized via Docker for local deployment, easily portable to production.

### Technology Stack
* **Backend:** Python 3.11, FastAPI (REST API), SQLAlchemy (ORM), SQLite (development database), PostgreSQL (production database).
* **AI & NLP:** spaCy (NER and tokenization), `sentence-transformers` (all-MiniLM-L6-v2 for 384-dimensional embeddings), FAISS (CPU-based vector database for semantic search), `scikit-learn` (for scoring regression/classification).
* **Security:** Python `cryptography` library (AES-256-GCM with distinct nonces and tags).
* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS.
* **Testing & DevOps:** pytest, httpx, Docker, Docker Compose.

---

## 8. Research Contributions & Novelty
This capstone project offers four major contributions to the field of AI systems and cognitive architectures:
1. **Algorithmic Novelty:** The first unified multi-factor scoring function (AMGS) integrating cognitive utility factors (frequency, decay, novelty) with system constraints (redundancy, privacy).
2. **Framework Novelty (AIMF):** An open-source, plug-and-play middleware that acts as a gatekeeper for any database or agent architecture (MemGPT, LangChain, etc.).
3. **Dataset Contribution:** The first public, governance-labeled benchmark dataset containing interactions categorized and annotated with expected governance decisions.
4. **Methodological Contribution:** Introduction of specific evaluation metrics:
   * **Useful Memory Retention F1-Score (UMR-F1):** Measures the balance between retaining useful information and discarding noise.
   * **Sensitive Information Exposure Rate (SIER):** Measures the safety of the system by calculating the fraction of sensitive inputs written to plaintext.

---

## 9. Expected Outcomes & Impact
By deploying AIMF, autonomous intelligent systems will achieve:
* **Enhanced Privacy:** Sensitive user data is automatically rejected or encrypted, protecting users against data leaks and unauthorized profiling.
* **Reduced Resource Footprint:** Storage volume is dramatically decreased by filtering out redundancies and scheduling automated forgetting.
* **Improved LLM Efficiency:** Vector retrievals return cleaner, highly relevant facts, minimizing context-window clutter and LLM token costs.

This project paves the way for responsible, long-term personalization in AI companions, enterprise assistants, and edge-deployed intelligent agents.
