# AIMF — Security Architecture
# Phase 1, Task 1.6
# Last Updated: 2026-07-14
# Status: APPROVED
# References: NFR-05..10, FR-15, ADR-004, NIST FIPS 197

---

## 1. SECURITY PRINCIPLES

The AIMF security architecture follows four principles:

1. **Least Privilege**: Only `core/security.py` has access to encryption keys.
   No other module imports it except `services/memory_service.py`.

2. **Defense in Depth**: Privacy risk is detected (Stage 3), governed (Decision Engine),
   then enforced (encryption at storage). Three independent checkpoints.

3. **Fail Safe**: On any cryptographic error, the operation FAILS CLOSED —
   the memory is NOT stored rather than stored in plaintext as a fallback.

4. **No Secret in Code**: Keys never appear in source code, Docker images,
   or committed configuration files. All secrets come from environment variables.

---

## 2. ENCRYPTION DESIGN (FR-15, NFR-06)

### 2.1 Algorithm Selection
**Algorithm:** AES-256-GCM (Advanced Encryption Standard, 256-bit key, Galois/Counter Mode)

**Why AES-256-GCM:**
- AES is FIPS 197 approved; 256-bit key is quantum-resistant for foreseeable future
- GCM mode provides **authenticated encryption**: ciphertext integrity is
  cryptographically verified on decryption — tampering is detectable
- GCM provides both confidentiality AND integrity in a single operation
- Industry standard for at-rest encryption (TLS 1.3, AWS, Google Cloud all use it)

**Prohibited algorithms (must never be used):**
- AES-ECB (no IV; identical blocks = identical ciphertext)
- AES-CBC without separate MAC (vulnerable to padding oracle)
- DES, 3DES (broken key length)
- RC4 (broken stream cipher)
- MD5, SHA-1 for any security purpose

### 2.2 Key Specification
```
Key size:    256 bits (32 bytes)
Key format:  base64-encoded, stored in AIMF_ENCRYPTION_KEY environment variable
Key scope:   Single application-wide key (v1 — no per-user or per-memory keys)
Key storage: Environment variable ONLY. Never in database, logs, or source code.
Key rotation: Manual process (v1 — requires re-encryption of all encrypted memories)
```

**Generating a valid key (for .env.example documentation):**
```python
import os, base64
key = base64.b64encode(os.urandom(32)).decode()
# Store result in AIMF_ENCRYPTION_KEY
```

### 2.3 Per-Encryption Operation
```
For each ENCRYPT_AND_STORE operation:

  nonce = os.urandom(12)         # 96 bits — MUST be random, MUST be unique per call
  key   = load_key_from_env()    # 32 bytes, decoded from base64

  encryptor = AESGCM(key)
  ciphertext_with_tag = encryptor.encrypt(nonce, plaintext_bytes, aad=None)

  # GCM output format: ciphertext || tag (last 16 bytes are authentication tag)
  ciphertext = ciphertext_with_tag[:-16]
  tag        = ciphertext_with_tag[-16:]

  # Store in database: three separate fields
  memory.ciphertext = ciphertext   # BLOB
  memory.nonce      = nonce        # BLOB (12 bytes)
  memory.tag        = tag          # BLOB (16 bytes)
  memory.content    = "[ENCRYPTED]"   # plaintext field replaced
  memory.is_encrypted = True
```

### 2.4 Decryption Operation
```
  encryptor = AESGCM(key)
  plaintext = encryptor.decrypt(
      nonce    = memory.nonce,
      data     = memory.ciphertext + memory.tag,   # tag must be appended back
      aad      = None
  )
  # If tag verification fails → raises InvalidTag exception
  # NEVER swallow this exception; propagate as 403 or 500
```

### 2.5 Nonce Safety
- Nonce is 96 bits (12 bytes), generated with `os.urandom(12)` per operation
- `os.urandom` uses the OS CSPRNG — cryptographically secure
- Birthday bound for 96-bit nonce: collision probability < 2^-32 at 2^32 operations
- At research scale (< 10,000 memories), nonce collision is computationally negligible
- Each nonce is stored with its ciphertext — no nonce reuse across memories

---

## 3. KEY MANAGEMENT

### 3.1 Loading the Key
```python
# core/security.py
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64, os

def _load_key() -> bytes:
    raw = os.environ.get("AIMF_ENCRYPTION_KEY")
    if not raw:
        raise RuntimeError(
            "AIMF_ENCRYPTION_KEY not set. "
            "Generate with: python -c \"import os,base64; print(base64.b64encode(os.urandom(32)).decode())\""
        )
    key_bytes = base64.b64decode(raw)
    if len(key_bytes) != 32:
        raise ValueError(f"AIMF_ENCRYPTION_KEY must decode to 32 bytes, got {len(key_bytes)}")
    return key_bytes
```

### 3.2 Key Validation at Startup
The application SHALL validate `AIMF_ENCRYPTION_KEY` during startup (in the
lifespan handler). If the key is absent or malformed, startup SHALL FAIL with
a clear error message. The application SHALL NOT start without a valid key.

```python
# In main.py lifespan:
async def lifespan(app):
    from core.security import validate_encryption_key
    validate_encryption_key()  # raises on invalid key — startup fails
    ...
    yield
```

