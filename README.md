# AIMF — Adaptive AI Memory Firewall

> **A Context-Aware, Privacy-Preserving Memory Management Framework for Intelligent Systems**  
> Author: i_suraj_001 | B.Tech CSE Final-Year Research Project | Phase 0–7 Complete

[![Tests](https://img.shields.io/badge/tests-89%20passed-brightgreen)](#testing)
[![TypeScript](https://img.shields.io/badge/TypeScript-0%20errors-blue)](#frontend)
[![Python](https://img.shields.io/badge/Python-3.13-blue)](#backend)

---

## Overview

AIMF intercepts every piece of content before it enters an AI system's memory store and applies an **11-stage governance pipeline** that produces:

- An **AMGS score** ∈ [0.0, 1.0] — the Adaptive Memory Governance Score
- A **governance decision** — one of: `STORE_LONG_TERM`, `STORE_ENCRYPT`, `STORE_TEMPORARY`, `STORE`, `SUMMARIZE`, `REJECT`, `REJECT_PRIVACY`
- A full **audit trail** of every state change (append-only, GDPR-compliant)

```
Input Text
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  11-Stage Pipeline                                          │
│  1. Language   2. Validator   3. NER   4. Sensitivity       │
│  5. Privacy    6. Embedder    7. Novelty/Redundancy          │
│  8. Context    9. Temporal    10. Usefulness                 │
│  11. AMGS Engine (7-factor score)                           │
└────────────────────────────┬────────────────────────────────┘
                             │
                 ┌───────────▼──────────┐
                 │   Decision Engine    │
                 │  STORE_LONG_TERM     │
                 │  STORE_ENCRYPT  ←─── PII > 0.70
                 │  STORE_TEMPORARY ←── temporal
                 │  REJECT         ←── score < 0.25
                 └───────────┬──────────┘
                             │
               ┌─────────────▼─────────────┐
               │   Storage + Lifecycle     │
               │   SQLite / PostgreSQL     │
               │   AES-256-GCM encryption  │
               │   FAISS vector index      │
               │   Audit trail (append-only)│
               └───────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Python 3.11+ with pip
- Node.js 18+

### 1. Clone & Setup Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### 2. Configure Environment

```powershell
# Copy the example env file
Copy-Item .env.example .env

# Generate an encryption key and add to .env:
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# → paste as: AIMF_ENCRYPTION_KEY=<key>
```

### 3. Start Backend

```powershell
uvicorn main:app --reload --port 8001
# API docs → http://localhost:8001/docs
```

### 4. Start Frontend

```powershell
cd frontend
npm install
npm run dev
# Dashboard → http://localhost:5173
```

---

## Project Structure

```
projtest1000/
├── backend/
│   ├── ai/
│   │   ├── amgs_engine.py          ← AMGS formula + decision logic
│   │   └── pipeline/
│   │       ├── orchestrator.py     ← 11-stage pipeline runner
│   │       └── stages/             ← 11 individual stage modules
│   ├── api/v1/
│   │   ├── health.py               ← GET /api/v1/health
│   │   ├── memory.py               ← 8 memory endpoints
│   │   ├── baseline.py             ← 4 baseline policy endpoints
│   │   └── research.py             ← batch eval + export endpoints
│   ├── core/                       ← Config, logging, security
│   ├── models/                     ← SQLAlchemy ORM models
│   ├── schemas/                    ← Pydantic request/response schemas
│   ├── tasks/background.py         ← Expiry checker + AMGS decay
│   ├── tests/unit/                 ← 89 unit tests
│   └── main.py                     ← FastAPI app + lifespan
│
├── frontend/src/
│   ├── api/                        ← client.ts, memory.ts, research.ts
│   ├── components/                 ← Sidebar, utils
│   ├── pages/
│   │   ├── InputLab.tsx            ← Live AMGS pipeline demo
│   │   ├── MemoryVault.tsx         ← Browse + search + delete
│   │   ├── MetricsDashboard.tsx    ← System metrics + charts
│   │   ├── ExplanationView.tsx     ← Interactive factor simulator
│   │   ├── AlgorithmComparison.tsx ← AIMF vs 4 baselines (real API)
│   │   └── ResearchEvaluation.tsx  ← Batch eval + GT accuracy
│   └── types/index.ts              ← TypeScript types
│
└── research/
    ├── PAPER_DRAFT_V1.md           ← Full research paper
    ├── DECISIONS.md                ← 9 Architecture Decision Records
    └── PHASE0_*.md                 ← Literature, gap, problem, audit
```

---

## The AMGS Formula

```
AMGS = 0.25·U + 0.20·C + 0.10·F + 0.20·N − 0.10·R − 0.10·P − 0.05·D
```

| Factor | Weight | Direction | Description |
|--------|--------|-----------|-------------|
| U — Usefulness | 0.25 | + | Content length, richness, actionability |
| C — Context Relevance | 0.20 | + | Cosine similarity to session context |
| F — Frequency | 0.10 | + | Content hash frequency in session |
| N — Novelty | 0.20 | + | 1 − max cosine similarity to FAISS index |
| R — Redundancy | 0.10 | − | Near-duplicate penalty |
| P — Privacy Risk | 0.10 | − | PII pattern match (spaCy + regex) |
| D — Temporal Decay | 0.05 | − | Future/past time reference density |

---

## API Reference

### Memory (`/api/v1/memory/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/memory/analyze` | Pipeline dry run (no storage) |
| `POST` | `/memory/submit` | Pipeline + store if approved |
| `GET` | `/memory/` | List memories (paginated, filtered) |
| `GET` | `/memory/search` | Semantic FAISS search |
| `GET` | `/memory/{id}` | Get full memory detail |
| `GET` | `/memory/{id}/lifecycle` | Audit trail |
| `PUT` | `/memory/{id}` | Update + re-govern |
| `DELETE` | `/memory/{id}` | Forget (GDPR-compliant) |

### Research (`/api/v1/research/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/research/evaluate` | Batch AIMF + baseline eval |
| `POST` | `/research/corpus/{name}` | Named corpus evaluation |
| `GET` | `/research/corpora` | List available corpora |
| `GET` | `/research/metrics` | Aggregate DB metrics |
| `GET` | `/research/export?fmt=json\|csv` | Download all memories |

### Baseline (`/api/v1/baseline/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/baseline/policies` | List 4 baseline policies |
| `POST` | `/baseline/{policy}/analyze` | Run a single baseline |

---

## Testing

```powershell
cd backend
$env:PYTHONPATH = "$PWD"
.\.venv\Scripts\activate
python -m pytest tests/unit/ -v
```

| Suite | Tests | Status |
|-------|-------|--------|
| Phase 0–2 (core) | 17 | ✅ |
| Phase 3 (pipeline) | 17 | ✅ |
| Phase 3 (AMGS engine) | 19 | ✅ |
| Phase 6 (research) | 36 | ✅ |
| **Total** | **89** | ✅ **89/89** |

---

## Research Results

| Metric | AIMF | Store All | Fixed TTL | Static Rules | Recency+Sim |
|--------|------|-----------|-----------|--------------|-------------|
| Privacy Protection | **100%** | 0% | 0% | 70% | 0% |
| Temporal Accuracy | **100%** | 0% | 100%†| 60% | 0% |
| Ground-Truth Accuracy | **80%** | 30% | 10% | 50% | 40% |
| Storage Rate | 70% | 100% | 100% | 60% | 80% |

†Fixed TTL achieves "temporal accuracy" by storing everything temporarily — no temporal detection.

See [research/PAPER_DRAFT_V1.md](./research/PAPER_DRAFT_V1.md) for the full paper.

---

## Project Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Research, literature, problem statement | ✅ |
| 1 | Architecture, DB schema, API spec, ADRs | ✅ |
| 2 | Core backend, security, Alembic | ✅ |
| 3 | 11-stage AMGS pipeline (53 tests) | ✅ |
| 4 | 8 REST endpoints + background tasks | ✅ |
| 5 | React frontend (6 pages, 0 TS errors) | ✅ |
| 6 | Research eval (4 baselines, 36 tests) | ✅ |
| 7 | Paper, ADRs, README | ✅ |
