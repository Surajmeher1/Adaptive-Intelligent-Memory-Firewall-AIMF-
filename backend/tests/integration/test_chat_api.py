"""
AIMF Integration Tests — Chat API & Two-Role User Workflow
===========================================================
Tests covering:
  - User registration & authenticated chat session flow
  - Session creation, listing, deletion
  - AIMF governance pipeline execution on chat messages
  - Memory persistence for approved messages
  - Privacy interception & badges
  - History retrieval
  - Auth protection (401 on missing token)
"""

from __future__ import annotations

import asyncio
import os
import uuid
import pytest
from fastapi.testclient import TestClient

# Ensure test env configuration
os.environ.setdefault("AIMF_ENCRYPTION_KEY", "aimf_test_key_exactly_32bytes!!!")
os.environ.setdefault("AIMF_DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("AIMF_ENV", "testing")


@pytest.fixture(scope="module")
def client():
    """Create TestClient with shared in-memory DB."""
    from main import create_app
    app = create_app()

    from core.database import engine, Base

    async def init_tables():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(init_tables())

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture(scope="module")
def registered_user_headers(client: TestClient) -> dict[str, str]:
    """Register a new USER account and return Authorization headers."""
    email = f"chatuser_{uuid.uuid4().hex[:8]}@example.com"
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePassword123!",
            "full_name": "Chatbot Enduser",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    token = data["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestChatAuth:
    def test_unauthorized_endpoints(self, client: TestClient):
        """Chat endpoints reject requests without a valid token."""
        r1 = client.post("/api/v1/chat/sessions", json={"title": "Test"})
        assert r1.status_code == 401

        r2 = client.get("/api/v1/chat/sessions")
        assert r2.status_code == 401

        r3 = client.post("/api/v1/chat/sessions/fake-id/messages", json={"content": "Hello"})
        assert r3.status_code == 401


class TestChatSessions:
    def test_create_and_list_sessions(self, client: TestClient, registered_user_headers: dict[str, str]):
        """User can create and list chat sessions."""
        res = client.post(
            "/api/v1/chat/sessions",
            headers=registered_user_headers,
            json={"title": "Project Planning"},
        )
        assert res.status_code == 201
        session_data = res.json()
        assert session_data["title"] == "Project Planning"
        assert "id" in session_data

        session_id = session_data["id"]

        list_res = client.get("/api/v1/chat/sessions", headers=registered_user_headers)
        assert list_res.status_code == 200
        items = list_res.json()
        assert len(items) >= 1
        assert any(s["id"] == session_id for s in items)

    def test_delete_session(self, client: TestClient, registered_user_headers: dict[str, str]):
        """Deleting a session cascades and removes it from list."""
        res = client.post(
            "/api/v1/chat/sessions",
            headers=registered_user_headers,
            json={"title": "Session to Delete"},
        )
        assert res.status_code == 201
        session_id = res.json()["id"]

        del_res = client.delete(
            f"/api/v1/chat/sessions/{session_id}",
            headers=registered_user_headers,
        )
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "ok"

        # Getting history for deleted session returns 404
        hist_res = client.get(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=registered_user_headers,
        )
        assert hist_res.status_code == 404


class TestChatMessageGovernance:
    def test_send_message_governed_and_history(
        self, client: TestClient, registered_user_headers: dict[str, str]
    ):
        """User sends message; AIMF pipeline scores and persists memory."""
        # 1. Create session
        s_res = client.post(
            "/api/v1/chat/sessions",
            headers=registered_user_headers,
            json={"title": "My Coding Notes"},
        )
        session_id = s_res.json()["id"]

        # 2. Send high-value preference message
        msg_res = client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=registered_user_headers,
            json={"content": "I prefer using Python 3.12 with async FastAPI for building scalable microservices."},
        )
        assert msg_res.status_code == 200
        data = msg_res.json()

        assert "user_message" in data
        assert "assistant_message" in data
        assert "aimf_decision" in data
        assert "amgs_score" in data
        assert "rationale" in data

        assert data["user_message"]["role"] == "user"
        assert data["assistant_message"]["role"] == "assistant"
        assert 0.0 <= data["amgs_score"] <= 1.0

        # 3. Retrieve history
        h_res = client.get(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=registered_user_headers,
        )
        assert h_res.status_code == 200
        history = h_res.json()
        assert history["total"] == 2
        assert history["messages"][0]["role"] == "user"
        assert history["messages"][1]["role"] == "assistant"

    def test_send_privacy_sensitive_message(
        self, client: TestClient, registered_user_headers: dict[str, str]
    ):
        """Messages with critical PII are intercepted by privacy stage."""
        s_res = client.post(
            "/api/v1/chat/sessions",
            headers=registered_user_headers,
            json={"title": "PII Test"},
        )
        session_id = s_res.json()["id"]

        msg_res = client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=registered_user_headers,
            json={"content": "My secret password is SuperSecretPassword123! and my SSN is 000-12-3456"},
        )
        assert msg_res.status_code == 200
        data = msg_res.json()

        # Decision should reflect rejection or encryption
        assert data["aimf_decision"] in ("REJECT", "REJECT_PRIVACY", "STORE_ENCRYPT")

    def test_assistant_reply_is_generative_ai_without_governance_leak(
        self, client: TestClient, registered_user_headers: dict[str, str]
    ):
        """Verify the assistant message is a natural response and does not expose AIMF internals."""
        s_res = client.post(
            "/api/v1/chat/sessions",
            headers=registered_user_headers,
            json={"title": "Natural Chat Flow"},
        )
        session_id = s_res.json()["id"]

        msg_res = client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=registered_user_headers,
            json={"content": "Hello, my name is Alex! What can you help me with?"},
        )
        assert msg_res.status_code == 200
        data = msg_res.json()

        assistant_content = data["assistant_message"]["content"]

        # 1. Natural AI response generated
        assert len(assistant_content) > 10
        assert "Alex" in assistant_content or "help" in assistant_content.lower()

        # 2. Zero governance leaks in assistant dialogue
        assert "AIMF Rationale" not in assistant_content
        assert "AMGS" not in assistant_content
        assert "AIMF Decision" not in assistant_content
        assert "✅ Your message has been stored" not in assistant_content
        assert "⚠️ Your message was reviewed but not stored" not in assistant_content

        # 3. Governance metadata is preserved cleanly at the root level for UI badges
        assert data["aimf_decision"] is not None
        assert data["rationale"] is not None
        assert isinstance(data["memory_persisted"], bool)

    def test_chat_streaming_sse_endpoint(
        self, client: TestClient, registered_user_headers: dict[str, str]
    ):
        """Verify the SSE streaming endpoint emits governance, token, and done events."""
        s_res = client.post(
            "/api/v1/chat/sessions",
            headers=registered_user_headers,
            json={"title": "Streaming Test"},
        )
        assert s_res.status_code == 201
        session_id = s_res.json()["id"]

        with client.stream(
            "POST",
            f"/api/v1/chat/sessions/{session_id}/messages/stream",
            headers=registered_user_headers,
            json={"content": "What is Python in one sentence?"},
        ) as response:
            assert response.status_code == 200
            assert "text/event-stream" in response.headers.get("content-type", "")

            body = response.read().decode("utf-8")
            assert "event: governance" in body
            assert "event: token" in body
            assert "event: done" in body

        # Verify message history contains the streamed assistant response
        hist_res = client.get(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=registered_user_headers,
        )
        assert hist_res.status_code == 200
        messages = hist_res.json()["messages"]
        assert len(messages) >= 2
        user_msg = next(m for m in messages if m["role"] == "user")
        assistant_msg = next(m for m in messages if m["role"] == "assistant")
        assert user_msg["content"] == "What is Python in one sentence?"
        assert len(assistant_msg["content"]) > 5

