# AIMF — Database Schema
# Phase 1, Task 1.7
# Last Updated: 2026-07-14
# Status: APPROVED
# References: ARCHITECTURE.md §5, FR-14, FR-16, FR-17

---

## 1. DATABASE CONFIGURATION

**Development:** SQLite 3 (file: `aimf.db`)
**Production:**  PostgreSQL 15+ (via `AIMF_DATABASE_URL`)
**ORM:**         SQLAlchemy 2.x (async mode with `aiosqlite` / `asyncpg`)
**Migrations:**  Alembic (`migrations/versions/`)

SQLAlchemy's `declarative_base()` is used for ORM models. All migrations
are generated via `alembic revision --autogenerate` and reviewed before apply.

---

## 2. TABLE: `memories`

Primary table — stores every approved memory item.

```sql
CREATE TABLE memories (
    -- Identity
    id              TEXT        PRIMARY KEY,          -- UUID v4 as text
    content_hash    TEXT        NOT NULL UNIQUE,      -- SHA-256 of normalized content

    -- Content (plaintext OR marker)
    content         TEXT        NOT NULL,             -- plaintext content OR "[ENCRYPTED]"

    -- Encrypted content fields (NULL if not encrypted)
    ciphertext      BLOB        NULL,                 -- AES-256-GCM ciphertext
    nonce           BLOB        NULL,                 -- 12-byte GCM nonce
    tag             BLOB        NULL,                 -- 16-byte GCM authentication tag
    is_encrypted    INTEGER     NOT NULL DEFAULT 0,   -- Boolean: 0=false, 1=true

    -- Governance decision
    decision        TEXT        NOT NULL,
        -- CHECK decision IN (
        --   'REJECT','STORE_TEMPORARY','STORE_LONG_TERM',
        --   'SUMMARIZE_AND_STORE','ENCRYPT_AND_STORE',
        --   'MERGE_WITH_EXISTING','UPDATE_EXISTING','FORGET'
        -- )

    -- AMGS score and factors
    amgs_score      REAL        NOT NULL,             -- [0.0, 1.0]
    f_usefulness    REAL        NOT NULL,             -- U factor [0.0, 1.0]
    f_context_rel   REAL        NOT NULL,             -- C factor [0.0, 1.0]
    f_frequency     REAL        NOT NULL,             -- F factor [0.0, 1.0]
    f_novelty       REAL        NOT NULL,             -- N factor [0.0, 1.0]
    f_redundancy    REAL        NOT NULL,             -- R factor [0.0, 1.0]
    f_privacy_risk  REAL        NOT NULL,             -- P factor [0.0, 1.0]
    f_temporal_decay REAL       NOT NULL,             -- D factor [0.0, 1.0]

    -- Classification
    sensitivity     TEXT        NOT NULL DEFAULT 'LOW',
        -- CHECK sensitivity IN ('LOW','MEDIUM','HIGH','CRITICAL')
    memory_category TEXT        NOT NULL DEFAULT 'GENERAL',
        -- CHECK memory_category IN (13 valid values)
    usefulness_lifetime TEXT    NOT NULL DEFAULT 'MEDIUM',
        -- CHECK usefulness_lifetime IN ('EPHEMERAL','SHORT','MEDIUM','LONG','PERMANENT')

    -- Lifecycle
    status          TEXT        NOT NULL DEFAULT 'ACTIVE',
        -- CHECK status IN ('ACTIVE','EXPIRED','FORGOTTEN','ARCHIVED')
    expires_at      TEXT        NULL,                 -- ISO-8601 datetime, NULL if no expiry
    created_at      TEXT        NOT NULL,             -- ISO-8601 datetime
    last_accessed   TEXT        NOT NULL,             -- ISO-8601 datetime
    access_count    INTEGER     NOT NULL DEFAULT 0,

    -- Versioning (for UPDATE_EXISTING chain)
    version         INTEGER     NOT NULL DEFAULT 1,
    parent_id       TEXT        NULL REFERENCES memories(id) ON DELETE SET NULL,

    -- Vector storage (embedding stored separately in FAISS; hash here for sync)
    embedding_dim   INTEGER     NOT NULL DEFAULT 384,

    -- Explanation (stored as JSON text)
    explanation     TEXT        NOT NULL,             -- JSON blob of FactorExplanation

    -- Context snapshot
    session_id      TEXT        NULL,                 -- session this memory came from
    source_context  TEXT        NULL                  -- JSON: last N memory IDs in session
);

-- Indexes
CREATE INDEX idx_memories_status       ON memories(status);
CREATE INDEX idx_memories_session      ON memories(session_id);
CREATE INDEX idx_memories_decision     ON memories(decision);
CREATE INDEX idx_memories_sensitivity  ON memories(sensitivity);
CREATE INDEX idx_memories_created      ON memories(created_at);
CREATE INDEX idx_memories_expires      ON memories(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_memories_amgs         ON memories(amgs_score);
CREATE UNIQUE INDEX idx_memories_hash  ON memories(content_hash);
```