### 3.3 Environment File Management
```
Repository contains:      .env.example     (committed — placeholder values only)
Repository does NOT have: .env             (gitignored — real values)

.env.example contents:
  AIMF_ENCRYPTION_KEY=<generate with: python -c "import os,base64; print(base64.b64encode(os.urandom(32)).decode())">
  AIMF_DATABASE_URL=sqlite:///./aimf.db
  AIMF_LOG_LEVEL=INFO
  ... (all other vars with placeholder values)
```

---

## 4. LOG SECURITY (NFR-08)

### 4.1 Log Redaction Rules
The logging framework SHALL apply automatic redaction before any log emission:

| Field | Action | Example output |
|-------|--------|----------------|
| Memory content (MEDIUM+ sensitivity) | Replace with `[CONTENT REDACTED]` | `content: [CONTENT REDACTED]` |
| Memory content (LOW sensitivity) | Log first 50 chars max | `content: "I prefer dark..."` |
| Encryption key | Never logged under any circumstance | — |
| Nonce / tag / ciphertext | Never logged | — |
| PII patterns found | Log pattern names only, not matched text | `patterns: ["email", "phone"]` |
| Error messages with content | Sanitize before logging | `error processing memory [hash: abc123]` |

### 4.2 Structured Log Format
```json
{
  "timestamp": "2026-07-14T14:30:00.123Z",
  "level": "INFO",
  "request_id": "req-uuid-here",
  "event": "memory_analyzed",
  "decision": "ENCRYPT_AND_STORE",
  "amgs_score": 0.62,
  "sensitivity": "HIGH",
  "latency_ms": 187,
  "content": "[CONTENT REDACTED]"
}
```

### 4.3 Implementation
```python
# core/logging.py
import logging, json
from core.config import settings

class RedactingFormatter(logging.Formatter):
    REDACT_FIELDS = {"content", "ciphertext", "nonce", "tag", "encryption_key"}

    def format(self, record):
        if hasattr(record, "extra"):
            for field in self.REDACT_FIELDS:
                if field in record.extra:
                    record.extra[field] = "[REDACTED]"
        return super().format(record)
```

---

## 5. INPUT VALIDATION SECURITY (NFR-09)

### 5.1 SQL Injection Prevention
- **All database queries use SQLAlchemy ORM or parameterized Core queries**
- Raw string SQL (`text()` with f-strings) is PROHIBITED everywhere
- Database inputs pass through Pydantic v2 validators before reaching the ORM

### 5.2 API Input Validation
```python
# All request bodies defined as Pydantic models:
class MemoryAnalyzeRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000, strip_whitespace=True)
    session_id: str | None = Field(None, max_length=128)

# FastAPI auto-validates and returns HTTP 422 on failure
```

### 5.3 Content Length Enforcement
- Max input: 1000 characters (FR-01)
- Min input: 1 character (non-whitespace)
- Enforced at Pydantic layer — never reaches the AI pipeline

---

## 6. THREAT MODEL

### 6.1 Threats In Scope (Research Prototype)

| ID | Threat | Mitigation |
|----|--------|------------|
| T-01 | Plaintext sensitive data in logs | NFR-08: Log redaction |
| T-02 | Sensitive memory readable from database file | FR-15: AES-256-GCM encryption |
| T-03 | Key hardcoded in source | NFR-05: Env var + .gitignore |
| T-04 | SQL injection via API inputs | NFR-09: ORM + Pydantic validation |
| T-05 | Ciphertext tampering (bit-flip attack) | AES-GCM auth tag detects tampering |
| T-06 | Nonce reuse (same nonce → key recovery) | `os.urandom(12)` per operation |
| T-07 | Accidental commit of .env file | .gitignore + pre-commit hook (Phase 9) |
| T-08 | Memory content leaked via error messages | Exception handler scrubs content |

### 6.2 Threats Explicitly OUT OF SCOPE

| Threat | Reason Out of Scope |
|--------|---------------------|
| Network-level TLS | Local Docker — not internet-facing |
| Authentication / authorization | Single-user local system |
| Memory poisoning attacks | Adversarial threats are security firewalls domain (ADR-004) |
| GDPR/HIPAA legal compliance | Architectural alignment only — not certifying |
| Multi-user isolation | Out of scope (ADR-002) |
| Key rotation procedure | Manual process for v1; v2 research future work |

---

## 7. SECURITY TESTING REQUIREMENTS

All security tests live in `backend/tests/unit/test_security.py`:

```
ST-01: encrypt() produces different ciphertext for same plaintext (nonce randomness)
ST-02: decrypt(encrypt(x)) == x (round-trip correctness)
ST-03: decrypt with wrong key raises InvalidTag
ST-04: decrypt with tampered ciphertext raises InvalidTag
ST-05: decrypt with tampered tag raises InvalidTag
ST-06: _load_key() raises RuntimeError if AIMF_ENCRYPTION_KEY not set
ST-07: _load_key() raises ValueError if key decodes to wrong length
ST-08: Startup fails if key is missing (integration test)
ST-09: Encrypted memory has content == "[ENCRYPTED]" in database
ST-10: Log output for HIGH sensitivity input contains "[CONTENT REDACTED]"
```

---
_Document Owner: AIMF Security Team_
_Status: APPROVED_
_Last Reviewed: 2026-07-14_
