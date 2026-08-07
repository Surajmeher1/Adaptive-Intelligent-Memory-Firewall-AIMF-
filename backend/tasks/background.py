"""
AIMF — Background Tasks
=========================
Async periodic tasks that run in the background while the server is alive.

Tasks:
  1. expiry_checker     — marks STORE_TEMPORARY memories as EXPIRED
  2. amgs_decay_runner  — applies temporal decay to long-lived memories

Both tasks are registered in main.py via the lifespan() context manager.
They use a shared asyncio.Event for graceful shutdown.

Decay model for amgs_decay_runner:
  For every active memory with is_temporal=False and last_accessed > 7 days ago,
  apply a small daily AMGS decay: amgs_new = amgs * DECAY_FACTOR
  Minimum score: 0.05 (never permanently forget due to decay alone).
  This simulates information becoming less relevant over time without access.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from core.logging import get_logger
from models.lifecycle_event import LifecycleEvent
from models.memory import Memory

logger = get_logger(__name__)

_EXPIRY_CHECK_INTERVAL_SECONDS = 60      # check every 60s
_DECAY_RUN_INTERVAL_SECONDS    = 3600    # decay every 1 hour
_DECAY_FACTOR                  = 0.995   # ~0.5% decay per hour
_DECAY_MIN_AMGS                = 0.05    # floor
_DECAY_INACTIVITY_DAYS         = 7       # only decay if not accessed in 7d

_stop_event: asyncio.Event | None = None


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _is_expired(mem: Memory) -> bool:
    """True if memory has an expires_at in the past."""
    if not mem.expires_at:
        return False
    try:
        expiry = datetime.fromisoformat(mem.expires_at)
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        return _utcnow() > expiry
    except ValueError:
        return False


async def expiry_checker_loop(session_factory: async_sessionmaker[AsyncSession]) -> None:
    """
    Periodically scan for STORE_TEMPORARY memories past their expires_at.
    Marks them as EXPIRED and records a lifecycle event.
    """
    logger.info("expiry_checker: starting")
    while not (_stop_event and _stop_event.is_set()):
        try:
            async with session_factory() as db:
                async with db.begin():
                    result = await db.execute(
                        select(Memory).where(
                            Memory.status == "ACTIVE",
                            Memory.expires_at.isnot(None),
                        )
                    )
                    candidates = result.scalars().all()

                    expired_count = 0
                    for mem in candidates:
                        if _is_expired(mem):
                            mem.status = "EXPIRED"
                            event = LifecycleEvent.expired(memory_id=mem.id)
                            db.add(event)
                            expired_count += 1

                    if expired_count > 0:
                        logger.info("expiry_checker: expired memories", extra={
                            "count": expired_count,
                        })

        except Exception as exc:
            logger.error("expiry_checker: error", extra={"error": str(exc)})

        try:
            await asyncio.wait_for(
                asyncio.shield(asyncio.ensure_future(_stop_event.wait()
                    if _stop_event else asyncio.sleep(_EXPIRY_CHECK_INTERVAL_SECONDS))),
                timeout=_EXPIRY_CHECK_INTERVAL_SECONDS,
            )
            break  # stop event fired
        except asyncio.TimeoutError:
            pass  # normal — check interval elapsed


async def amgs_decay_loop(session_factory: async_sessionmaker[AsyncSession]) -> None:
    """
    Periodically apply temporal decay to inactive memories.
    Only decays memories not accessed in > DECAY_INACTIVITY_DAYS days.
    """
    logger.info("amgs_decay: starting")
    while not (_stop_event and _stop_event.is_set()):
        try:
            async with session_factory() as db:
                async with db.begin():
                    result = await db.execute(
                        select(Memory).where(
                            Memory.status == "ACTIVE",
                            Memory.amgs_score > _DECAY_MIN_AMGS,
                        )
                    )
                    memories = result.scalars().all()

                    decayed_count = 0
                    for mem in memories:
                        # Only decay if inactive long enough
                        last = mem.last_accessed
                        if isinstance(last, str):
                            try:
                                last_dt = datetime.fromisoformat(last)
                                if last_dt.tzinfo is None:
                                    last_dt = last_dt.replace(tzinfo=timezone.utc)
                            except ValueError:
                                continue
                        else:
                            last_dt = last.replace(tzinfo=timezone.utc) if last.tzinfo is None else last

                        days_inactive = (_utcnow() - last_dt).days
                        if days_inactive < _DECAY_INACTIVITY_DAYS:
                            continue

                        old_score = mem.amgs_score
                        new_score = max(_DECAY_MIN_AMGS, old_score * _DECAY_FACTOR)

                        if abs(old_score - new_score) < 0.001:
                            continue  # negligible change

                        mem.amgs_score = round(new_score, 4)
                        event = LifecycleEvent.decayed(
                            memory_id=mem.id,
                            amgs_before=old_score,
                            amgs_after=new_score,
                        )
                        db.add(event)
                        decayed_count += 1

                    if decayed_count > 0:
                        logger.info("amgs_decay: applied decay", extra={
                            "count": decayed_count,
                        })

        except Exception as exc:
            logger.error("amgs_decay: error", extra={"error": str(exc)})

        try:
            await asyncio.wait_for(
                asyncio.shield(asyncio.ensure_future(_stop_event.wait()
                    if _stop_event else asyncio.sleep(_DECAY_RUN_INTERVAL_SECONDS))),
                timeout=_DECAY_RUN_INTERVAL_SECONDS,
            )
            break
        except asyncio.TimeoutError:
            pass


def set_stop_event(event: asyncio.Event) -> None:
    """Register the shared stop event for graceful shutdown."""
    global _stop_event
    _stop_event = event
