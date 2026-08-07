# AIMF — Non-Functional Requirements Specification
# Phase 1, Task 1.2
# Last Updated: 2026-07-14
# Status: APPROVED

---

## OVERVIEW

Non-functional requirements define HOW the system behaves (quality attributes),
not WHAT it does. Each NFR has an ID (NFR-XX), category, priority, and
measurable acceptance criteria.

Categories: PERFORMANCE | SECURITY | RELIABILITY | MAINTAINABILITY |
            USABILITY | PORTABILITY | SCALABILITY | REPRODUCIBILITY

---

## PERFORMANCE

### NFR-01: Governance Decision Latency
**Priority:** MUST
**Requirement:** The end-to-end latency from receiving an analyze request to
returning a governance decision SHALL be ≤ 500ms at the 95th percentile,
measured under single-user local load.
**Measurement:** Automated timing in pytest benchmark suite.
**Rationale:** Live demonstration viability; research evaluation fairness.
**Exceptions:** Embedding generation may add ~50ms on first call (cold model load).
              This is acceptable; subsequent calls will be within budget.

---

### NFR-02: Semantic Search Latency
**Priority:** MUST
**Requirement:** Semantic similarity search over up to 10,000 stored memories
SHALL complete in ≤ 200ms at the 95th percentile (FAISS CPU index).
**Measurement:** Automated timing test with synthetic memory corpus.
**Rationale:** Research demonstration requires interactive query response.

---

### NFR-03: Embedding Model Load Time
**Priority:** SHOULD
**Requirement:** The sentence-transformers model SHALL be loaded once at
application startup. Model cold-start SHALL complete within 10 seconds.
**Measurement:** Application startup timing log.
**Rationale:** Demo restarts should be fast for live presentations.

---

### NFR-04: Memory Storage Throughput
**Priority:** SHOULD
**Requirement:** The system SHALL support storing at least 100 memory items
per minute under sequential single-user load without performance degradation.
**Measurement:** Load test script in experiments/ folder.
**Rationale:** Dataset loading and experiment execution speed.

---

## SECURITY

### NFR-05: No Secrets in Source Code
**Priority:** MUST
**Requirement:** No API keys, encryption keys, database passwords, or other
secrets SHALL appear in any source code file, configuration file committed
to git, or log output.
**Measurement:** Static scan with grep; CI check for common secret patterns.
**Implementation:** All secrets in .env file (gitignored). .env.example with
                   placeholder values committed instead.
**Rationale:** Open-source release safety; research ethics.

---

### NFR-06: AES-256-GCM Authenticated Encryption
**Priority:** MUST
**Requirement:** All ENCRYPT_AND_STORE decisions SHALL use AES-256-GCM
(Galois/Counter Mode) authenticated encryption with a randomly generated
96-bit nonce per encryption operation.
**Measurement:** Cryptography unit tests verifying algorithm, key size, nonce uniqueness.
**Rationale:** Authenticated encryption prevents ciphertext tampering.
              GCM mode is the current NIST recommended mode (FIPS 197 compatible).
**Prohibited:** ECB mode, CBC without MAC, DES, 3DES, RC4, MD5 for any purpose.

---

### NFR-07: Encryption Key Management
**Priority:** MUST
**Requirement:** The encryption key SHALL be loaded exclusively from the
AIMF_ENCRYPTION_KEY environment variable. The key SHALL be a 32-byte (256-bit)
value stored as a base64-encoded string.
**Measurement:** Unit test confirming key not loadable from any other source.
**Rationale:** Separation of key material from application code.

---

### NFR-08: No Plaintext Sensitive Data in Logs
**Priority:** MUST
**Requirement:** The structured logging system SHALL never emit the plaintext
content of any memory item classified as HIGH or CRITICAL sensitivity in any
log output at any log level.
**Measurement:** Log output inspection test: submit HIGH sensitivity input,
               verify log contains only "[REDACTED]" for content field.
