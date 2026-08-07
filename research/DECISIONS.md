# AIMF Architecture Decision Records (ADRs)
## Project: projtest1000 | Author: i_suraj_001

This document records every significant architectural decision made during the
project lifecycle, the context that motivated it, the options considered, and
the rationale for the choice made.

---

## ADR-001 — Database ORM: SQLAlchemy 2.0 Async

**Status:** Accepted  
**Date:** Phase 1  
**Decider:** i_suraj_001

### Context
The memory store needs concurrent async access (FastAPI endpoints + background tasks). Options: raw asyncpg, SQLAlchemy 1.4 sync, SQLAlchemy 2.0 async, Tortoise ORM.

### Decision
Use **SQLAlchemy 2.0 with asyncio** (`AsyncSession`, `async_scoped_session`).

### Rationale
- Battle-tested, production-grade ORM with Alembic migration support
- 2.0 async API is idiomatic with FastAPI
- `async_scoped_session` prevents session sharing across tasks
- Supports both SQLite (dev) and PostgreSQL (prod) without code changes

### Consequences
- Background tasks must use `async_scoped_session` (not the request-scoped `DBSession`)
- FAISS index is not ORM-managed; must persist separately on disk

---

## ADR-002 — Vector Index: FAISS IndexFlatIP

**Status:** Accepted  
**Date:** Phase 1  
**Decider:** i_suraj_001

### Context
Novelty scoring (N) and context relevance (C) require approximate nearest-neighbour search over 384-dimensional sentence embeddings. Options: FAISS IndexFlatIP, FAISS IVF, Annoy, Qdrant.

### Decision
Use **FAISS IndexFlatIP** with L2-normalised vectors (cosine similarity).

### Rationale
- Zero external service dependency (in-process)
- Exact search: no approximation error for initial implementation
- Inner product on normalised vectors = cosine similarity
- Trivial to serialize/deserialize to disk (`faiss.write_index`)

### Consequences
- O(n) query time — will need IVF or HNSW at >50,000 memories (FW3)
- FAISS is not multiprocess-safe → must run with single uvicorn worker
- Index is loaded at startup; hot-updates via `index.add()` after each stored memory

---

## ADR-003 — Encryption: AES-256-GCM via Fernet

**Status:** Accepted  
**Date:** Phase 2  
**Decider:** i_suraj_001

### Context
Memories with privacy_risk > 0.70 must be encrypted at rest (NFR-03). Options: AES-CBC, AES-GCM, ChaCha20-Poly1305, Fernet.

### Decision
Use **Fernet** (from the `cryptography` library), which implements AES-128-CBC-HMAC-SHA256 under the hood, with a 32-byte URL-safe base64 key.

### Rationale
- High-level API: no IV management, no padding — encryption mistakes are prevented by design
- Built-in authentication (HMAC): tamper-evident ciphertext
- Python standard: well-audited, no C extension risk
- Key stored in `AIMF_ENCRYPTION_KEY` env var, validated at startup (fail-fast)

### Consequences
- Fernet is technically AES-128, not AES-256 — acceptable for research; production should evaluate NaCl/libsodium
- Encrypted content cannot be semantically searched — FAISS index only stores embeddings of pre-encryption content
- Key rotation requires re-encrypting all STORE_ENCRYPT memories (not yet implemented)

---

## ADR-004 — Audit Trail: Append-Only LifecycleEvent

**Status:** Accepted  
**Date:** Phase 2  
**Decider:** i_suraj_001

### Context
NFR-06 requires an audit trail. RR-22 requires "right to be forgotten" without physical deletion. Options: soft-delete flag, status enum, separate audit table, event sourcing.

### Decision
Use a **separate `lifecycle_events` table** with append-only semantics and factory class methods on `LifecycleEvent`.

### Rationale
- Append-only: no UPDATE or DELETE — audit integrity guaranteed at DB layer
- Factory methods (`created()`, `accessed()`, `forgotten()`, etc.) prevent accidental misuse
- FORGET operation sets `status=FORGOTTEN` on the Memory row and writes a `forgotten` event — the row is never deleted
- `amgs_before`/`amgs_after` on each event enables AMGS decay auditing

### Consequences
- `lifecycle_events` will grow unboundedly — requires archival policy for production
- Querying full history requires a JOIN or a separate lifecycle API endpoint (implemented: `/memory/{id}/lifecycle`)

---

## ADR-005 — AMGS Weights (The Core Formula)

**Status:** Accepted  
**Date:** Phase 1 (validated Phase 3)  
**Decider:** i_suraj_001

### Context
The AMGS formula needs weights for 7 factors. Options: equal weights (1/7 each), expert-set weights, learned weights (logistic regression on labelled corpus).