---

## 3. TABLE: `lifecycle_events`

Immutable audit log of all state transitions for every memory.

```sql
CREATE TABLE lifecycle_events (
    id          TEXT    PRIMARY KEY,              -- UUID v4
    memory_id   TEXT    NOT NULL REFERENCES memories(id) ON DELETE CASCADE,

    event_type  TEXT    NOT NULL,
        -- CHECK event_type IN (
        --   'CREATED','ACCESSED','DECAYED','EXPIRED',
        --   'FORGOTTEN','UPDATED','ARCHIVED','MERGED'
        -- )

    old_status  TEXT    NULL,                    -- previous status
    new_status  TEXT    NULL,                    -- new status after event
    amgs_before REAL    NULL,                    -- AMGS before event
    amgs_after  REAL    NULL,                    -- AMGS after event
    reason      TEXT    NULL,                    -- human-readable reason string

    created_at  TEXT    NOT NULL                 -- ISO-8601 datetime
);

CREATE INDEX idx_lifecycle_memory_id ON lifecycle_events(memory_id);
CREATE INDEX idx_lifecycle_event_type ON lifecycle_events(event_type);
CREATE INDEX idx_lifecycle_created ON lifecycle_events(created_at);
```

---

## 4. TABLE: `experiment_runs`

Tracks each research experiment execution.

```sql
CREATE TABLE experiment_runs (
    id              TEXT    PRIMARY KEY,          -- UUID v4
    name            TEXT    NOT NULL,             -- e.g., "amgs_v1_baseline_comparison"
    seed            INTEGER NOT NULL,             -- random seed used
    dataset_version TEXT    NOT NULL,             -- e.g., "v1.0"
    dataset_split   TEXT    NOT NULL,             -- 'train' | 'validation' | 'test'
    config          TEXT    NOT NULL,             -- JSON: AMGS weights + thresholds
    status          TEXT    NOT NULL DEFAULT 'RUNNING',
        -- CHECK status IN ('RUNNING','COMPLETE','FAILED')
    error_message   TEXT    NULL,
    created_at      TEXT    NOT NULL,
    completed_at    TEXT    NULL
);

CREATE INDEX idx_runs_status ON experiment_runs(status);
CREATE INDEX idx_runs_created ON experiment_runs(created_at);
```

---

## 5. TABLE: `experiment_results`

Per-policy evaluation results for each experiment run.

