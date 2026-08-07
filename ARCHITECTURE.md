# AIMF — System Architecture
# Adaptive AI Memory Firewall
# Phase 1, Task 1.4
# Last Updated: 2026-07-14
# Status: APPROVED — Authorizes Phase 2 coding

---

## 1. ARCHITECTURE OVERVIEW

AIMF is a three-tier research system: a React frontend, a FastAPI backend, and
a SQLite (dev) / PostgreSQL (prod) database. The backend contains all intelligence
and exposes a REST API. The frontend is a research dashboard only.

The central architectural principle is **separation of concerns**:
  - The AI module knows nothing about HTTP
  - The API layer knows nothing about AMGS math
  - The database layer knows nothing about business rules
  - The security module is used by services, never by the API layer directly

---

## 2. HIGH-LEVEL COMPONENT DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCKER COMPOSE ENVIRONMENT                    │
│                                                                  │
│  ┌─────────────────────┐         ┌──────────────────────────┐   │
│  │   FRONTEND           │  HTTP   │   BACKEND                │   │
│  │   React + TypeScript │◄───────►│   FastAPI (Python 3.11)  │   │
│  │   Vite dev server    │         │   Port 8000              │   │
│  │   Port 5173          │         │                          │   │
│  │                      │         │  ┌────────────────────┐  │   │
│  │  ┌────────────────┐  │         │  │  API LAYER         │  │   │
│  │  │ Memory Input   │  │         │  │  routers/          │  │   │
│  │  │ Lab            │  │         │  │  - memory.py       │  │   │
│  │  ├────────────────┤  │         │  │  - baseline.py     │  │   │
│  │  │ Memory Vault   │  │         │  │  - research.py     │  │   │
│  │  ├────────────────┤  │         │  │  - health.py       │  │   │
│  │  │ Decision       │  │         │  └────────┬───────────┘  │   │
│  │  │ Explanation    │  │         │           │               │   │
│  │  ├────────────────┤  │         │  ┌────────▼───────────┐  │   │
│  │  │ Algorithm      │  │         │  │  SERVICE LAYER     │  │   │
│  │  │ Comparison     │  │         │  │  services/         │  │   │
│  │  ├────────────────┤  │         │  │  - memory_svc.py   │  │   │
│  │  │ Metrics        │  │         │  │  - baseline_svc.py │  │   │
│  │  │ Dashboard      │  │         │  │  - research_svc.py │  │   │
│  │  └────────────────┘  │         │  └──┬──────────┬──────┘  │   │
│  └─────────────────────┘          │     │          │          │   │
│                                   │  ┌──▼──┐  ┌───▼────────┐ │   │
│                                   │  │ AI  │  │  REPO      │ │   │
│                                   │  │PIPE │  │  LAYER     │ │   │
│                                   │  │LINE │  │  repos/    │ │   │
│                                   │  │     │  │            │ │   │
│                                   │  │AMGS │  │  memory_   │ │   │
│                                   │  │Eng. │  │  repo.py   │ │   │
│                                   │  └──┬──┘  └───┬────────┘ │   │
│                                   │     │          │          │   │
│                                   │  ┌──▼──────────▼───────┐ │   │
│                                   │  │    CORE LAYER        │ │   │
│                                   │  │  - config.py         │ │   │
│                                   │  │  - database.py       │ │   │
│                                   │  │  - security.py       │ │   │
│                                   │  │  - faiss_index.py    │ │   │
│                                   │  └──────────┬───────────┘ │   │
│                                   └─────────────┼─────────────┘   │
│                                                 │                  │
│  ┌──────────────────────────────────────────────▼──────────────┐  │
│  │                       DATABASE                               │  │
│  │   SQLite (dev) / PostgreSQL (prod)                          │  │
│  │                                                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │ memories     │  │ lifecycle_   │  │ experiment_      │  │  │
│  │  │              │  │ events       │  │ results          │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │            FILESYSTEM (persistent volumes)                 │  │
│  │  faiss_index.bin  |  aimf.db  |  logs/  |  experiments/  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. BACKEND MODULE STRUCTURE

