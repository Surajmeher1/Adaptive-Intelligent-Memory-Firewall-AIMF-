"""
AIMF Chat Service
=================
Business logic for the USER chatbot interface.

Each user message is routed through the full AIMF pipeline + AMGS
governance engine before a response is generated. Approved messages
are also persisted to the memories table.

Architecture:
  1. User sends message → AIMF pipeline runs → governance decision
  2. If STORE/STORE_*: memory is persisted to database; user sees ✅ badge
  3. If REJECT/REJECT_PRIVACY: message logged but not stored; user sees 🛡️ badge
  4. Generative AI generates a natural conversational reply (with context + memory)
  5. AIMF governance metadata is kept separate from assistant reply text
  6. Both messages are stored in chat_messages for history
"""

from __future__ import annotations

import json
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.pipeline.orchestrator import run_pipeline
from core.database import AsyncSessionLocal
from core.logging import get_logger
from core.security import encrypt
from models.chat import ChatMessage, ChatSession
from models.lifecycle_event import LifecycleEvent
from models.memory import Memory
from schemas.chat import (
    ChatHistoryResponse,
    ChatMessageOut,
    ChatSendResponse,
    ChatSessionOut,
)
from services.llm_service import generate_response, stream_response

logger = get_logger(__name__)

# Decisions that result in the message being stored to memories
_STORAGE_DECISIONS = {
    "STORE",
    "STORE_LONG_TERM",
    "STORE_ENCRYPT",
    "ENCRYPT_AND_STORE",
    "STORE_TEMPORARY",
    "SUMMARIZE",
    "SUMMARIZE_AND_STORE",
    "MERGE_WITH_EXISTING",
    "UPDATE_EXISTING",
}


# ─── Session helpers ──────────────────────────────────────────────────────────

async def create_session(
    db: AsyncSession,
    user_id: str,
    title: str = "New Conversation",
) -> ChatSession:
    """Create a new chat session for the given user."""
    session = ChatSession(user_id=user_id, title=title)
    db.add(session)
    await db.flush()
    return session