```sql
CREATE TABLE experiment_results (
    id              TEXT    PRIMARY KEY,          -- UUID v4
    run_id          TEXT    NOT NULL REFERENCES experiment_runs(id) ON DELETE CASCADE,
    policy          TEXT    NOT NULL,
        -- CHECK policy IN ('amgs','store_all','fixed_ttl','static_rules','recency_similarity')

    -- Primary metrics
    umr_f1          REAL    NULL,
    umr_precision   REAL    NULL,
    umr_recall      REAL    NULL,
    sier            REAL    NULL,                -- Sensitive Information Exposure Rate
    mrr             REAL    NULL,                -- Memory Redundancy Rate

    -- Retrieval metrics
    precision_at_1  REAL    NULL,
    precision_at_3  REAL    NULL,
    precision_at_5  REAL    NULL,
    recall_at_5     REAL    NULL,
    recall_at_10    REAL    NULL,

    -- Operational metrics
    mean_latency_ms REAL    NULL,
    p95_latency_ms  REAL    NULL,
    max_latency_ms  REAL    NULL,

    -- Detailed results (JSON)
    per_class_json  TEXT    NULL,                -- JSON: per-decision class F1 dict
    confusion_matrix TEXT   NULL,                -- JSON: 8x8 confusion matrix

    -- Bootstrap CIs (JSON)
    ci_json         TEXT    NULL,                -- JSON: 95% CI for each metric

    created_at      TEXT    NOT NULL
);

CREATE INDEX idx_results_run_id ON experiment_results(run_id);
CREATE INDEX idx_results_policy ON experiment_results(policy);
```

---

## 6. FULL COLUMN REFERENCE — `memories`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | TEXT | NO | — | UUID v4 |
| content_hash | TEXT | NO | — | SHA-256 hex, UNIQUE |
| content | TEXT | NO | — | Plaintext or "[ENCRYPTED]" |
| ciphertext | BLOB | YES | NULL | Only if is_encrypted=1 |
| nonce | BLOB | YES | NULL | 12-byte GCM nonce |
| tag | BLOB | YES | NULL | 16-byte GCM auth tag |
| is_encrypted | INTEGER | NO | 0 | Boolean |
| decision | TEXT | NO | — | GovernanceDecision enum |
| amgs_score | REAL | NO | — | 0.0..1.0 |
| f_usefulness | REAL | NO | — | U factor |
| f_context_rel | REAL | NO | — | C factor |
| f_frequency | REAL | NO | — | F factor |
| f_novelty | REAL | NO | — | N factor |
| f_redundancy | REAL | NO | — | R factor |
| f_privacy_risk | REAL | NO | — | P factor |
| f_temporal_decay | REAL | NO | — | D factor |
| sensitivity | TEXT | NO | 'LOW' | SensitivityLevel enum |
| memory_category | TEXT | NO | 'GENERAL' | MemoryCategory enum |
| usefulness_lifetime | TEXT | NO | 'MEDIUM' | UsefulnessLifetime enum |
| status | TEXT | NO | 'ACTIVE' | MemoryStatus enum |
| expires_at | TEXT | YES | NULL | ISO-8601 or NULL |
| created_at | TEXT | NO | — | ISO-8601 |
| last_accessed | TEXT | NO | — | ISO-8601 |
| access_count | INTEGER | NO | 0 | Incremented on read |
| version | INTEGER | NO | 1 | Update version counter |
| parent_id | TEXT | YES | NULL | FK to parent memory |
| embedding_dim | INTEGER | NO | 384 | Always 384 for MiniLM |
| explanation | TEXT | NO | — | JSON FactorExplanation |
| session_id | TEXT | YES | NULL | Session identifier |
| source_context | TEXT | YES | NULL | JSON context snapshot |

---

## 7. SQLALCHEMY ORM MODELS (Skeleton)

