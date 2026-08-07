# AIMF — API Specification
# Phase 1, Task 1.8
# Last Updated: 2026-07-14
# Status: APPROVED
# Base URL: http://localhost:8000/api/v1
# Format: All requests/responses are JSON (application/json)
# Errors: RFC 7807 Problem Details format

---

## GLOBAL CONVENTIONS

### Request Headers
  Content-Type: application/json
  Accept: application/json

### Error Response Format (RFC 7807)
```json
{
  "type": "https://aimf.local/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "content field must be between 1 and 1000 characters",
  "instance": "/api/v1/memory/analyze"
}
```

### Pagination (where applicable)
```
Query params: ?page=1&page_size=20
Response includes: total, page, page_size, items[]
```

### Common Field Types
  id: string (UUID v4)
  timestamps: string (ISO-8601: "2026-07-14T14:30:00.000Z")
  scores: float in [0.0, 1.0]

---

## GROUP 1: HEALTH

### GET /api/v1/health
Returns service health status.

**Response 200:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-07-14T14:30:00.000Z",
  "components": {
    "database": "ok",
    "faiss_index": "ok",
    "embedding_model": "ok",
    "nlp_model": "ok",
    "encryption": "ok"
  },
  "memory_count": 42,
  "index_size": 42
}
```

---

## GROUP 2: MEMORY — ANALYSIS

### POST /api/v1/memory/analyze
Analyze text and return governance decision WITHOUT storing.
Use this for live demonstrations and dry runs.

**Request body:**
```json
{
  "content": "My meeting with Dr. Smith is tomorrow at 3pm",
  "session_id": "session-abc-123"
}
```

**Request fields:**
  content (string, REQUIRED): text to analyze. Min 1, max 1000 chars.
  session_id (string, OPTIONAL): session context identifier. Max 128 chars.

**Response 200:**
```json
{
  "request_id": "req-uuid-here",
  "decision": "STORE_TEMPORARY",
  "amgs_score": 0.58,
  "confidence": 0.82,
  "review_recommended": false,
  "factors": {
    "usefulness": 0.65,
    "context_relevance": 0.50,
    "frequency": 0.10,
    "novelty": 0.80,
    "redundancy": 0.05,
    "privacy_risk": 0.35,
    "temporal_decay": 0.90
  },
  "explanation": {
    "rationale": "Input stored temporarily until 2026-07-15T15:00:00Z: temporal signal detected (D=0.90). AMGS score 0.58 driven by high novelty (0.80) and usefulness (0.65). Privacy risk moderate (0.35) — contains named person entity.",
    "decision_boundary": "is_temporal=True triggered STORE_TEMPORARY override",
    "dominant_factor": "novelty",
    "privacy_patterns_found": [],
    "similar_memory_id": null
  },
  "metadata": {
    "token_count": 11,
    "entities": [
      {"text": "Dr. Smith", "label": "PERSON", "start": 16, "end": 25},
      {"text": "tomorrow", "label": "DATE", "start": 29, "end": 37},
      {"text": "3pm", "label": "TIME", "start": 41, "end": 44}
    ],
    "sensitivity": "MEDIUM",
    "memory_category": "TEMPORAL_EVENT",
    "usefulness_lifetime": "SHORT",
    "is_temporal": true,
    "expires_at": "2026-07-15T15:00:00.000Z",
    "language": "en",
    "language_warning": false
  },
  "latency_ms": 143
}
```

**Errors:**
  422 — content missing, empty, or > 1000 chars
  500 — internal pipeline error (review_recommended set to true in response)

---

### POST /api/v1/memory/submit
Analyze text AND store in database if decision approves storage.
REJECT decisions return the decision but do not store.

**Request body:** Same as /analyze

**Response 201 (stored):**
```json
{
  "memory_id": "mem-uuid-here",
  "decision": "STORE_LONG_TERM",
  "amgs_score": 0.72,
  "stored": true,
  "analyze_result": { /* same as /analyze response */ },
  "storage_metadata": {
    "encrypted": false,
    "expires_at": null,
    "version": 1
  }
}
```

**Response 200 (not stored — REJECT):**
```json
{
  "memory_id": null,
  "decision": "REJECT",
  "amgs_score": 0.18,
  "stored": false,
  "analyze_result": { /* same as /analyze response */ },
  "storage_metadata": null
}
```

**Errors:** Same as /analyze

---

## GROUP 3: MEMORY — RETRIEVAL

### GET /api/v1/memory/
List stored memories (paginated, filterable).

**Query parameters:**
  page (int, default=1)
  page_size (int, default=20, max=100)
  status (string, optional): ACTIVE | EXPIRED | FORGOTTEN
  decision (string, optional): filter by governance decision
  sensitivity (string, optional): LOW | MEDIUM | HIGH | CRITICAL
  session_id (string, optional): filter by session

**Response 200:**
```json
{
  "total": 156,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": "mem-uuid",
      "content": "I prefer dark mode in all editors",
      "decision": "STORE_LONG_TERM",
      "amgs_score": 0.74,
      "sensitivity": "LOW",
      "status": "ACTIVE",
      "memory_category": "PREFERENCE",
      "created_at": "2026-07-14T14:00:00.000Z",
      "last_accessed": "2026-07-14T14:00:00.000Z",
      "access_count": 0,
      "expires_at": null,
      "is_encrypted": false
    }
  ]
}
```

---

### GET /api/v1/memory/{id}
Retrieve a single memory by ID. Increments access_count.
For encrypted memories: returns decrypted content via AES-GCM.

**Response 200:**
```json
{
  "id": "mem-uuid",
  "content": "I prefer dark mode in all editors",
  "decision": "STORE_LONG_TERM",
  "amgs_score": 0.74,
  "factors": {
    "usefulness": 0.75,
    "context_relevance": 0.55,
    "frequency": 0.20,
    "novelty": 0.85,
    "redundancy": 0.05,
    "privacy_risk": 0.00,
    "temporal_decay": 0.00
  },
  "explanation": { /* FactorExplanation object */ },
  "sensitivity": "LOW",
  "memory_category": "PREFERENCE",
  "usefulness_lifetime": "PERMANENT",
  "status": "ACTIVE",
  "is_encrypted": false,
  "expires_at": null,
  "created_at": "2026-07-14T14:00:00.000Z",
  "last_accessed": "2026-07-14T14:05:00.000Z",
  "access_count": 1,
  "version": 1,
  "parent_id": null,
  "entities": []
}
```

**Errors:**
  404 — memory not found
  410 — memory exists but is FORGOTTEN (soft-deleted)
  403 — decryption failed (wrong key or tampered ciphertext)

---

### GET /api/v1/memory/search
Semantic similarity search over active memories.

**Query parameters:**
  q (string, REQUIRED): search query text
  k (int, default=5, max=20): number of results to return
  min_similarity (float, default=0.30): minimum cosine similarity threshold
  status (string, default=ACTIVE): which memories to search

**Response 200:**
```json
{
  "query": "my color preferences",
  "results": [
    {
      "memory_id": "mem-uuid",
      "content": "I prefer dark mode in all editors",
      "similarity": 0.82,
      "decision": "STORE_LONG_TERM",
      "amgs_score": 0.74,
      "sensitivity": "LOW",
      "memory_category": "PREFERENCE"
    }
  ],
  "total_found": 1,
  "latency_ms": 12
}
```

---

### GET /api/v1/memory/{id}/lifecycle
Full lifecycle history for a memory.

**Response 200:**
```json
{
  "memory_id": "mem-uuid",
  "current_status": "ACTIVE",
  "current_amgs": 0.74,
  "decayed_amgs": 0.71,
  "events": [
    {
      "id": "evt-uuid",
      "event_type": "CREATED",
      "old_status": null,
      "new_status": "ACTIVE",
      "amgs_before": null,
      "amgs_after": 0.74,
      "reason": "Memory stored via STORE_LONG_TERM decision",
      "created_at": "2026-07-14T14:00:00.000Z"
    },
    {
      "id": "evt-uuid-2",
      "event_type": "ACCESSED",
      "old_status": "ACTIVE",
      "new_status": "ACTIVE",
      "amgs_before": 0.74,
      "amgs_after": 0.74,
      "reason": "Memory retrieved via GET /api/v1/memory/{id}",
      "created_at": "2026-07-14T14:05:00.000Z"
    }
  ]
}
```

---

## GROUP 4: MEMORY — MODIFICATION

### PUT /api/v1/memory/{id}
Update memory content. Creates a new version (increments version counter,
sets parent_id = old memory id). Old version status → ARCHIVED.

**Request body:**
```json
{
  "content": "I prefer dark mode in VS Code and all editors"
}
```

**Response 200:** Full MemoryOut of the NEW version (same format as GET /{id})

**Errors:**
  404 — memory not found
  422 — content validation failed

---

### DELETE /api/v1/memory/{id}
Soft-delete (FORGET) a memory. Sets status=FORGOTTEN, adds lifecycle event.
Does NOT permanently delete the database row (research audit requirement).

**Response 204:** No content on success

**Errors:**
  404 — memory not found
  409 — memory already FORGOTTEN

---

## GROUP 5: BASELINE POLICIES

### GET /api/v1/baseline/policies
List available baseline policies.

**Response 200:**
```json
{
  "policies": [
    {"id": "store_all", "name": "Store Everything", "description": "Always STORE_LONG_TERM"},
    {"id": "fixed_ttl", "name": "Fixed TTL", "description": "Always STORE_TEMPORARY with configurable TTL"},
    {"id": "static_rules", "name": "Static Rules", "description": "Keyword-based rule set"},
    {"id": "recency_similarity", "name": "Recency + Similarity", "description": "Recent similarity check"}
  ]
}
```

---

### POST /api/v1/baseline/{policy}/analyze
Analyze text using a baseline policy (no storage).

**Path parameter:**
  policy: store_all | fixed_ttl | static_rules | recency_similarity

**Request body:** Same as /memory/analyze

**Additional query param for fixed_ttl:**
  ttl=24h | 7d | 30d (default: 24h)

**Response 200:**
```json
{
  "policy": "static_rules",
  "decision": "REJECT",
  "rationale": "Credential pattern detected: 'password' keyword found",
  "expires_at": null,
  "latency_ms": 2
}
```

---

## GROUP 6: RESEARCH & EXPERIMENTS

### GET /api/v1/research/metrics
Current live metrics computed over all stored memories.

**Response 200:**
```json
{
  "total_memories": 156,
  "by_decision": {
    "STORE_LONG_TERM": 89,
    "STORE_TEMPORARY": 23,
    "ENCRYPT_AND_STORE": 12,
    "SUMMARIZE_AND_STORE": 18,
    "REJECT": 14
  },
  "by_sensitivity": {
    "LOW": 98,
    "MEDIUM": 35,
    "HIGH": 18,
    "CRITICAL": 5
  },
  "avg_amgs_score": 0.61,
  "expired_count": 3,
  "forgotten_count": 7,
  "encrypted_count": 12,
  "mean_factor_scores": {
    "usefulness": 0.68,
    "novelty": 0.72,
    "privacy_risk": 0.21,
    "redundancy": 0.14
  }
}
```

---

### POST /api/v1/research/experiment/run
Start a comparison experiment. Runs AMGS + all 4 baselines against a dataset.

**Request body:**
```json
{
  "name": "amgs_v1_full_comparison",
  "dataset_path": "experiments/datasets/governance_benchmark_v1_test.jsonl",
  "seed": 42,
  "dataset_version": "v1.0",
  "split": "test"
}
```

**Response 202 (Accepted — async run):**
```json
{
  "run_id": "run-uuid",
  "status": "RUNNING",
  "estimated_duration_seconds": 120,
  "poll_url": "/api/v1/research/experiment/run-uuid"
}
```

---

### GET /api/v1/research/experiment/{run_id}
Poll experiment status and retrieve results when complete.

**Response 200 (COMPLETE):**
```json
{
  "run_id": "run-uuid",
  "name": "amgs_v1_full_comparison",
  "status": "COMPLETE",
  "created_at": "...",
  "completed_at": "...",
  "results": [
    {
      "policy": "amgs",
      "umr_f1": 0.831,
      "umr_precision": 0.849,
      "umr_recall": 0.814,
      "sier": 0.032,
      "mrr": 0.089,
      "mean_latency_ms": 187.4,
      "p95_latency_ms": 312.1,
      "per_class": {
        "STORE_LONG_TERM": {"f1": 0.871, "precision": 0.894, "recall": 0.849},
        "ENCRYPT_AND_STORE": {"f1": 0.912, "precision": 0.923, "recall": 0.902},
        "REJECT": {"f1": 0.788, "precision": 0.801, "recall": 0.776}
      },
      "ci_95": {
        "umr_f1": [0.812, 0.849],
        "sier": [0.021, 0.044]
      }
    },
    {
      "policy": "store_all",
      "umr_f1": 0.512,
      "sier": 0.631,
      "mrr": 0.412
    }
  ]
}
```

---

### GET /api/v1/research/ablation
Run or retrieve ablation study results (7 AMGS variants, one factor removed each).

**Response 200:**
```json
{
  "ablation_results": [
    {"removed_factor": "none",      "umr_f1": 0.831, "sier": 0.032, "mrr": 0.089},
    {"removed_factor": "usefulness","umr_f1": 0.764, "sier": 0.031, "mrr": 0.091},
    {"removed_factor": "novelty",   "umr_f1": 0.799, "sier": 0.033, "mrr": 0.088},
    {"removed_factor": "privacy",   "umr_f1": 0.828, "sier": 0.198, "mrr": 0.090},
    {"removed_factor": "context",   "umr_f1": 0.811, "sier": 0.032, "mrr": 0.093},
    {"removed_factor": "frequency", "umr_f1": 0.817, "sier": 0.033, "mrr": 0.091},
    {"removed_factor": "redundancy","umr_f1": 0.824, "sier": 0.032, "mrr": 0.143},
    {"removed_factor": "temporal",  "umr_f1": 0.829, "sier": 0.031, "mrr": 0.090}
  ]
}
```
Note: values above are illustrative only. Actual values from Phase 15 experiments.

---

### GET /api/v1/research/export
Export all experiment results or memory data.

**Query parameters:**
  format: json | csv (default: json)
  type: memories | experiment_results | lifecycle (default: experiment_results)
  run_id (optional): filter to specific experiment run

**Response 200:** File download (application/json or text/csv)

---

## GROUP 7: ADMIN / BACKGROUND TASKS

### POST /api/v1/admin/decay/run
Manually trigger the temporal decay evaluation pass.

**Response 200:**
```json
{
  "processed": 156,
  "forgotten": 3,
  "updated": 12,
  "duration_ms": 234
}
```

---

### POST /api/v1/admin/expiry/run
Manually trigger the expiry check for STORE_TEMPORARY memories.

**Response 200:**
```json
{
  "checked": 23,
  "expired": 2,
  "duration_ms": 45
}
```

---

## COMPLETE ENDPOINT REGISTRY

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/v1/health | Health check | None |
| POST | /api/v1/memory/analyze | Analyze only | None |
| POST | /api/v1/memory/submit | Analyze + store | None |
| GET | /api/v1/memory/ | List memories | None |
| GET | /api/v1/memory/search | Semantic search | None |
| GET | /api/v1/memory/{id} | Get single memory | None |
| GET | /api/v1/memory/{id}/lifecycle | Lifecycle history | None |
| PUT | /api/v1/memory/{id} | Update memory | None |
| DELETE | /api/v1/memory/{id} | Forget memory | None |
| GET | /api/v1/baseline/policies | List baselines | None |
| POST | /api/v1/baseline/{policy}/analyze | Baseline decision | None |
| GET | /api/v1/research/metrics | Live metrics | None |
| POST | /api/v1/research/experiment/run | Start experiment | None |
| GET | /api/v1/research/experiment/{id} | Get experiment | None |
| GET | /api/v1/research/ablation | Ablation results | None |
| GET | /api/v1/research/export | Export data | None |
| POST | /api/v1/admin/decay/run | Run decay pass | None |
| POST | /api/v1/admin/expiry/run | Run expiry check | None |

**Total endpoints: 18**
**Auth note:** All endpoints are unauthenticated in v1 (single-user local system, ADR-002).

---
_Document Owner: AIMF Backend Team_
_Status: APPROVED_
_Last Reviewed: 2026-07-14_