```
backend/
├── main.py                    # FastAPI app factory, middleware, router registration
├── requirements.txt           # Pinned Python dependencies
├── Dockerfile                 # Backend Docker image
├── .env.example               # Template for required environment variables
│
├── api/                       # HTTP layer — knows about HTTP only
│   ├── __init__.py
│   ├── v1/
│   │   ├── __init__.py
│   │   ├── memory.py          # FR-28: memory CRUD + analyze + search
│   │   ├── baseline.py        # FR-23..27: baseline policy endpoints
│   │   ├── research.py        # FR-29, FR-33: experiment + export endpoints
│   │   └── health.py          # Health check
│   └── deps.py                # FastAPI dependencies (DB session, etc.)
│
├── core/                      # Cross-cutting infrastructure
│   ├── __init__.py
│   ├── config.py              # Pydantic Settings — all env vars + defaults
│   ├── database.py            # SQLAlchemy engine, session, Base
│   ├── security.py            # AES-256-GCM encrypt/decrypt (FR-15, NFR-06)
│   └── faiss_index.py         # FAISS index load/save/query wrapper (FR-19)
│
├── models/                    # SQLAlchemy ORM models (database tables)
│   ├── __init__.py
│   ├── memory.py              # Memory table
│   └── lifecycle_event.py     # Lifecycle events table
│
├── schemas/                   # Pydantic v2 request/response models
│   ├── __init__.py
│   ├── memory.py              # MemoryIn, MemoryOut, AnalyzeResponse, etc.
│   ├── governance.py          # GovernanceDecision enum, FactorScores, etc.
│   └── research.py            # ExperimentRequest, MetricsResponse, etc.
│
├── services/                  # Business logic — orchestrates AI + repos
│   ├── __init__.py
│   ├── memory_service.py      # FR-01..04, FR-14..22: core memory operations
│   ├── baseline_service.py    # FR-24..27: baseline policy implementations
│   └── research_service.py    # FR-29, FR-33: experiment orchestration
│
├── ai/                        # AMGS intelligence — pure Python, no HTTP
│   ├── __init__.py
│   ├── amgs_engine.py         # Master AMGS scorer — calls all sub-analyzers
│   ├── pipeline/
│   │   ├── __init__.py
│   │   ├── preprocessor.py    # FR-05: text normalization, tokenization
│   │   ├── ner_analyzer.py    # FR-06: spaCy NER
│   │   ├── privacy_analyzer.py# FR-07: privacy/sensitivity scoring
│   │   ├── temporal_detector.py # FR-08: temporal signal detection + TTL
│   │   ├── novelty_estimator.py # FR-09: novelty scoring
│   │   ├── redundancy_detector.py # FR-10: semantic redundancy detection
│   │   ├── usefulness_predictor.py # FR-11: usefulness estimation
│   │   ├── context_analyzer.py  # FR-12: context relevance
│   │   └── contradiction_detector.py # FR-20: conflict detection
│   ├── embeddings.py          # FR-18: sentence-transformers wrapper
│   ├── decision_engine.py     # Converts AMGS score → governance decision
│   ├── decay_engine.py        # FR-21..22: temporal decay + forgetting
│   └── explainer.py           # FR-03: generates natural language explanation
│
├── repositories/              # Data access layer — SQL only
│   ├── __init__.py
│   ├── memory_repository.py   # CRUD operations for Memory model
│   └── lifecycle_repository.py # CRUD for LifecycleEvent model
│
├── migrations/                # Alembic database migrations
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 001_initial_schema.py
│
└── tests/                     # pytest test suite
    ├── __init__.py
    ├── conftest.py             # fixtures: test client, test DB, seeded data
    ├── unit/
    │   ├── test_amgs_engine.py
    │   ├── test_privacy_analyzer.py
    │   ├── test_temporal_detector.py
    │   ├── test_redundancy_detector.py
    │   ├── test_decision_engine.py
    │   ├── test_decay_engine.py
    │   └── test_security.py
    └── integration/
        ├── test_memory_api.py
        ├── test_baseline_api.py
        └── test_research_api.py
```

---