```python
# models/memory.py
from sqlalchemy import Column, String, Float, Integer, Boolean, LargeBinary, Text
from sqlalchemy.orm import relationship
from core.database import Base
import uuid

class Memory(Base):
    __tablename__ = "memories"

    id              = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    content_hash    = Column(String(64), nullable=False, unique=True, index=True)
    content         = Column(Text, nullable=False)

    # Encryption
    ciphertext      = Column(LargeBinary, nullable=True)
    nonce           = Column(LargeBinary, nullable=True)
    tag             = Column(LargeBinary, nullable=True)
    is_encrypted    = Column(Boolean, nullable=False, default=False)

    # Decision and AMGS
    decision        = Column(String(32), nullable=False)
    amgs_score      = Column(Float, nullable=False)
    f_usefulness    = Column(Float, nullable=False)
    f_context_rel   = Column(Float, nullable=False)
    f_frequency     = Column(Float, nullable=False)
    f_novelty       = Column(Float, nullable=False)
    f_redundancy    = Column(Float, nullable=False)
    f_privacy_risk  = Column(Float, nullable=False)
    f_temporal_decay = Column(Float, nullable=False)

    # Classification
    sensitivity     = Column(String(16), nullable=False, default="LOW")
    memory_category = Column(String(32), nullable=False, default="GENERAL")
    usefulness_lifetime = Column(String(16), nullable=False, default="MEDIUM")

    # Lifecycle
    status          = Column(String(16), nullable=False, default="ACTIVE", index=True)
    expires_at      = Column(String(32), nullable=True)
    created_at      = Column(String(32), nullable=False)
    last_accessed   = Column(String(32), nullable=False)
    access_count    = Column(Integer, nullable=False, default=0)

    # Versioning
    version         = Column(Integer, nullable=False, default=1)
    parent_id       = Column(String(36), nullable=True)  # FK defined in migration

    # Metadata
    embedding_dim   = Column(Integer, nullable=False, default=384)
    explanation     = Column(Text, nullable=False)   # JSON
    session_id      = Column(String(128), nullable=True, index=True)
    source_context  = Column(Text, nullable=True)

    # Relationship
    lifecycle_events = relationship("LifecycleEvent", back_populates="memory",
                                    cascade="all, delete-orphan")
```

---

## 8. MIGRATION STRATEGY

```
migrations/
├── env.py                           # Alembic env config
├── script.py.mako                   # Migration template
└── versions/
    ├── 001_initial_schema.py        # Creates all 4 tables
    └── 002_add_indexes.py           # (future) additional indexes
```

**Migration workflow:**
```bash
# Generate migration from ORM changes:
alembic revision --autogenerate -m "description"

# Apply migration:
alembic upgrade head

# Rollback:
alembic downgrade -1
```

**Rule:** Never modify existing migration files. Always create a new revision.

---

## 9. FAISS INDEX (Parallel Vector Store)

The FAISS index is maintained **in parallel** with the `memories` table:

```
faiss_index.bin         ← Persisted on disk, reloaded at startup
faiss_id_map.json       ← Maps FAISS internal int IDs to memory UUID strings

On every STORE operation:
  1. SQLAlchemy: INSERT into memories
  2. FAISS: index.add(embedding)   + append to id_map

On every FORGET/EXPIRE operation:
  1. SQLAlchemy: UPDATE memories SET status='FORGOTTEN'
  2. FAISS: mark ID as deleted (FAISS IDSelectorBatch or rebuild periodically)

Note: FAISS IndexFlatIP does not support native deletion. Deleted memories
are tracked in a `deleted_ids` set and filtered from search results.
Full index rebuild runs nightly (configurable) to compact deleted entries.
```

---

## 10. DATABASE PERFORMANCE CONSIDERATIONS

| Scenario | Expected Volume | Strategy |
|----------|----------------|----------|
| Demo / presentation | < 500 memories | SQLite, all in-memory FAISS |
| Research experiments | 500–2000 items | SQLite with WAL mode |
| Stress test | Up to 10,000 items | SQLite WAL or PostgreSQL |
| Production scale | > 10,000 items | OUT OF SCOPE (v1) |

**SQLite WAL mode** (Write-Ahead Logging): enabled for development to support
concurrent reads during experiment analysis:
```python
# In core/database.py on SQLite:
from sqlalchemy import event
@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_conn, _):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
```

---
_Document Owner: AIMF Database Team_
_Status: APPROVED_
_Last Reviewed: 2026-07-14_
