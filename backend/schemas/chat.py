"""
AIMF Schemas — Chat Request/Response Models
============================================
Pydantic v2 models for the USER chatbot API endpoints.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


# ─── Session schemas ──────────────────────────────────────────────────────────

class ChatSessionCreate(BaseModel):
    """Payload for POST /api/v1/chat/sessions."""
    title: str = Field(default="New Conversation", max_length=255)


class ChatSessionOut(BaseModel):
    """Single chat session returned to clients."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    created_at: str
    updated_at: str


# ─── Message schemas ──────────────────────────────────────────────────────────

class ChatMessageSend(BaseModel):
    """Payload for POST /api/v1/chat/sessions/{session_id}/messages."""
    model_config = ConfigDict(str_strip_whitespace=True)

    content: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="User message content (1–1000 chars, AIMF governed).",
    )


class ChatMessageOut(BaseModel):
    """Single chat message returned to clients."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    role: str
    content: str
    aimf_decision: str | None = None
    amgs_score: str | None = None
    memory_id: str | None = None
    created_at: str


class ChatSendResponse(BaseModel):
    """
    Response for POST /api/v1/chat/sessions/{session_id}/messages.

    Returns both the persisted user message and the assistant reply.
    Also surfaces the AIMF governance decision so the frontend can
    display the firewall badge.
    """
    user_message: ChatMessageOut
    assistant_message: ChatMessageOut
    aimf_decision: str
    amgs_score: float | None = None
    memory_persisted: bool = Field(
        description="True if the user message was approved and stored as a Memory record."
    )
    memory_id: str | None = None
    rationale: str = Field(description="Human-readable AIMF governance rationale.")


class ChatHistoryResponse(BaseModel):
    """Paginated chat history for a session."""
    session: ChatSessionOut
    messages: list[ChatMessageOut]
    total: int