**Rationale:** Log aggregation systems are a common data leakage vector.

---

### NFR-09: Input Validation
**Priority:** MUST
**Requirement:** All API inputs SHALL be validated using Pydantic v2 models
before processing. Invalid inputs SHALL return HTTP 422 with structured error
details. SQL injection and script injection attacks SHALL be mitigated by
parameterized queries (SQLAlchemy ORM, never raw string SQL).
**Measurement:** Security test suite with injection payloads.
**Rationale:** Minimal viable security posture for open-source publication.

---

### NFR-10: CORS Configuration
**Priority:** MUST
**Requirement:** FastAPI CORS middleware SHALL allow origins from localhost only
in development mode. CORS origins SHALL be configurable via environment variable
for any future deployment scenarios.
**Measurement:** HTTP header inspection in test suite.

---

## RELIABILITY

### NFR-11: Graceful Error Handling
**Priority:** MUST
**Requirement:** No unhandled exceptions SHALL reach the API client. All internal
errors SHALL be caught and returned as structured JSON error responses with
appropriate HTTP status codes (400, 422, 500) and RFC 7807 format.
**Measurement:** Error injection test suite covering all major failure modes.

---

### NFR-12: Database Transaction Integrity
**Priority:** MUST
**Requirement:** All database write operations SHALL be wrapped in transactions.
Failed transactions SHALL roll back completely with no partial writes persisted.
**Measurement:** Transaction failure injection tests.

---

### NFR-13: FAISS Index Persistence
**Priority:** SHOULD
**Requirement:** The FAISS vector index SHALL be persisted to disk on every
memory store operation and reloaded on application startup, so that semantic
search is not lost on restart.
**Measurement:** Restart test: verify indexed memories are searchable after restart.

---

## MAINTAINABILITY

### NFR-14: Modular Codebase Structure
**Priority:** MUST
**Requirement:** Backend code SHALL be organized into clearly separated modules:
  - api/ (FastAPI routers)
  - core/ (configuration, database, security)
  - models/ (SQLAlchemy ORM models)
  - schemas/ (Pydantic models)
  - services/ (business logic)
  - ai/ (AMGS engine, NLP pipeline, embeddings)
  - repositories/ (data access layer)
No module SHALL import directly from another module's internal implementation
(only from its public interface).
**Measurement:** Code review; import graph analysis.
**Rationale:** Testability, extensibility, and research reproducibility.

---

### NFR-15: Type Annotations
**Priority:** MUST
**Requirement:** All Python functions and methods SHALL have complete type
annotations for parameters and return values. Pydantic v2 SHALL be used for
all request/response schemas.
**Measurement:** mypy --strict should pass (with configured ignores for known stubs).
**Rationale:** Type safety prevents class of runtime bugs; improves IDE experience.

---

### NFR-16: Code Documentation
**Priority:** MUST
**Requirement:** All public functions, classes, and modules SHALL have docstrings.
Complex algorithm logic (AMGS scoring, decay functions) SHALL have inline comments
explaining the mathematical rationale.
**Measurement:** pydocstyle check on ai/ and core/ modules.

---

### NFR-17: Test Coverage
**Priority:** MUST
**Requirement:** Unit test coverage SHALL be ≥ 80% for the following modules:
  - ai/amgs_engine.py
  - ai/privacy_analyzer.py
  - ai/temporal_detector.py
  - ai/redundancy_detector.py
  - services/memory_service.py
  - core/security.py
Integration test coverage SHALL exist for all 28+ API endpoints.
**Measurement:** pytest --cov report.

---

### NFR-18: Configuration Management
**Priority:** MUST
**Requirement:** All configurable parameters (thresholds, weights, model names,
TTL defaults, batch sizes) SHALL be defined in a single settings module
(core/config.py) using Pydantic Settings, loaded from environment variables
with documented defaults.
**Measurement:** Verify no hardcoded constants in ai/ or services/ modules.