### Decision
Use **expert-set weights**: U=0.25, C=0.20, N=0.20, F=0.10, R=0.10, P=0.10, D=0.05

### Rationale
- U and N are the most important signals: only useful, novel content deserves long-term storage
- C is important for session coherence but context can be absent (neutral 0.50 baseline)
- F is a secondary signal — frequency alone doesn't make content worth storing
- R and P are penalty terms — high values should reduce but not dominate the score
- D is lowest weight because temporal content is valuable short-term (STORE_TEMPORARY), not worthless
- Privacy and redundancy are handled via hard thresholds in addition to score: P>0.70 → always encrypt; R>0.85 → always reject

### Consequences
- Weights are static — may not generalise to all domains (see FW1: adaptive weight learning)
- The formula produces AMGS ∈ [−0.25, 1.25] before normalisation clamp to [0,1]
- Ground-truth validation on standard corpus: 80% accuracy

---

## ADR-006 — Background Tasks: asyncio.Event-based Cancellation

**Status:** Accepted  
**Date:** Phase 4  
**Decider:** i_suraj_001

### Context
Background tasks (expiry checker, AMGS decay runner) must not leak on server restart. Options: `asyncio.create_task` + global cancel, Celery, APScheduler, `asyncio.Event`.

### Decision
Use an **`asyncio.Event` stop signal** passed into each background task loop, set during FastAPI `lifespan` shutdown.

### Rationale
- Zero external dependencies (no Celery, no Redis)
- Clean shutdown: tasks check `stop_event.is_set()` and exit gracefully
- Tasks created inside `lifespan` context → automatically garbage-collected on shutdown
- `asyncio.Event` is thread-safe and compatible with `asyncio.wait_for`

### Consequences
- Tasks are in-process only — no persistence across restarts
- If uvicorn is killed (SIGKILL), tasks cannot clean up — acceptable for development
- Production should consider a proper task queue (Celery + Redis) for reliability

---

## ADR-007 — API Versioning: /api/v1/ prefix

**Status:** Accepted  
**Date:** Phase 1  
**Decider:** i_suraj_001

### Context
The API will evolve. Versioning strategy: URL prefix, Accept header, query parameter.

### Decision
Use **URL prefix versioning**: all endpoints under `/api/v1/`.

### Rationale
- Explicit, human-readable, cache-friendly
- Consistent with industry standard (GitHub API, Stripe API)
- Simple proxy configuration (Vite dev server proxies `/api` to `:8001`)
- Allows future `/api/v2/` without breaking existing clients

---

## ADR-008 — Frontend Framework: React + Vite

**Status:** Accepted  
**Date:** Phase 5  
**Decider:** i_suraj_001

### Context
The research dashboard needs charts (Recharts), animations (Framer Motion), and TypeScript. Options: Next.js, plain HTML/JS, SvelteKit, React+Vite.

### Decision
Use **React 18 + Vite 5** with TypeScript and vanilla CSS design system.

### Rationale
- Vite: near-instant HMR, no webpack configuration overhead
- React 18: concurrent features, Suspense for data fetching
- TypeScript: type safety across all API response shapes (mirrors Pydantic schemas)
- Vanilla CSS: full control over design tokens, no Tailwind purge complexity
- Recharts: composable, SVG-based, works with Recharts' responsive containers

### Consequences
- No SSR — purely client-side SPA (acceptable for a research tool, not a public website)
- Vite proxy forwards `/api` to backend at `:8001`; both services must be running simultaneously

---

## ADR-009 — Right to Erasure: FORGOTTEN Status (No Physical Delete)

**Status:** Accepted  
**Date:** Phase 4  
**Decider:** i_suraj_001

### Context
GDPR Art. 17 requires right to erasure. Physical deletion destroys audit integrity. Options: hard DELETE, soft-delete flag, status=FORGOTTEN.

### Decision
Memory rows are **never physically deleted**. The `DELETE /api/v1/memory/{id}` endpoint sets `status=FORGOTTEN`, nulls the content and embedding, and writes a `forgotten` LifecycleEvent.

### Rationale
- Audit trail (ADR-004) requires the row to persist for lifecycle history
- `status=FORGOTTEN` rows are excluded from all queries (list, search, analyze)
- The `content` and `embedding` fields are nulled — personal data is gone, only metadata remains
- This satisfies GDPR "erasure" in spirit: the personal data is removed, only audit metadata persists

### Consequences  
- The `id` and `created_at` of a forgotten memory are retained — this is necessary for audit trail integrity and is not considered personal data under GDPR Recital 26
- FAISS index is **not** updated on forget — stale embeddings remain in the index (scheduled for FW6: index compaction)
