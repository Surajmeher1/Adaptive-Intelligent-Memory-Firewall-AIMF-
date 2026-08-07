"""
AIMF Core Configuration
=======================
Pydantic Settings model — loads all configuration from environment variables.
All values have documented defaults. Secrets (encryption key) have NO default
and will raise a clear error if missing.

Usage:
    from core.config import settings
    print(settings.aimf_env)
"""

from __future__ import annotations

from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """
    Single source of truth for all AIMF configuration.
    All fields are loaded from environment variables (case-insensitive).
    .env file is auto-loaded if present in the working directory.
    """

    model_config = SettingsConfigDict(
        env_prefix="AIMF_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── Application ─────────────────────────────────────────────────────────
    env: Literal["development", "production", "test"] = Field(
        default="development",
        description="Runtime environment",
    )
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO",
        description="Logging verbosity",
    )
    cors_origins: str = Field(
        default="http://localhost:5173",
        description="Comma-separated allowed CORS origins",
    )
    api_version: str = Field(default="1.0.0", description="API version string")

    # ─── REQUIRED: Encryption Key ────────────────────────────────────────────
    encryption_key: str = Field(
        ...,  # no default — startup fails if not set
        description=(
            "Base64-encoded 32-byte AES-256 key. "
            "Generate: python -c \"import os,base64; print(base64.b64encode(os.urandom(32)).decode())\""
        ),
    )

    # ─── Database ────────────────────────────────────────────────────────────
    database_url: str = Field(
        default="sqlite+aiosqlite:///./aimf.db",
        description="SQLAlchemy async database URL",
    )

    # ─── AI Models ───────────────────────────────────────────────────────────
    embedding_model: str = Field(
        default="all-MiniLM-L6-v2",
        description="sentence-transformers model name",
    )
    spacy_model: str = Field(
        default="en_core_web_sm",
        description="spaCy model name",
    )
    faiss_index_path: str = Field(
        default="./faiss_index.bin",
        description="Path to persist/load FAISS index",
    )
    embedding_dim: int = Field(
        default=384,
        description="Embedding dimension (must match embedding_model output)",
    )

    # ─── AMGS Weights (v1) ───────────────────────────────────────────────────
    # Positive factors
    weight_u: float = Field(default=0.25, ge=0.0, le=1.0, description="Usefulness weight (α)")
    weight_c: float = Field(default=0.15, ge=0.0, le=1.0, description="Context relevance weight (β)")
    weight_f: float = Field(default=0.15, ge=0.0, le=1.0, description="Frequency weight (γ)")
    weight_n: float = Field(default=0.20, ge=0.0, le=1.0, description="Novelty weight (δ)")
    # Penalty factors
    weight_r: float = Field(default=0.10, ge=0.0, le=1.0, description="Redundancy penalty weight (ε)")
    weight_p: float = Field(default=0.10, ge=0.0, le=1.0, description="Privacy risk penalty weight (ζ)")
    weight_d: float = Field(default=0.05, ge=0.0, le=1.0, description="Temporal decay penalty weight (η)")

    # ─── Decision Thresholds ─────────────────────────────────────────────────
    threshold_long_term: float = Field(
        default=0.75, ge=0.0, le=1.0,
        description="AMGS ≥ this → STORE_LONG_TERM",
    )
    threshold_store: float = Field(
        default=0.50, ge=0.0, le=1.0,
        description="AMGS ≥ this → STORE_TEMPORARY (if not long_term)",
    )
    threshold_summarize: float = Field(
        default=0.30, ge=0.0, le=1.0,
        description="AMGS ≥ this → SUMMARIZE_AND_STORE (minimum storage bar)",
    )
    threshold_forget: float = Field(
        default=0.15, ge=0.0, le=1.0,
        description="Decayed AMGS < this → FORGET (background task)",
    )
    threshold_encrypt: float = Field(
        default=0.85, ge=0.0, le=1.0,
        description="privacy_risk ≥ this → ENCRYPT_AND_STORE",
    )
    threshold_reject_priv: float = Field(
        default=0.95, ge=0.0, le=1.0,
        description="privacy_risk ≥ this → REJECT (unconditional)",
    )
    threshold_redundancy: float = Field(
        default=0.85, ge=0.0, le=1.0,
        description="cosine similarity ≥ this → MERGE_WITH_EXISTING",
    )

    # ─── Memory Lifecycle ────────────────────────────────────────────────────
    decay_function: Literal["exponential", "linear", "step"] = Field(
        default="exponential",
        description="Temporal decay function type",
    )
    decay_half_life_days: int = Field(
        default=30, ge=1,
        description="Half-life in days for exponential decay",
    )
    expiry_check_interval_hours: int = Field(
        default=1, ge=1,
        description="How often to check for expired STORE_TEMPORARY memories",
    )
    forgetting_task_interval_hours: int = Field(
        default=24, ge=1,
        description="How often to run the forgetting background task",
    )
    context_window_size: int = Field(
        default=10, ge=1, le=100,
        description="Number of recent memories for context relevance computation",
    )
    context_window_minutes: int = Field(
        default=30, ge=1,
        description="Time window for recent memories (minutes)",
    )

    # ─── Experiments ─────────────────────────────────────────────────────────
    experiment_seed: int = Field(
        default=42,
        description="Default random seed for experiments (RR-03)",
    )
    experiment_db_path: str = Field(
        default="./experiment.db",
        description="SQLite path for experiment databases (separate from demo DB)",
    )

    # ─── JWT Authentication ──────────────────────────────────────────────────
    jwt_secret_key: str = Field(
        default="aimf-dev-secret-change-in-production-immediately",
        description="Secret key for signing JWT tokens. MUST be changed in production.",
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT signing algorithm")
    jwt_expiry_minutes: int = Field(
        default=30, ge=1,
        description="Access token expiry in minutes",
    )
    jwt_refresh_expiry_days: int = Field(
        default=7, ge=1,
        description="Refresh token expiry in days",
    )

    # ─── Validators ──────────────────────────────────────────────────────────

    @field_validator("encryption_key")
    @classmethod
    def validate_encryption_key(cls, v: str) -> str:
        """
        Validates that AIMF_ENCRYPTION_KEY decodes to exactly 32 bytes.
        This runs at Settings instantiation — app fails to start with a clear
        error rather than silently using a wrong key.
        """
        import base64
        try:
            decoded = base64.b64decode(v)
        except Exception as exc:
            raise ValueError(
                "AIMF_ENCRYPTION_KEY must be a valid base64-encoded string. "
                f"Decoding failed: {exc}"
            ) from exc
        if len(decoded) != 32:
            raise ValueError(
                f"AIMF_ENCRYPTION_KEY must decode to exactly 32 bytes (256-bit AES key). "
                f"Got {len(decoded)} bytes. "
                "Generate a valid key with: "
                "python -c \"import os,base64; print(base64.b64encode(os.urandom(32)).decode())\""
            )
        return v

    @field_validator("threshold_summarize")
    @classmethod
    def threshold_order(cls, v: float, info: "FieldValidationInfo") -> float:
        """Ensure storage thresholds are in logical order."""
        # Note: full cross-field validation done in model_post_init
        return v

    def model_post_init(self, __context: object) -> None:
        """Post-init validation: check threshold ordering."""
        assert self.threshold_reject_priv > self.threshold_encrypt, (
            "threshold_reject_priv must be > threshold_encrypt"
        )
        assert self.threshold_long_term > self.threshold_store, (
            "threshold_long_term must be > threshold_store"
        )
        assert self.threshold_store > self.threshold_summarize, (
            "threshold_store must be > threshold_summarize"
        )
        assert self.threshold_summarize > self.threshold_forget, (
            "threshold_summarize must be > threshold_forget"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def is_development(self) -> bool:
        return self.env == "development"

    @property
    def is_test(self) -> bool:
        return self.env == "test"


# ─── Singleton ───────────────────────────────────────────────────────────────
# Imported as: from core.config import settings
# Note: In tests, override with:
#   from unittest.mock import patch
#   with patch("core.config.settings", test_settings):
#       ...

settings = Settings()  # type: ignore[call-arg]
# The `type: ignore` is needed because mypy sees encryption_key as required
# but it IS provided via environment. This is a known pydantic-settings pattern.
