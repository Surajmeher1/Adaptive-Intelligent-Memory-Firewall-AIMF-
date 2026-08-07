"""
AIMF Core FAISS Index Wrapper
==============================
Wraps FAISS IndexFlatIP for L2-normalized embeddings.
Inner product of unit vectors = cosine similarity.

Phase 2 scope: load/save/health-check stubs only.
Full search implementation completed in Phase 3 (Task 3.6).

Index type:  IndexFlatIP (exact inner product search)
Persistence: faiss_index.bin  (binary) + faiss_id_map.json (UUID mapping)
Scale:       Research prototype — up to 10,000 memories (NFR-24)

References: FR-19, docs/AI_PIPELINE.md Stage 6
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import numpy as np

from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)


class FAISSIndex:
    """
    Thread-safe (single-process) FAISS index wrapper.

    Maintains a parallel mapping from FAISS internal int IDs to memory UUIDs,
    because FAISS only stores integer IDs internally.

    Attributes:
        index:      FAISS IndexFlatIP instance (or None if faiss not installed)
        id_map:     list[str] — position i → memory UUID
        deleted:    set[int]  — internal FAISS IDs to exclude from results
        available:  bool — False if faiss package is not installed
    """

    def __init__(self) -> None:
        self.dim = settings.embedding_dim
        self.id_map: list[str] = []
        self.deleted: set[int] = set()
        self._index_path = Path(settings.faiss_index_path)
        self._map_path = self._index_path.with_suffix(".id_map.json")

        try:
            import faiss  # type: ignore[import]
            self.index = faiss.IndexFlatIP(self.dim)
            self.available = True
            logger.info("FAISSIndex initialized", extra={"dim": self.dim, "size": 0})
        except ImportError:
            self.index = None
            self.available = False
            logger.warning(
                "faiss-cpu not installed — vector search disabled. "
                "Install with: pip install faiss-cpu"
            )

    # ─── Persistence ──────────────────────────────────────────────────────────

    def save(self) -> None:
        """Persist index and ID map to disk. No-op if faiss not available."""
        if not self.available or self.index is None:
            return

        import faiss  # type: ignore[import]

        faiss.write_index(self.index, str(self._index_path))
        with open(self._map_path, "w", encoding="utf-8") as f:
            json.dump({
                "id_map": self.id_map,
                "deleted": list(self.deleted),
            }, f)
        logger.info("FAISSIndex saved", extra={
            "path": str(self._index_path),
            "size": self.index.ntotal,
        })

    @classmethod
    def load(cls) -> "FAISSIndex":
        """Load index from disk, or create new if files don't exist."""
        instance = cls.__new__(cls)
        instance.dim = settings.embedding_dim
        instance._index_path = Path(settings.faiss_index_path)
        instance._map_path = instance._index_path.with_suffix(".id_map.json")
        instance.deleted = set()
        instance.id_map = []

        try:
            import faiss  # type: ignore[import]
            instance.available = True
        except ImportError:
            instance.index = None
            instance.available = False
            logger.warning("faiss-cpu not installed — FAISSIndex running in stub mode")
            return instance

        if instance._index_path.exists() and instance._map_path.exists():
            instance.index = faiss.read_index(str(instance._index_path))
            with open(instance._map_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            instance.id_map = data.get("id_map", [])
            instance.deleted = set(data.get("deleted", []))
            logger.info("FAISSIndex loaded from disk", extra={
                "size": instance.index.ntotal,
                "deleted_count": len(instance.deleted),
            })
        else:
            instance.index = faiss.IndexFlatIP(instance.dim)
            logger.info("FAISSIndex: no existing index found, starting fresh")

        return instance

    # ─── Index Operations ─────────────────────────────────────────────────────

    def add(self, memory_id: str, embedding: "np.ndarray") -> int:
        """
        Add an embedding to the index.
        Returns -1 if faiss is not available.
        """
        if not self.available or self.index is None:
            return -1
        import numpy as np  # lazy import — only needed when actually using FAISS
        vec = embedding.reshape(1, -1).astype(np.float32)
        self.index.add(vec)
        internal_id = len(self.id_map)
        self.id_map.append(memory_id)
        return internal_id

    def search(
        self,
        query_embedding: "np.ndarray",
        k: int = 5,
        min_similarity: float = 0.0,
    ) -> list[tuple[str, float]]:
        """Search for top-k most similar memories. Returns [] if faiss not available."""
        if not self.available or self.index is None or self.index.ntotal == 0:
            return []
        import numpy as np  # lazy import

        # Request more results than k to account for soft-deleted filtering
        fetch_k = min(self.index.ntotal, k + len(self.deleted) + 5)
        vec = query_embedding.reshape(1, -1).astype(np.float32)
        similarities, indices = self.index.search(vec, fetch_k)

        results: list[tuple[str, float]] = []
        for idx, sim in zip(indices[0], similarities[0]):
            if idx < 0 or idx >= len(self.id_map):
                continue
            if idx in self.deleted:
                continue
            if float(sim) < min_similarity:
                continue
            results.append((self.id_map[idx], float(sim)))
            if len(results) >= k:
                break

        return results

    def mark_deleted(self, memory_id: str) -> None:
        """Soft-delete a memory from search results (does not compact index)."""
        for i, mid in enumerate(self.id_map):
            if mid == memory_id:
                self.deleted.add(i)
                return

    @property
    def active_count(self) -> int:
        """Number of non-deleted entries in the index."""
        if not self.available or self.index is None:
            return 0
        return self.index.ntotal - len(self.deleted)

    def is_healthy(self) -> bool:
        """Health check: returns True if index is operational (faiss may be absent)."""
        # Healthy even without faiss — just returns degraded status in health endpoint
        return True


# ─── Application-level singleton ─────────────────────────────────────────────
# Assigned during FastAPI lifespan startup:
#   app.state.faiss = FAISSIndex.load()
# Accessed via dependency injection in routes.