## 4. FRONTEND MODULE STRUCTURE

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── Dockerfile
│
├── src/
│   ├── main.tsx               # React entry point
│   ├── App.tsx                # Router, layout
│   │
│   ├── api/                   # Axios API client layer
│   │   ├── client.ts          # Base axios instance with base URL
│   │   ├── memory.ts          # Memory API calls
│   │   └── research.ts        # Research/experiment API calls
│   │
│   ├── components/            # Reusable UI components
│   │   ├── FactorScoreBar.tsx  # Visual bar for each AMGS factor
│   │   ├── DecisionBadge.tsx   # Color-coded decision label
│   │   ├── MemoryCard.tsx      # Single memory display
│   │   └── MetricGauge.tsx     # Research metric gauge
│   │
│   ├── pages/                 # Route-level pages (FR-30)
│   │   ├── InputLab.tsx       # Memory Input Lab
│   │   ├── MemoryVault.tsx    # Memory browser
│   │   ├── ExplanationView.tsx # Decision explanation detail
│   │   ├── AlgorithmComparison.tsx # AMGS vs baselines
│   │   └── MetricsDashboard.tsx   # Live research metrics
│   │
│   └── types/                 # TypeScript type definitions
│       ├── memory.ts
│       └── governance.ts
```

---

## 5. DATABASE SCHEMA (Entity Relationships)

```
┌──────────────────────────────────────────────────────────────────┐
│  TABLE: memories                                                  │
├──────────────────────────────────────────────────────────────────┤
│  id              UUID         PRIMARY KEY                         │
│  content         TEXT         NOT NULL  (plaintext or "[ENCRYPTED]") │
│  content_hash    VARCHAR(64)  NOT NULL  (SHA-256 for dedup)       │
│  decision        VARCHAR(32)  NOT NULL  (governance decision enum) │
│  amgs_score      FLOAT        NOT NULL  (0.0..1.0)               │
│  usefulness      FLOAT        NOT NULL  (factor score)            │
│  context_rel     FLOAT        NOT NULL                            │
│  frequency       FLOAT        NOT NULL                            │
│  novelty         FLOAT        NOT NULL                            │
│  redundancy      FLOAT        NOT NULL                            │
│  privacy_risk    FLOAT        NOT NULL                            │
│  temporal_decay  FLOAT        NOT NULL                            │
│  sensitivity     VARCHAR(16)  NOT NULL  (LOW/MEDIUM/HIGH/CRITICAL) │
│  memory_category VARCHAR(32)  NOT NULL  (13-category enum)        │
│  status          VARCHAR(16)  NOT NULL  (ACTIVE/EXPIRED/FORGOTTEN) │
│  embedding       BLOB         NOT NULL  (384-dim float32 vector)  │
│  is_encrypted    BOOLEAN      NOT NULL  DEFAULT FALSE              │
│  ciphertext      BLOB         NULL      (AES-GCM ciphertext)      │
│  nonce           BLOB         NULL      (96-bit GCM nonce)        │
│  tag             BLOB         NULL      (128-bit GCM auth tag)    │
│  expires_at      DATETIME     NULL      (for STORE_TEMPORARY)     │
│  explanation     JSON         NOT NULL  (per-factor explanation)  │
│  source_context  TEXT         NULL      (session context snapshot) │
│  created_at      DATETIME     NOT NULL  DEFAULT NOW()             │
│  last_accessed   DATETIME     NOT NULL  DEFAULT NOW()             │
│  access_count    INTEGER      NOT NULL  DEFAULT 0                 │
│  version         INTEGER      NOT NULL  DEFAULT 1                 │
│  parent_id       UUID         NULL  FK(memories.id) [for updates] │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  TABLE: lifecycle_events                                          │
├──────────────────────────────────────────────────────────────────┤
│  id              UUID         PRIMARY KEY                         │
│  memory_id       UUID         NOT NULL  FK(memories.id)           │
│  event_type      VARCHAR(32)  NOT NULL  (CREATED/ACCESSED/        │
│                               DECAYED/EXPIRED/FORGOTTEN/UPDATED)  │
│  old_status      VARCHAR(16)  NULL                                │
│  new_status      VARCHAR(16)  NULL                                │
│  amgs_before     FLOAT        NULL                                │
│  amgs_after      FLOAT        NULL                                │
│  reason          TEXT         NULL      (human-readable reason)   │
│  created_at      DATETIME     NOT NULL  DEFAULT NOW()             │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  TABLE: experiment_runs                                           │
├──────────────────────────────────────────────────────────────────┤
│  id              UUID         PRIMARY KEY                         │
│  name            VARCHAR(128) NOT NULL                            │
│  seed            INTEGER      NOT NULL                            │
│  dataset_version VARCHAR(32)  NOT NULL                            │
│  config          JSON         NOT NULL  (AMGS weights + thresholds) │
│  status          VARCHAR(16)  NOT NULL  (RUNNING/COMPLETE/FAILED) │
│  created_at      DATETIME     NOT NULL                            │
│  completed_at    DATETIME     NULL                                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  TABLE: experiment_results                                        │
├──────────────────────────────────────────────────────────────────┤
│  id              UUID         PRIMARY KEY                         │
│  run_id          UUID         NOT NULL  FK(experiment_runs.id)    │
│  policy          VARCHAR(32)  NOT NULL  (amgs/store_all/etc.)     │
│  umr_f1          FLOAT        NULL                                │
│  umr_precision   FLOAT        NULL                                │
│  umr_recall      FLOAT        NULL                                │
│  sier            FLOAT        NULL                                │
│  mrr             FLOAT        NULL                                │
│  mean_latency_ms FLOAT        NULL                                │
│  p95_latency_ms  FLOAT        NULL                                │
│  per_class_json  JSON         NULL      (per-decision class F1s)  │
│  created_at      DATETIME     NOT NULL                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. KEY DATA FLOWS

