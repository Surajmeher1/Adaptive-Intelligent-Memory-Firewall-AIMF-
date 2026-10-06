"""
AIMF Core Security — AES-256-GCM Encryption
============================================
Implements authenticated encryption for ENCRYPT_AND_STORE memories.

Algorithm:   AES-256-GCM (NIST FIPS 197, Galois/Counter Mode)
Key size:    256-bit (32 bytes), base64-encoded in env var
Nonce size:  96-bit (12 bytes), generated with os.urandom per call
Tag size:    128-bit (16 bytes), appended to ciphertext by AESGCM

Security properties:
  - Confidentiality: AES-256 cipher
  - Integrity:       GCM authentication tag detects any tampering
  - Nonce reuse resistance: fresh os.urandom(12) per encrypt() call
  - Key separation:  key loaded exclusively from AIMF_ENCRYPTION_KEY env var

References: docs/SECURITY_ARCHITECTURE.md §2, NFR-06, FR-15, ADR-004
"""

from __future__ import annotations

import base64
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import bcrypt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag  # re-exported for callers
from jose import JWTError, jwt

from core.config import settings


@dataclass(frozen=True)
class EncryptedPayload:
    """
    Result of a single encrypt() call.
    All three fields must be stored together and provided to decrypt().

    Attributes:
        ciphertext: Encrypted bytes (without GCM tag)
        nonce:      12-byte random nonce used for this operation
        tag:        16-byte GCM authentication tag
    """
    ciphertext: bytes
    nonce: bytes
    tag: bytes


def _load_key() -> bytes:
    """
    Load and decode the AES-256 key from AIMF_ENCRYPTION_KEY.

    Raises:
        RuntimeError: If the environment variable is not set.
        ValueError:   If the decoded key is not exactly 32 bytes.

    The key is loaded fresh on each call to avoid caching it in memory
    longer than necessary. In a high-throughput system you would cache it,
    but for research scale this is acceptable.
    """
    raw = os.environ.get("AIMF_ENCRYPTION_KEY")
    if not raw:
        try:
            from core.config import settings
            raw = getattr(settings, "encryption_key", None)
        except Exception:
            pass
    if not raw:
        raise RuntimeError(
            "AIMF_ENCRYPTION_KEY environment variable is not set. "
            "Generate a key with: "
            "python -c \"import os,base64; print(base64.b64encode(os.urandom(32)).decode())\""
        )
    try:
        key_bytes = base64.b64decode(raw)
    except Exception as exc:
        raise ValueError(
            f"AIMF_ENCRYPTION_KEY is not valid base64: {exc}"
        ) from exc

    if len(key_bytes) != 32:
        raise ValueError(
            f"AIMF_ENCRYPTION_KEY must decode to exactly 32 bytes (256-bit AES key). "
            f"Got {len(key_bytes)} bytes."
        )
    return key_bytes


def validate_encryption_key() -> None:
    """
    Validate the encryption key at startup.
    Called from the FastAPI lifespan handler so the app fails FAST
    with a clear error if the key is missing or malformed.

    Raises:
        RuntimeError or ValueError from _load_key()
    """
    _load_key()  # raises on error


def encrypt(plaintext: str) -> EncryptedPayload:
    """
    Encrypt a plaintext string using AES-256-GCM.

    A fresh 96-bit nonce is generated for every call using os.urandom,
    which reads from the OS CSPRNG. This guarantees nonce uniqueness
    across calls (with overwhelming probability at research scale).

    Args:
        plaintext: The UTF-8 string to encrypt.

    Returns:
        EncryptedPayload with (ciphertext, nonce, tag).

    Raises:
        RuntimeError: If AIMF_ENCRYPTION_KEY is not set.
        ValueError:   If the key has wrong length.
    """
    key = _load_key()
    nonce = os.urandom(12)  # 96-bit nonce — must be unique per key

    aesgcm = AESGCM(key)
    # AESGCM.encrypt returns: ciphertext || tag (tag is last 16 bytes)
    # Pass aad positionally (cryptography 44+ requires positional args)
    ciphertext_with_tag = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)

    ciphertext = ciphertext_with_tag[:-16]
    tag = ciphertext_with_tag[-16:]

    return EncryptedPayload(ciphertext=ciphertext, nonce=nonce, tag=tag)


def decrypt(payload: EncryptedPayload) -> str:
    """
    Decrypt an EncryptedPayload back to plaintext string.

    The GCM authentication tag is verified before decryption.
    If the ciphertext or tag has been tampered with, InvalidTag is raised.

    Args:
        payload: EncryptedPayload from a previous encrypt() call.

    Returns:
        Decrypted plaintext string.

    Raises:
        InvalidTag:   If ciphertext or tag has been tampered with.
        RuntimeError: If AIMF_ENCRYPTION_KEY is not set.
        ValueError:   If the key has wrong length.
    """
    key = _load_key()
    aesgcm = AESGCM(key)

    # Re-assemble ciphertext_with_tag for AESGCM.decrypt
    ciphertext_with_tag = payload.ciphertext + payload.tag

    # decrypt raises InvalidTag automatically if authentication fails
    # Pass aad positionally (cryptography 44+ requires positional args)
    plaintext_bytes = aesgcm.decrypt(payload.nonce, ciphertext_with_tag, None)
    return plaintext_bytes.decode("utf-8")


def decrypt_from_parts(ciphertext: bytes, nonce: bytes, tag: bytes) -> str:
    """
    Convenience wrapper: decrypt from raw DB column values.

    Args:
        ciphertext: Bytes from memories.ciphertext column.
        nonce:      Bytes from memories.nonce column.
        tag:        Bytes from memories.tag column.

    Returns:
        Decrypted plaintext string.

    Raises:
        InvalidTag on tamper detection.
    """
    return decrypt(EncryptedPayload(ciphertext=ciphertext, nonce=nonce, tag=tag))


# ─── Password Hashing & Verification (bcrypt) ─────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt with a fresh salt."""
    pw_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


# ─── JWT Token Management (python-jose) ───────────────────────────────────────

def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Generate a signed JWT access token.
    Payload includes 'sub' (user_id), 'role', 'type': 'access', and 'exp'.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.jwt_expiry_minutes)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Generate a signed JWT refresh token.
    Payload includes 'sub' (user_id), 'role', 'type': 'refresh', and 'exp'.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(days=settings.jwt_refresh_expiry_days)
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT token.
    Raises JWTError if expired, malformed, or signature invalid.
    """
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )
