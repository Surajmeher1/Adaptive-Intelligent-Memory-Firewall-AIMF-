"""
AIMF Integration Tests — Health API
=====================================
Tests the GET /api/v1/health endpoint.

Covers:
  - IT-H-01: Status 200 on successful health check
  - IT-H-02: All required fields present
  - IT-H-03: Database component shows 'ok'
  - IT-H-04: Encryption component shows 'ok' (key is set in conftest)
  - IT-H-05: Overall status is 'healthy' or 'degraded' (never 'unhealthy' in test env)
"""

from __future__ import annotations

import pytest


@pytest.mark.anyio
async def test_health_returns_200(client):
    """IT-H-01: Health endpoint returns HTTP 200."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200


@pytest.mark.anyio
async def test_health_response_shape(client):
    """IT-H-02: All required top-level fields are present."""
    response = await client.get("/api/v1/health")
    data = response.json()

    required_fields = {"status", "version", "timestamp", "environment", "components",
                       "memory_count", "index_size"}
    assert required_fields.issubset(data.keys()), (
        f"Missing fields: {required_fields - data.keys()}"
    )


@pytest.mark.anyio
async def test_health_components_present(client):
    """IT-H-02: All component status fields are present."""
    response = await client.get("/api/v1/health")
    components = response.json()["components"]

    expected = {"database", "faiss_index", "embedding_model", "nlp_model", "encryption"}
    assert expected.issubset(components.keys())


@pytest.mark.anyio
async def test_health_database_ok(client):
    """IT-H-03: Database component is 'ok' (in-memory SQLite in test env)."""
    response = await client.get("/api/v1/health")
    assert response.json()["components"]["database"] == "ok"


@pytest.mark.anyio
async def test_health_encryption_ok(client):
    """IT-H-04: Encryption is 'ok' because AIMF_ENCRYPTION_KEY is set in conftest."""
    response = await client.get("/api/v1/health")
    assert response.json()["components"]["encryption"] == "ok"


@pytest.mark.anyio
async def test_health_status_not_unhealthy(client):
    """IT-H-05: Status is never 'unhealthy' in test environment (DB + encryption work)."""
    response = await client.get("/api/v1/health")
    status = response.json()["status"]
    assert status in ("healthy", "degraded"), f"Unexpected status: {status}"


@pytest.mark.anyio
async def test_health_version_present(client):
    """IT-H-02: API version string is present and non-empty."""
    response = await client.get("/api/v1/health")
    version = response.json()["version"]
    assert version and len(version) > 0


@pytest.mark.anyio
async def test_root_redirect(client):
    """Root path returns expected API metadata."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "AIMF" in data["name"]
    assert data["health"] == "/api/v1/health"