### Flow A: Standard Memory Analysis (FR-01, FR-02)
```
Client                API Layer           Service Layer        AI Pipeline
  │                      │                     │                   │
  │── POST /analyze ─────►│                     │                   │
  │                      │── validate input ──►│                   │
  │                      │                     │── analyze() ─────►│
  │                      │                     │                   │── preprocess
  │                      │                     │                   │── NER
  │                      │                     │                   │── privacy_score
  │                      │                     │                   │── temporal_detect
  │                      │                     │                   │── embed
  │                      │                     │                   │── novelty_score
  │                      │                     │                   │── redundancy_score
  │                      │                     │                   │── usefulness_score
  │                      │                     │                   │── context_score
  │                      │                     │                   │── compute_amgs
  │                      │                     │◄── AMGSResult ────│
  │                      │                     │── decide()        │
  │                      │                     │── explain()       │
  │                      │◄── AnalyzeResponse ─│                   │
  │◄── HTTP 200 ──────────│                     │                   │
```

### Flow B: Memory Storage (FR-14, FR-15)
```
Service Layer           Security Module         Repository         FAISS Index
  │                         │                       │                  │
  │── check decision ──►    │                       │                  │
  │   (is ENCRYPT?)         │                       │                  │
  │── encrypt_if_needed() ──►│                      │                  │
  │                         │── AES-256-GCM ───────►│                  │
  │                         │◄── ciphertext+nonce   │                  │
  │◄── encrypted_content ───│                       │                  │
  │────────────────────────────── save_memory() ───►│                  │
  │                                                  │── INSERT ──────►│
  │────────────────────────────── add_to_index() ──────────────────────►│
  │◄─────────────────────────────── memory_id ──────│                  │
```

### Flow C: Temporal Decay + Forgetting (FR-21, FR-22)
```
Background Task         Decay Engine            Repository         Event Log
  │                         │                       │                  │
  │ [scheduled: daily]      │                       │                  │
  │── get_all_active() ─────────────────────────────►│                 │
  │◄──────────────────── memories list ─────────────│                 │
  │── for each memory:      │                       │                  │
  │   decay_score() ───────►│                       │                  │
  │                         │── apply_decay_fn() ──►│                  │
  │◄── decayed_amgs ────────│                       │                  │
  │   if decayed < FORGET_THRESHOLD:               │                  │
  │── forget_memory() ──────────────────────────────►│                 │
  │                                                  │── UPDATE status  │
  │                                                  │── INSERT event ─►│
```

---

