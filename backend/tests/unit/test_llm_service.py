"""
AIMF Unit Tests — LLM Service (Generative AI)
==============================================
Validates:
  - System prompt & message formatting
  - History windowing & memory injection
  - Fallback responses (no governance leak)
  - Error resilience (network errors, timeouts)
  - Provider configurations
"""

import pytest
from unittest.mock import patch, AsyncMock
import httpx

from services.llm_service import (
    SYSTEM_PROMPT,
    _SAFE_ERROR_RESPONSE,
    build_messages,
    generate_response,
    _fallback_response,
    LLMResponse,
)


class TestMessageBuilder:
    def test_build_messages_basic(self):
        history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"},
        ]
        messages = build_messages(history, "How are you?")
        assert len(messages) == 4
        assert messages[0]["role"] == "system"
        assert SYSTEM_PROMPT in messages[0]["content"]
        assert messages[1] == {"role": "user", "content": "Hello"}
        assert messages[2] == {"role": "assistant", "content": "Hi there!"}
        assert messages[3] == {"role": "user", "content": "How are you?"}

    def test_build_messages_with_memories(self):
        memories = [
            "User prefers Python 3.12",
            "User's name is Suraj",
        ]
        messages = build_messages([], "What should I code today?", user_memories=memories)
        assert len(messages) == 2
        sys_msg = messages[0]["content"]
        assert "User prefers Python 3.12" in sys_msg
        assert "User's name is Suraj" in sys_msg
        assert messages[1] == {"role": "user", "content": "What should I code today?"}

    def test_build_messages_context_limit(self):
        # 30 messages in history
        history = [
            {"role": "user" if i % 2 == 0 else "assistant", "content": f"msg {i}"}
            for i in range(30)
        ]
        messages = build_messages(history, "Latest msg")
        # System prompt + at most 20 history + 1 current message = 22 messages
        assert len(messages) <= 22
        assert messages[-1]["content"] == "Latest msg"
        assert messages[-2]["content"] == "msg 29"


class TestFallbackResponses:
    @pytest.mark.parametrize(
        "user_input",
        [
            "hello",
            "Hey there!",
            "My name is Suraj",
            "I prefer FastAPI over Flask",
            "What is a memory firewall?",
            "thanks a lot",
            "bye!",
            "random unformatted text 123",
        ],
    )
    def test_fallback_generates_natural_text(self, user_input: str):
        reply = _fallback_response(user_input)
        assert isinstance(reply, str)
        assert len(reply) > 5

        # Critical requirement: zero governance leaks
        governance_keywords = [
            "AIMF Decision",
            "AIMF Rationale",
            "AMGS",
            "STORE_LONG_TERM",
            "STORE_ENCRYPT",
            "REJECT_PRIVACY",
            "Your message was reviewed but not stored",
            "✅ Your message has been stored",
            "decision engine",
            "pipeline stage",
        ]
        for kw in governance_keywords:
            assert kw.lower() not in reply.lower(), f"Governance keyword {kw!r} leaked into assistant reply!"

    @pytest.mark.asyncio
    async def test_generate_response_unconfigured_mode(self):
        with patch("core.config.settings.llm_provider", "none"):
            resp = await generate_response(
                chat_history=[],
                current_message="Hello, can you help me?",
            )
            assert isinstance(resp, LLMResponse)
            assert resp.success is False
            assert resp.provider == "none"
            assert "AIMF_LLM_PROVIDER" in resp.content
            assert "AMGS" not in resp.content

    @pytest.mark.asyncio
    async def test_generate_response_gemini_success(self):
        with patch("core.config.settings.llm_provider", "gemini"), \
             patch("core.config.settings.llm_api_key", "fake-key"), \
             patch("services.llm_service._call_gemini", new_callable=AsyncMock) as mock_call:
            mock_call.return_value = ("Hello! How can I help you today?", "gemini-flash-lite-latest")
            resp = await generate_response([], "Hello")
            assert resp.success is True
            assert resp.provider == "gemini"
            assert resp.content == "Hello! How can I help you today?"
            assert resp.model == "gemini-flash-lite-latest"


class TestErrorResilience:
    @pytest.mark.asyncio
    async def test_timeout_fallback(self):
        with patch("core.config.settings.llm_provider", "gemini"), \
             patch("core.config.settings.llm_api_key", "fake-key"), \
             patch("services.llm_service._call_gemini", side_effect=httpx.TimeoutException("timeout")):
            resp = await generate_response([], "Hello")
            assert resp.success is False
            assert resp.content == _SAFE_ERROR_RESPONSE
            assert "fake-key" not in resp.content

    @pytest.mark.asyncio
    async def test_http_error_fallback(self):
        mock_response = httpx.Response(500, request=httpx.Request("POST", "https://api.example.com"))
        with patch("core.config.settings.llm_provider", "openai"), \
             patch("core.config.settings.llm_api_key", "fake-key"), \
             patch("services.llm_service._call_openai", side_effect=httpx.HTTPStatusError("500 Internal", request=mock_response.request, response=mock_response)):
            resp = await generate_response([], "Hello")
            assert resp.success is False
            assert resp.content == _SAFE_ERROR_RESPONSE
            assert "500" not in resp.content
