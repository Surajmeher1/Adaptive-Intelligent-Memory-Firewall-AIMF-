"""
AIMF Core Logging
=================
Structured JSON logging with automatic content redaction.

Rules enforced (NFR-08):
  - Memory content with MEDIUM+ sensitivity → replaced with "[CONTENT REDACTED]"
  - Any field named in REDACT_FIELDS → value replaced with "[REDACTED]"
  - Log level configurable via AIMF_LOG_LEVEL env var

Usage:
    from core.logging import get_logger
    logger = get_logger(__name__)
    logger.info("memory_analyzed", extra={
        "decision": "ENCRYPT_AND_STORE",
        "amgs_score": 0.62,
        "content": "password: abc123",   # ← will be redacted
        "sensitivity": "CRITICAL",
    })
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any


# Fields that are ALWAYS redacted regardless of sensitivity level
ALWAYS_REDACT_FIELDS = frozenset({
    "encryption_key",
    "ciphertext",
    "nonce",
    "tag",
    "password",
    "secret",
    "api_key",
})

# Sensitivity levels at which 'content' is redacted
CONTENT_REDACT_SENSITIVITIES = frozenset({"MEDIUM", "HIGH", "CRITICAL"})


class StructuredJSONFormatter(logging.Formatter):
    """
    Formats log records as single-line JSON objects.
    Adds: timestamp, level, logger_name, message, and all `extra` fields.
    Redacts sensitive fields per NFR-08.
    """

    def format(self, record: logging.LogRecord) -> str:
        # Base log payload
        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Merge extra fields (set via logger.info(..., extra={...}))
        extra = getattr(record, "extra", {})
        if isinstance(extra, dict):
            payload.update(self._redact(extra))

        # Attach exception info if present
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str, ensure_ascii=False)

    def _redact(self, data: dict[str, Any]) -> dict[str, Any]:
        """Apply redaction rules to an extra-fields dict."""
        result: dict[str, Any] = {}
        sensitivity = data.get("sensitivity", "LOW")

        for key, value in data.items():
            # Rule 1: Always-redact fields
            if key in ALWAYS_REDACT_FIELDS:
                result[key] = "[REDACTED]"

            # Rule 2: 'content' field for MEDIUM+ sensitivity memories
            elif key == "content" and sensitivity in CONTENT_REDACT_SENSITIVITIES:
                result[key] = "[CONTENT REDACTED]"

            # Rule 3: Truncate LOW sensitivity content at 50 chars
            elif key == "content" and isinstance(value, str) and len(value) > 50:
                result[key] = value[:50] + "..."

            else:
                result[key] = value

        return result


class ContextLogger(logging.LoggerAdapter):
    """
    Logger adapter that automatically merges a context dict into every
    log record's extra field. Used to attach request_id to all logs
    within a single request lifecycle.

    Usage:
        base_logger = get_logger(__name__)
        logger = ContextLogger(base_logger, {"request_id": "req-abc"})
        logger.info("processing", extra={"decision": "REJECT"})
    """

    def process(
        self, msg: str, kwargs: dict[str, Any]
    ) -> tuple[str, dict[str, Any]]:
        existing_extra = kwargs.get("extra", {})
        merged = {**self.extra, **existing_extra}
        kwargs["extra"] = {"extra": merged}
        return msg, kwargs


def _build_handler() -> logging.StreamHandler:  # type: ignore[type-arg]
    """Build stdout stream handler with structured JSON formatter."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredJSONFormatter())
    return handler


def configure_logging(level: str = "INFO") -> None:
    """
    Configure root logging for the AIMF application.
    Called once at application startup (in main.py lifespan).

    Args:
        level: Log level string — DEBUG | INFO | WARNING | ERROR
    """
    numeric_level = getattr(logging, level.upper(), logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Remove any existing handlers (prevents duplicate logs in tests)
    root_logger.handlers.clear()
    root_logger.addHandler(_build_handler())

    # Silence noisy third-party loggers
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sentence_transformers").setLevel(logging.WARNING)
    logging.getLogger("transformers").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Get a module-level logger.

    Usage:
        logger = get_logger(__name__)
        logger.info("event", extra={"key": "value"})
    """
    return logging.getLogger(name)