---

## USABILITY

### NFR-19: API Self-Documentation
**Priority:** MUST
**Requirement:** FastAPI's automatic OpenAPI documentation SHALL be available
at /docs (Swagger UI) and /redoc in development mode. All endpoints SHALL
have descriptive summaries and example request/response bodies.
**Measurement:** Manual verification; check all endpoints have description fields.

---

### NFR-20: Frontend Usability
**Priority:** SHOULD
**Requirement:** The research dashboard SHALL be usable by a non-technical
examiner without any explanation beyond a 30-second introduction. All governance
decisions SHALL be color-coded and labeled clearly.
**Measurement:** 30-second observer test with a non-technical person.

---

## PORTABILITY

### NFR-21: Docker Portability
**Priority:** MUST
**Requirement:** The complete system SHALL run identically on Windows 10+,
macOS 12+, and Ubuntu 22.04+ using Docker Desktop. No OS-specific code.
**Measurement:** Verified on Windows (primary) + one other OS if available.

---

### NFR-22: Python Version Compatibility
**Priority:** MUST
**Requirement:** Backend SHALL target Python 3.11. Code SHALL not use features
from Python 3.12+ without explicit documentation and conditional imports.
**Measurement:** CI runs on Python 3.11 explicitly.

---

### NFR-23: No Paid External Services
**Priority:** MUST
**Requirement:** The system SHALL function completely without any paid API calls,
cloud services, or licensed software. All models, databases, and tools SHALL
be free and open-source.
**Measurement:** Network isolation test: system runs with `--network=none` after
               Docker images and models are downloaded.
**Rationale:** Research reproducibility; any researcher can run it.

---

## SCALABILITY (Research Scope)

### NFR-24: Research-Scale Data Volume
**Priority:** MUST
**Requirement:** The system SHALL support a memory corpus of up to 10,000 items
in the SQLite/PostgreSQL database and FAISS index without configuration changes
or performance degradation beyond defined limits.
**Note:** Production-scale (millions of items) is explicitly OUT OF SCOPE.
         Research prototype scale only.

---

## REPRODUCIBILITY (Research-Specific)

### NFR-25: Deterministic Experiments
**Priority:** MUST
**Requirement:** All experiments SHALL produce identical results when run with
the same random seed, dataset, and configuration. Random seeds SHALL be
configurable and logged with experiment results.
**Measurement:** Run experiment twice with same seed → identical output files.
**Rationale:** Scientific reproducibility is mandatory for research publication.

---

### NFR-26: Experiment Isolation
**Priority:** MUST
**Requirement:** Experiments SHALL run in isolation: each experiment run SHALL
use a clean, separate database state. Production (demo) memories SHALL not be
mixed with experiment memories.
**Measurement:** Experiment runs use in-memory or separately named SQLite files.

---

### NFR-27: Dependency Locking
**Priority:** MUST
**Requirement:** All Python dependencies SHALL be pinned to exact versions in
requirements.txt (backend) or pyproject.toml. Frontend dependencies SHALL be
pinned in package-lock.json.
**Measurement:** `pip install -r requirements.txt` produces identical environment
               on any machine with Python 3.11.

---

## NFR SUMMARY

| Category | Count | Priority Breakdown |
|----------|-------|--------------------|
| Performance | 4 | 2 MUST, 2 SHOULD |
| Security | 6 | 6 MUST |
| Reliability | 3 | 2 MUST, 1 SHOULD |
| Maintainability | 5 | 5 MUST |
| Usability | 2 | 1 MUST, 1 SHOULD |
| Portability | 3 | 3 MUST |
| Scalability | 1 | 1 MUST |
| Reproducibility | 3 | 3 MUST |
| **TOTAL** | **27** | **24 MUST, 3 SHOULD** |

---
_Document Owner: AIMF Architecture Team_
_Status: APPROVED_
_Last Reviewed: 2026-07-14_
