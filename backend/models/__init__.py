"""
AIMF Models Package
===================
Import all ORM models here so that SQLAlchemy's metadata
knows about every table. This is required for:
  - Base.metadata.create_all() to work
  - Alembic --autogenerate to detect all models

Usage:
    from models import Memory, LifecycleEvent
"""

from models.memory import Memory
from models.lifecycle_event import LifecycleEvent

__all__ = [
    "Memory",
    "LifecycleEvent",
]