async def list_sessions(
    db: AsyncSession,
    user_id: str,
    limit: int = 20,
    offset: int = 0,
) -> list[ChatSession]:
    """Return all chat sessions for a user, newest first."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def get_session(
    db: AsyncSession,
    session_id: str,
    user_id: str,
) -> ChatSession | None:
    """Fetch a single session belonging to the given user."""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def delete_session(
    db: AsyncSession,
    session_id: str,
    user_id: str,
) -> bool:
    """Delete a session (and all its messages via cascade). Returns True if found."""
    session = await get_session(db, session_id, user_id)
    if session is None:
        return False
    await db.delete(session)
    return True


# ─── Message helpers ──────────────────────────────────────────────────────────

async def get_history(
    db: AsyncSession,
    session_id: str,
    user_id: str,
) -> ChatHistoryResponse | None:
    """Return full message history for a session."""
    session = await get_session(db, session_id, user_id)
    if session is None:
        return None

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = list(result.scalars().all())

    return ChatHistoryResponse(
        session=ChatSessionOut.model_validate(session),
        messages=[ChatMessageOut.model_validate(m) for m in messages],
        total=len(messages),
    )



async def send_message(
    db: AsyncSession,
    session_id: str,
    user_id: str,
    content: str,
    nlp_model=None,
    embedding_model=None,
    faiss_index=None,
) -> ChatSendResponse | None:
    """
    Process a user message through the AIMF pipeline and store results.

    Returns None if the session doesn't belong to this user.
    """
    chat_session = await get_session(db, session_id, user_id)
    if chat_session is None:
        return None

    # ── Step 1: Run AIMF pipeline ─────────────────────────────────────────────
    logger.info(
        "Running AIMF pipeline for chat message",
        extra={"session_id": session_id, "user_id": user_id},
    )
    ctx = await run_pipeline(
        raw_content=content,
        session_id=session_id,
        db_session=db,
        nlp_model=nlp_model,
        embedding_model=embedding_model,
        faiss_index=faiss_index,
    )
    decision = ctx.decision or "REJECT"
    amgs_score = ctx.amgs_score
    rationale = ctx.rationale or "No rationale provided."

    # ── Step 2: Persist to memories if approved ───────────────────────────────
    memory_id: str | None = None
    memory_persisted = False

    if decision in _STORAGE_DECISIONS:
        try:
            existing = await db.execute(
                select(Memory).where(Memory.content_hash == ctx.content_hash)
            )
            existing_mem = existing.scalar_one_or_none()
            if existing_mem is not None:
                existing_mem.touch()
                memory_id = existing_mem.id
                memory_persisted = True
            else:
                memory_id = str(uuid.uuid4())

                # Encrypt if needed
                if decision in ("STORE_ENCRYPT", "ENCRYPT_AND_STORE"):
                    payload = encrypt(ctx.normalised_content)
                    stored_content = "[ENCRYPTED]"
                    enc_nonce = payload.nonce
                    enc_tag   = payload.tag
                    enc_ct    = payload.ciphertext
                    is_encrypted = True
                else:
                    stored_content = ctx.normalised_content
                    enc_nonce = enc_tag = enc_ct = None
                    is_encrypted = False

                tier_map = {
                    "STORE_LONG_TERM":     "LONG_TERM",
                    "STORE_ENCRYPT":       "LONG_TERM",
                    "ENCRYPT_AND_STORE":   "LONG_TERM",
                    "STORE_TEMPORARY":     "TEMPORARY",
                    "SUMMARIZE":           "SUMMARIZED",
                    "SUMMARIZE_AND_STORE": "SUMMARIZED",
                    "STORE":               "LONG_TERM",
                    "MERGE_WITH_EXISTING": "LONG_TERM",
                    "UPDATE_EXISTING":     "LONG_TERM",
                }

                mem = Memory(
                    id=memory_id,
                    content=stored_content,
                    content_hash=ctx.content_hash,
                    status="ACTIVE",
                    decision=ctx.decision,
                    amgs_score=amgs_score,
                    confidence=ctx.confidence,
                    sensitivity=ctx.sensitivity,
                    memory_category=ctx.memory_category,
                    usefulness_lifetime=ctx.usefulness_lifetime,
                    f_usefulness=ctx.usefulness,
                    f_context_rel=ctx.context_relevance,
                    f_frequency=ctx.frequency,
                    f_novelty=ctx.novelty,
                    f_redundancy=ctx.redundancy,
                    f_privacy_risk=ctx.privacy_risk,
                    f_temporal_decay=ctx.temporal_decay,
                    expires_at=ctx.expires_at,
                    is_encrypted=is_encrypted,
                    nonce=enc_nonce,
                    tag=enc_tag,
                    ciphertext=enc_ct,
                    explanation=rationale,
                    session_id=session_id,
                )
                db.add(mem)

                event = LifecycleEvent.created(
                    memory_id=memory_id,
                    amgs_after=amgs_score,
                )
                db.add(event)
                memory_persisted = True

                # Update FAISS if available
                if faiss_index is not None and ctx.embedding is not None:
                    faiss_index.add(memory_id, ctx.embedding)

        except Exception as exc:
            logger.warning(
                "Failed to persist memory from chat",
                extra={"error": str(exc), "decision": decision},
            )
            await db.rollback()
            memory_id = None
            memory_persisted = False

    # ── Step 3: Store user message in chat ────────────────────────────────────
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=content,
        aimf_decision=decision,
        amgs_score=str(round(amgs_score, 4)) if amgs_score is not None else None,
        memory_id=memory_id,
    )
    db.add(user_msg)
    await db.flush()  # get user_msg.id

    # ── Step 4: Generate and store assistant reply via Generative AI ─────────
    # 4a. Retrieve prior conversation history for context
    history_result = await db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.session_id == session_id,
            ChatMessage.id != user_msg.id,
        )
        .order_by(ChatMessage.created_at.asc())
    )
    chat_history = [
        {"role": m.role, "content": m.content}
        for m in history_result.scalars().all()
    ]

    # 4b. Retrieve active, unencrypted memories for context enrichment
    memory_result = await db.execute(
        select(Memory.content)
        .where(
            Memory.session_id == session_id,
            Memory.status == "ACTIVE",
            Memory.is_encrypted == False,
        )
        .order_by(Memory.created_at.desc())
        .limit(10)
    )
    user_memories = [
        m for m in memory_result.scalars().all()
        if m and m != "[ENCRYPTED]"
    ]

    # 4c. Generate natural assistant response (strictly separated from governance)
    llm_resp = await generate_response(
        chat_history=chat_history,
        current_message=content,
        user_memories=user_memories if user_memories else None,
    )
    reply_text = llm_resp.content

    assistant_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=reply_text,
        aimf_decision=None,
        amgs_score=None,
        memory_id=None,
    )
    db.add(assistant_msg)
    await db.flush()

    # ── Step 5: Update session title if this is the first message ─────────────
    msg_count_result = await db.execute(
        select(func.count(ChatMessage.id)).where(
            ChatMessage.session_id == session_id,
            ChatMessage.role == "user",
        )
    )
    msg_count = msg_count_result.scalar_one()
    if msg_count == 1:  # only the message we just added
        chat_session.title = content[:60] + ("..." if len(content) > 60 else "")

    return ChatSendResponse(
        user_message=ChatMessageOut.model_validate(user_msg),
        assistant_message=ChatMessageOut.model_validate(assistant_msg),
        aimf_decision=decision,
        amgs_score=amgs_score,
        memory_persisted=memory_persisted,
        memory_id=memory_id,
        rationale=rationale,
    )


async def stream_message(
    session_id: str,
    user_id: str,
    content: str,
    nlp_model=None,
    embedding_model=None,
    faiss_index=None,
) -> AsyncGenerator[str, None]:
    """
    Stream a chat message response using Server-Sent Events (SSE).

    Architecture:
      Step 1: Execute AIMF governance pipeline (server-side authoritative).
      Step 2: Persist approved memory to SQLite and FAISS if decision is approved.
      Step 3: Save user ChatMessage to DB.
      Step 4: Yield initial 'governance' SSE event.
      Step 5: Stream tokens from LLM via 'token' SSE events.
      Step 6: Save assistant ChatMessage to DB upon completion.
      Step 7: Yield final 'done' SSE event.
    """
    async with AsyncSessionLocal() as db:
        chat_session = await get_session(db, session_id, user_id)
        if chat_session is None:
            yield f"event: error\ndata: {json.dumps({'error': 'Session not found'})}\n\n"
            return

        # ── Step 1: Run AIMF governance pipeline ─────────────────────────────
        logger.info(
            "Running AIMF pipeline for streaming chat message",
            extra={"session_id": session_id, "user_id": user_id},
        )
        ctx = await run_pipeline(
            raw_content=content,
            session_id=session_id,
            db_session=db,
            nlp_model=nlp_model,
            embedding_model=embedding_model,
            faiss_index=faiss_index,
        )
        decision = ctx.decision or "REJECT"
        amgs_score = ctx.amgs_score
        rationale = ctx.rationale or "No rationale provided."

        # ── Step 2: Persist to memories if approved ───────────────────────────
        memory_id: str | None = None
        memory_persisted = False

        if decision in _STORAGE_DECISIONS:
            try:
                existing = await db.execute(
                    select(Memory).where(Memory.content_hash == ctx.content_hash)
                )
                existing_mem = existing.scalar_one_or_none()
                if existing_mem is not None:
                    existing_mem.touch()
                    memory_id = existing_mem.id
                    memory_persisted = True
                else:
                    memory_id = str(uuid.uuid4())
                    if decision in ("STORE_ENCRYPT", "ENCRYPT_AND_STORE"):
                        payload = encrypt(ctx.normalised_content)
                        stored_content = "[ENCRYPTED]"
                        enc_nonce = payload.nonce
                        enc_tag   = payload.tag
                        enc_ct    = payload.ciphertext
                        is_encrypted = True
                    else:
                        stored_content = ctx.normalised_content
                        enc_nonce = enc_tag = enc_ct = None
                        is_encrypted = False

                    mem = Memory(
                        id=memory_id,
                        content=stored_content,
                        content_hash=ctx.content_hash,
                        status="ACTIVE",
                        decision=ctx.decision,
                        amgs_score=amgs_score,
                        confidence=ctx.confidence,
                        sensitivity=ctx.sensitivity,
                        memory_category=ctx.memory_category,
                        usefulness_lifetime=ctx.usefulness_lifetime,
                        f_usefulness=ctx.usefulness,
                        f_context_rel=ctx.context_relevance,
                        f_frequency=ctx.frequency,
                        f_novelty=ctx.novelty,
                        f_redundancy=ctx.redundancy,
                        f_privacy_risk=ctx.privacy_risk,
                        f_temporal_decay=ctx.temporal_decay,
                        expires_at=ctx.expires_at,
                        is_encrypted=is_encrypted,
                        nonce=enc_nonce,
                        tag=enc_tag,
                        ciphertext=enc_ct,
                        explanation=rationale,
                        session_id=session_id,
                    )
                    db.add(mem)
                    event = LifecycleEvent.created(
                        memory_id=memory_id,
                        amgs_after=amgs_score,
                    )
                    db.add(event)
                    memory_persisted = True

                    if faiss_index is not None and ctx.embedding is not None:
                        faiss_index.add(memory_id, ctx.embedding)

            except Exception as exc:
                logger.warning(
                    "Failed to persist memory from streaming chat",
                    extra={"error": str(exc), "decision": decision},
                )
                await db.rollback()
                memory_id = None
                memory_persisted = False

        # ── Step 3: Store user message in chat ────────────────────────────────
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=content,
            aimf_decision=decision,
            amgs_score=str(round(amgs_score, 4)) if amgs_score is not None else None,
            memory_id=memory_id,
        )
        db.add(user_msg)
        await db.commit()
        await db.refresh(user_msg)

        # ── Step 4: Emit initial governance SSE event ─────────────────────────
        gov_payload = {
            "user_message": {
                "id": user_msg.id,
                "session_id": user_msg.session_id,
                "role": user_msg.role,
                "content": user_msg.content,
                "aimf_decision": user_msg.aimf_decision,
                "amgs_score": user_msg.amgs_score,
                "memory_id": user_msg.memory_id,
                "created_at": user_msg.created_at,
            },
            "aimf_decision": decision,
            "amgs_score": amgs_score,
            "memory_persisted": memory_persisted,
            "memory_id": memory_id,
            "rationale": rationale,
        }
        yield f"event: governance\ndata: {json.dumps(gov_payload)}\n\n"

        # ── Step 5: Retrieve conversation history + memories for context ─────
        history_result = await db.execute(
            select(ChatMessage)
            .where(
                ChatMessage.session_id == session_id,
                ChatMessage.id != user_msg.id,
            )
            .order_by(ChatMessage.created_at.asc())
        )
        chat_history = [
            {"role": m.role, "content": m.content}
            for m in history_result.scalars().all()
        ]

        memory_result = await db.execute(
            select(Memory.content)
            .where(
                Memory.session_id == session_id,
                Memory.status == "ACTIVE",
                Memory.is_encrypted == False,
            )
            .order_by(Memory.created_at.desc())
            .limit(10)
        )
        user_memories = [
            m for m in memory_result.scalars().all()
            if m and m != "[ENCRYPTED]"
        ]

        # ── Step 6: Stream tokens from LLM ────────────────────────────────────
        full_reply_parts = []
        try:
            async for chunk in stream_response(
                chat_history=chat_history,
                current_message=content,
                user_memories=user_memories if user_memories else None,
            ):
                full_reply_parts.append(chunk)
                yield f"event: token\ndata: {json.dumps({'token': chunk})}\n\n"
        except asyncio.CancelledError:
            logger.info("Client aborted streaming response")
            raise
        except Exception as exc:
            logger.error("Error during LLM streaming: %s", exc)
            yield f"event: error\ndata: {json.dumps({'error': str(exc)})}\n\n"
        finally:
            full_reply = "".join(full_reply_parts).strip()
            if not full_reply:
                full_reply = "I apologize, but I could not generate a response right now. Please try again."

            # ── Step 7: Persist assistant message ─────────────────────────────
            assistant_msg = ChatMessage(
                session_id=session_id,
                role="assistant",
                content=full_reply,
                aimf_decision=None,
                amgs_score=None,
                memory_id=None,
            )
            db.add(assistant_msg)

            msg_count_result = await db.execute(
                select(func.count(ChatMessage.id)).where(
                    ChatMessage.session_id == session_id,
                    ChatMessage.role == "user",
                )
            )
            msg_count = msg_count_result.scalar_one()
            if msg_count == 1:
                chat_session.title = content[:60] + ("..." if len(content) > 60 else "")

            await db.commit()
            await db.refresh(assistant_msg)

            done_payload = {
                "assistant_message": {
                    "id": assistant_msg.id,
                    "session_id": assistant_msg.session_id,
                    "role": assistant_msg.role,
                    "content": assistant_msg.content,
                    "aimf_decision": None,
                    "amgs_score": None,
                    "memory_id": None,
                    "created_at": assistant_msg.created_at,
                }
            }
            yield f"event: done\ndata: {json.dumps(done_payload)}\n\n"