## 7. DECISION THRESHOLDS (v1 — Hand-Tuned, Adjustable via Config)

```
AMGS Score Ranges → Governance Decisions:

  Privacy Risk P ≥ 0.85  →  ENCRYPT_AND_STORE  (overrides score range)
  Privacy Risk P ≥ 0.95  →  REJECT             (overrides score range)

  Redundancy R ≥ 0.85    →  MERGE_WITH_EXISTING (overrides if existing found)
  Temporal sensitivity   →  STORE_TEMPORARY    (overrides if temporal detected)

  AMGS ≥ 0.75  →  STORE_LONG_TERM
  AMGS ≥ 0.50  →  STORE_TEMPORARY
  AMGS ≥ 0.30  →  SUMMARIZE_AND_STORE
  AMGS < 0.30  →  REJECT

  Decayed AMGS < 0.15  →  FORGET (background task)

Decision Priority Order (conflicts resolved in this order):
  1. REJECT (if P ≥ 0.95 or AMGS < 0.30)
  2. ENCRYPT_AND_STORE (if P ≥ 0.85 and AMGS ≥ 0.30)
  3. FORGET (if decayed AMGS < 0.15)
  4. MERGE_WITH_EXISTING (if R ≥ 0.85 and similar memory found)
  5. UPDATE_EXISTING (if contradiction detected)
  6. STORE_TEMPORARY (if temporal signal detected)
  7. STORE_LONG_TERM (if AMGS ≥ 0.75)
  8. SUMMARIZE_AND_STORE (if 0.30 ≤ AMGS < 0.75)
```

These thresholds are defined in `core/config.py` as `Settings` fields and are
overridable via environment variables. All threshold values must be recorded
in RESEARCH_LOG.md before any experiment is run.

---

## 8. API ENDPOINT SUMMARY

```
Health:
  GET  /api/v1/health

Memory Operations:
  POST   /api/v1/memory/analyze        → AnalyzeResponse (no store)
  POST   /api/v1/memory/submit         → MemoryOut (analyze + store)
  GET    /api/v1/memory/               → PaginatedMemoryList
  GET    /api/v1/memory/search         → SimilarMemoryList
  GET    /api/v1/memory/{id}           → MemoryOut
  GET    /api/v1/memory/{id}/lifecycle → LifecycleHistory
  PUT    /api/v1/memory/{id}           → MemoryOut
  DELETE /api/v1/memory/{id}           → 204 No Content

Baseline Policies:
  POST   /api/v1/baseline/{policy}/analyze  → BaselineDecision
  GET    /api/v1/baseline/policies           → list of available policies

Research & Experiments:
  GET    /api/v1/research/metrics            → CurrentMetrics
  POST   /api/v1/research/experiment/run    → ExperimentRun
  GET    /api/v1/research/experiment/{id}   → ExperimentResults
  GET    /api/v1/research/ablation          → AblationResults
  GET    /api/v1/research/export            → JSON or CSV export

Admin / Background:
  POST   /api/v1/admin/decay/run            → trigger decay pass manually
  POST   /api/v1/admin/expiry/run           → trigger expiry check manually
```

---

## 9. ENVIRONMENT VARIABLES (Complete List)

All defined in `core/config.py` with defaults. Overridden via `.env` file.

