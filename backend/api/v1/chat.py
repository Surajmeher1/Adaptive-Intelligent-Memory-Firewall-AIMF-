"""
AIMF API v1 — User Chat Endpoints
===================================
Chatbot interface for USER-role accounts.

All user messages are routed through the AIMF governance pipeline.
Approved messages are persisted to the memories table.

Endpoints:
  POST   /api/v1/chat/sessions                            — create session
  GET    /api/v1/chat/sessions                            — list user sessions
  DELETE /api/v1/chat/sessions/{session_id}               — delete session
  GET    /api/v1/chat/sessions/{session_id}/messages      — get history
  POST   /api/v1/chat/sessions/{session_id}/messages      — send message (AIMF governed)
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse

from api.deps import CurrentUser, DBSession
from core.logging import get_logger
from models.user import User
from schemas.chat import (
    ChatHistoryResponse,
    ChatMessageSend,
    ChatSendResponse,
    ChatSessionCreate,
    ChatSessionOut,
)
from services import chat_service

logger = get_logger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


def _require_user_role(current_user: User) -> None:
    """Raise 403 if caller is not an active USER (ADMINs use the dashboard)."""
    # Admins can also use chat for testing, so we only block inactive accounts.
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )


# ─── Session endpoints ────────────────────────────────────────────────────────

@router.post(
    "/sessions",
    response_model=ChatSessionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new chat session",
)
async def create_session(
    body: ChatSessionCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> ChatSessionOut:
    _require_user_role(current_user)
    session = await chat_service.create_session(db, current_user.id, body.title)
    await db.flush()
    return ChatSessionOut.model_validate(session)


@router.get(
    "/sessions",
    response_model=list[ChatSessionOut],
    status_code=status.HTTP_200_OK,
    summary="List all chat sessions for the current user",
)
async def list_sessions(
    current_user: CurrentUser,
    db: DBSession,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[ChatSessionOut]:
    _require_user_role(current_user)
    sessions = await chat_service.list_sessions(db, current_user.id, limit, offset)
    return [ChatSessionOut.model_validate(s) for s in sessions]


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a chat session and all its messages",
)
async def delete_session(
    session_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> dict[str, str]:
    _require_user_role(current_user)
    deleted = await chat_service.delete_session(db, session_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    return {"status": "ok", "message": "Session deleted"}


# ─── Message endpoints ────────────────────────────────────────────────────────

@router.get(
    "/sessions/{session_id}/messages",
    response_model=ChatHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve full message history for a session",
)
async def get_history(
    session_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> ChatHistoryResponse:
    _require_user_role(current_user)
    result = await chat_service.get_history(db, session_id, current_user.id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    return result


@router.post(
    "/sessions/{session_id}/messages",
    response_model=ChatSendResponse,
    status_code=status.HTTP_200_OK,
    summary="Send a message — passed through AIMF governance pipeline",
)
async def send_message(
    session_id: str,
    body: ChatMessageSend,
    request: Request,
    current_user: CurrentUser,
    db: DBSession,
) -> ChatSendResponse:
    _require_user_role(current_user)

    # Pull AI models from app.state (loaded at startup)
    nlp_model       = getattr(request.app.state, "nlp",             None)
    embedding_model  = getattr(request.app.state, "embedding_model", None)
    faiss_index      = getattr(request.app.state, "faiss",           None)

    result = await chat_service.send_message(
        db=db,
        session_id=session_id,
        user_id=current_user.id,
        content=body.content,
        nlp_model=nlp_model,
        embedding_model=embedding_model,
        faiss_index=faiss_index,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    logger.info(
        "Chat message processed",
        extra={
            "user_id": current_user.id,
            "session_id": session_id,
            "decision": result.aimf_decision,
            "memory_persisted": result.memory_persisted,
        },
    )
    return result


@router.post(
    "/sessions/{session_id}/messages/stream",
    summary="Send a message and stream the assistant reply using SSE",
)
async def send_message_stream(
    session_id: str,
    body: ChatMessageSend,
    request: Request,
    current_user: CurrentUser,
):
    _require_user_role(current_user)

    nlp_model        = getattr(request.app.state, "nlp",             None)
    embedding_model  = getattr(request.app.state, "embedding_model", None)
    faiss_index      = getattr(request.app.state, "faiss",           None)

    return StreamingResponse(
        chat_service.stream_message(
            session_id=session_id,
            user_id=current_user.id,
            content=body.content,
            nlp_model=nlp_model,
            embedding_model=embedding_model,
            faiss_index=faiss_index,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