```
# Core
AIMF_ENV=development              # development | production
AIMF_LOG_LEVEL=INFO               # DEBUG | INFO | WARNING | ERROR
AIMF_CORS_ORIGINS=http://localhost:5173

# Database
AIMF_DATABASE_URL=sqlite:///./aimf.db
# For PostgreSQL: postgresql+asyncpg://user:pass@host/dbname

# Security (REQUIRED — no default for key)
AIMF_ENCRYPTION_KEY=              # base64-encoded 32-byte AES key

# AI Model
AIMF_EMBEDDING_MODEL=all-MiniLM-L6-v2
AIMF_SPACY_MODEL=en_core_web_sm
AIMF_FAISS_INDEX_PATH=./faiss_index.bin

# AMGS Weights (v1 defaults)
AIMF_WEIGHT_U=0.25   # usefulness
AIMF_WEIGHT_C=0.15   # context relevance
AIMF_WEIGHT_F=0.15   # frequency
AIMF_WEIGHT_N=0.20   # novelty
AIMF_WEIGHT_R=0.10   # redundancy (penalty)
AIMF_WEIGHT_P=0.10   # privacy risk (penalty)
AIMF_WEIGHT_D=0.05   # temporal decay (penalty)

# Decision Thresholds
AIMF_THRESHOLD_LONG_TERM=0.75
AIMF_THRESHOLD_STORE=0.50
AIMF_THRESHOLD_SUMMARIZE=0.30
AIMF_THRESHOLD_FORGET=0.15
AIMF_THRESHOLD_ENCRYPT=0.85    # privacy_risk P ≥ this → ENCRYPT
AIMF_THRESHOLD_REJECT_PRIV=0.95  # privacy_risk P ≥ this → REJECT
AIMF_THRESHOLD_REDUNDANCY=0.85   # cosine sim ≥ this → MERGE

# Memory Lifecycle
AIMF_DECAY_FUNCTION=exponential  # exponential | linear | step
AIMF_DECAY_HALF_LIFE_DAYS=30
AIMF_EXPIRY_CHECK_INTERVAL_HOURS=1
AIMF_FORGETTING_TASK_INTERVAL_HOURS=24
AIMF_CONTEXT_WINDOW_SIZE=10      # last N memories for context relevance
AIMF_CONTEXT_WINDOW_MINUTES=30

# Experiment
AIMF_EXPERIMENT_SEED=42
AIMF_EXPERIMENT_DB_PATH=./experiment.db  # separate from demo DB
```

---

## 10. SECURITY ARCHITECTURE SUMMARY

Full details in docs/SECURITY_ARCHITECTURE.md (Task 1.6).

Key points:
  - AES-256-GCM: fresh 96-bit nonce per encrypt() call; tag stored with ciphertext
  - Key: loaded from env only; never logged; never serialized to database
  - Encryption: only in `core/security.py`; no other module imports it
  - Logging: sensitive memory content always replaced with "[CONTENT REDACTED]"
  - SQL: SQLAlchemy ORM only; no raw string SQL anywhere
  - Input validation: Pydantic v2 on all inputs before any processing

---

## 11. PHASE 1 ARCHITECTURE DECISIONS

| Decision | Value | Rationale |
|----------|-------|-----------|
| Framework | FastAPI | Async, auto-docs, Pydantic integration |
| ORM | SQLAlchemy 2.x (async) | Mature, both SQLite and PG |
| DB Driver (dev) | aiosqlite | Async SQLite for development |
| DB Driver (prod) | asyncpg | Async PostgreSQL for production |
| Vector Search | FAISS (CPU) | Free, no server, 10K memory scale |
| Embedding model | all-MiniLM-L6-v2 | 384 dims, fast, good quality |
| NLP | spaCy en_core_web_sm | NER, dependency parsing, fast |
| Encryption | cryptography (PyCA) | Well-audited, Fernet + AES-GCM support |
| Config | Pydantic Settings | Type-safe env var loading |
| Migration | Alembic | Standard with SQLAlchemy |
| Testing | pytest + httpx.AsyncClient | Async-compatible |
| Frontend | React 18 + TypeScript + Vite | Fast dev, type safety |

---

## 12. PHASE 1 ENTRY CRITERIA FOR PHASE 2

All must be TRUE before coding begins:
  [x] Task 1.1: Functional Requirements (33 FRs)
  [x] Task 1.2: Non-Functional Requirements (27 NFRs)
  [x] Task 1.3: Research Requirements (25 RRs)
  [x] Task 1.4: System Architecture (this document)
  [ ] Task 1.5: AI Pipeline Design (docs/AI_PIPELINE.md)
  [ ] Task 1.6: Security Architecture (docs/SECURITY_ARCHITECTURE.md)
  [ ] Task 1.7: Database Schema (docs/DATABASE_SCHEMA.md)
  [ ] Task 1.8: API Specification (docs/API_SPECIFICATION.md)
  [ ] Task 1.9: Repository Structure Creation

---
_Document Owner: AIMF Architecture Team_
_Status: APPROVED_
_Last Reviewed: 2026-07-14_
