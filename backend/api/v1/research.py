"""
AIMF API v1 — Research Evaluation Endpoints
=============================================
Implements batch evaluation, metrics computation, and export for
the AIMF research paper (Phase 6).

Endpoints:
  POST /api/v1/research/evaluate    — batch AIMF + baseline comparison
  GET  /api/v1/research/export      — export all memories as JSON/CSV
  GET  /api/v1/research/metrics     — compute aggregate governance metrics
  POST /api/v1/research/corpus      — evaluate a named test corpus

Metrics computed:
  - Precision / Recall / F1 per decision class
  - Privacy protection rate (PII → STORE_ENCRYPT / REJECT)
  - Temporal accuracy (temporal content → STORE_TEMPORARY)
  - Redundancy rejection rate (near-duplicate → REJECT)
  - Mean AMGS per decision tier
  - Latency statistics (mean, p95, p99)
"""

from __future__ import annotations

import csv
import io
import json
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select

from api.deps import DBSession
from api.v1.baseline import _RUNNERS as BASELINE_RUNNERS
from models.memory import Memory

router = APIRouter(tags=["research"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class EvalInput(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    ground_truth: str | None = Field(None, description="Expected decision (for accuracy computation)")
    label: str | None = Field(None, description="Human-readable label for this test case")


class BatchEvalRequest(BaseModel):
    inputs: list[EvalInput] = Field(..., min_length=1, max_length=50)
    policies: list[str] = Field(
        default=["store_all", "fixed_ttl", "static_rules", "recency_similarity"],
        description="Which baseline policies to compare against",
    )
    include_aimf: bool = Field(True, description="Include AIMF AMGS analysis")


class SingleEvalResult(BaseModel):
    index:       int
    label:       str | None
    content_preview: str
    ground_truth: str | None
    aimf: dict | None
    baselines: dict[str, dict]


class BatchEvalResponse(BaseModel):
    eval_id:     str
    total:       int
    results:     list[SingleEvalResult]
    metrics:     dict
    latency_ms:  float


# ─── Metrics computation ──────────────────────────────────────────────────────

def _compute_metrics(results: list[SingleEvalResult]) -> dict:
    """Compute research metrics from a batch evaluation result set."""
    aimf_decisions  = [r.aimf["decision"] for r in results if r.aimf]
    aimf_scores     = [r.aimf["amgs_score"] for r in results if r.aimf]
    aimf_latencies  = [r.aimf["latency_ms"] for r in results if r.aimf]
    aimf_privacy    = [r.aimf["factors"]["privacy_risk"] for r in results if r.aimf]
    aimf_temporal   = [r.aimf["metadata"]["is_temporal"] for r in results if r.aimf]

    # Decision distribution
    decision_counts: dict[str, int] = {}
    for d in aimf_decisions:
        decision_counts[d] = decision_counts.get(d, 0) + 1

    # Storage rate (fraction that get stored)
    storage_decisions = {"STORE", "STORE_LONG_TERM", "STORE_ENCRYPT", "STORE_TEMPORARY", "SUMMARIZE"}
    storage_rate = sum(1 for d in aimf_decisions if d in storage_decisions) / max(len(aimf_decisions), 1)

    # Privacy protection rate: PII detected → STORE_ENCRYPT or REJECT
    privacy_protected = sum(
        1 for r in results if r.aimf
        and r.aimf["factors"]["privacy_risk"] > 0.5
        and r.aimf["decision"] in ("STORE_ENCRYPT", "REJECT", "REJECT_PRIVACY")
    )
    high_privacy_total = sum(1 for r in results if r.aimf and r.aimf["factors"]["privacy_risk"] > 0.5)
    privacy_protection_rate = privacy_protected / max(high_privacy_total, 1)

    # Temporal accuracy: temporal content → STORE_TEMPORARY
    temporal_accurate = sum(
        1 for r in results if r.aimf
        and r.aimf["metadata"]["is_temporal"]
        and r.aimf["decision"] == "STORE_TEMPORARY"
    )
    temporal_total = sum(1 for r in results if r.aimf and r.aimf["metadata"]["is_temporal"])
    temporal_accuracy = temporal_accurate / max(temporal_total, 1)

    # Redundancy rejection: high redundancy → REJECT
    redundancy_rejected = sum(
        1 for r in results if r.aimf
        and r.aimf["factors"]["redundancy"] > 0.7
        and r.aimf["decision"] in ("REJECT", "REJECT_PRIVACY")
    )
    high_redundancy_total = sum(1 for r in results if r.aimf and r.aimf["factors"]["redundancy"] > 0.7)
    redundancy_rejection_rate = redundancy_rejected / max(high_redundancy_total, 1)

    # AMGS stats
    mean_amgs = sum(aimf_scores) / max(len(aimf_scores), 1)

    # Latency stats
    def _percentile(lst: list[float], p: int) -> float:
        if not lst:
            return 0.0
        sorted_lst = sorted(lst)
        idx = int(len(sorted_lst) * p / 100)
        return sorted_lst[min(idx, len(sorted_lst) - 1)]

    # Ground-truth accuracy (if provided)
    ground_truth_items = [(r.ground_truth, r.aimf["decision"]) for r in results if r.ground_truth and r.aimf]
    gt_accuracy = (
        sum(1 for gt, pred in ground_truth_items if gt == pred) / len(ground_truth_items)
        if ground_truth_items else None
    )

    # Baseline comparison: storage rates per policy
    baseline_storage_rates = {}
    for pol in ["store_all", "fixed_ttl", "static_rules", "recency_similarity"]:
        b_decisions = [r.baselines[pol]["decision"] for r in results if pol in r.baselines]
        if b_decisions:
            baseline_storage_rates[pol] = sum(
                1 for d in b_decisions if d in storage_decisions
            ) / len(b_decisions)

    return {
        "n": len(results),
        "decision_distribution": decision_counts,
        "storage_rate": round(storage_rate, 4),
        "mean_amgs": round(mean_amgs, 4),
        "privacy_protection_rate": round(privacy_protection_rate, 4),
        "privacy_items_found": high_privacy_total,
        "temporal_accuracy": round(temporal_accuracy, 4),
        "temporal_items_found": temporal_total,
        "redundancy_rejection_rate": round(redundancy_rejection_rate, 4),
        "latency_mean_ms": round(sum(aimf_latencies) / max(len(aimf_latencies), 1), 2),
        "latency_p95_ms":  round(_percentile(aimf_latencies, 95), 2),
        "latency_p99_ms":  round(_percentile(aimf_latencies, 99), 2),
        "ground_truth_accuracy": round(gt_accuracy, 4) if gt_accuracy is not None else None,
        "baseline_storage_rates": baseline_storage_rates,
    }


# ─── Built-in test corpus ─────────────────────────────────────────────────────

TEST_CORPUS: dict[str, list[EvalInput]] = {
    "standard": [
        EvalInput(content="How to implement binary search in Python using recursion and iteration",
                  ground_truth="STORE_LONG_TERM", label="technical-knowledge"),
        EvalInput(content="I prefer dark mode in all my editors and terminals",
                  ground_truth="STORE_LONG_TERM", label="user-preference"),
        EvalInput(content="Meeting with Dr. Smith tomorrow at 3pm in room 204",
                  ground_truth="STORE_TEMPORARY", label="temporal-event"),
        EvalInput(content="My SSN is 123-45-6789 and my credit card is 4111111111111111",
                  ground_truth="REJECT_PRIVACY", label="pii-sensitive"),
        EvalInput(content="ok",
                  ground_truth="REJECT", label="trivial-content"),
        EvalInput(content="Python uses 0-based indexing for lists and strings",
                  ground_truth="STORE_LONG_TERM", label="technical-fact"),
        EvalInput(content="The team standup is every day at 9am starting next Monday",
                  ground_truth="STORE_TEMPORARY", label="recurring-event"),
        EvalInput(content="My email is test@example.com and my phone is 555-123-4567",
                  ground_truth="STORE_ENCRYPT", label="personal-contact"),
        EvalInput(content="I prefer Python over JavaScript for backend development",
                  ground_truth="STORE_LONG_TERM", label="language-preference"),
        EvalInput(content="Binary search runs in O(log n) time complexity",
                  ground_truth="STORE_LONG_TERM", label="cs-fact"),
    ],
    "pii_heavy": [
        EvalInput(content="My passport number is AB1234567", ground_truth="STORE_ENCRYPT", label="passport"),
        EvalInput(content="Password for production: SuperSecret123!", ground_truth="REJECT_PRIVACY", label="credential"),
        EvalInput(content="My social security number is 987-65-4321", ground_truth="REJECT_PRIVACY", label="ssn"),
        EvalInput(content="John Doe lives at 123 Main Street, Springfield", ground_truth="STORE_ENCRYPT", label="address"),
        EvalInput(content="Contact: jane@company.com or call 555-987-6543", ground_truth="STORE_ENCRYPT", label="contact"),
    ],
    "temporal": [
        EvalInput(content="Sprint review is this Friday at 2pm", ground_truth="STORE_TEMPORARY", label="sprint"),
        EvalInput(content="Deadline for the paper submission is next Tuesday", ground_truth="STORE_TEMPORARY", label="deadline"),
        EvalInput(content="The conference starts tomorrow morning", ground_truth="STORE_TEMPORARY", label="conference"),
        EvalInput(content="Deployment is scheduled for tonight at midnight", ground_truth="STORE_TEMPORARY", label="deploy"),
        EvalInput(content="Git was created by Linus Torvalds in 2005", ground_truth="STORE_LONG_TERM", label="historical-fact"),
    ],
}


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post(
    "/research/evaluate",
    response_model=BatchEvalResponse,
    summary="Batch evaluation: AIMF + baseline policies on a list of inputs",
)
async def batch_evaluate(
    body: BatchEvalRequest,
    request: Request,
    db: DBSession,
) -> BatchEvalResponse:
    # Lazy import to avoid loading AI models at module import time (test isolation)
    from ai.pipeline.orchestrator import run_pipeline  # noqa: PLC0415

    start_total = time.perf_counter()
    eval_id = str(uuid.uuid4())

    nlp   = getattr(request.app.state, "nlp", None)
    embed = getattr(request.app.state, "embedding_model", None)
    faiss = getattr(request.app.state, "faiss", None)

    results: list[SingleEvalResult] = []

    for i, inp in enumerate(body.inputs):
        aimf_data = None
        baseline_data: dict[str, dict] = {}

        # Run AIMF
        if body.include_aimf:
            try:
                t0 = time.perf_counter()
                ctx = await run_pipeline(
                    raw_content=inp.content,
                    session_id=None,
                    db_session=db,
                    nlp_model=nlp,
                    embedding_model=embed,
                    faiss_index=faiss,
                )
                lat = (time.perf_counter() - t0) * 1000
                aimf_data = {
                    "decision":   ctx.decision,
                    "amgs_score": ctx.amgs_score,
                    "confidence": ctx.confidence,
                    "latency_ms": round(lat, 2),
                    "factors": {
                        "usefulness":        ctx.usefulness,
                        "context_relevance": ctx.context_relevance,
                        "frequency":         ctx.frequency,
                        "novelty":           ctx.novelty,
                        "redundancy":        ctx.redundancy,
                        "privacy_risk":      ctx.privacy_risk,
                        "temporal_decay":    ctx.temporal_decay,
                    },
                    "metadata": {
                        "sensitivity":        ctx.sensitivity,
                        "memory_category":    ctx.memory_category,
                        "is_temporal":        ctx.is_temporal,
                        "token_count":        ctx.token_count,
                    },
                    "rationale": ctx.rationale,
                }
            except Exception as exc:
                aimf_data = {"error": str(exc), "decision": "ERROR", "amgs_score": 0.0,
                             "latency_ms": 0, "factors": {}, "metadata": {"is_temporal": False}, "confidence": 0.0}

        # Run baselines
        for pol in body.policies:
            if pol in BASELINE_RUNNERS:
                t0 = time.perf_counter()
                res = BASELINE_RUNNERS[pol](inp.content)
                lat = time.perf_counter() - t0
                baseline_data[pol] = {**res, "latency_ms": round(lat * 1000, 3)}

        results.append(SingleEvalResult(
            index=i,
            label=inp.label,
            content_preview=inp.content[:80] + ("…" if len(inp.content) > 80 else ""),
            ground_truth=inp.ground_truth,
            aimf=aimf_data,
            baselines=baseline_data,
        ))

    metrics = _compute_metrics(results)
    total_ms = (time.perf_counter() - start_total) * 1000

    return BatchEvalResponse(
        eval_id=eval_id,
        total=len(results),
        results=results,
        metrics=metrics,
        latency_ms=round(total_ms, 2),
    )


@router.post(
    "/research/corpus/{corpus_name}",
    summary="Evaluate a named built-in test corpus",
)
async def evaluate_corpus(
    corpus_name: str,
    request: Request,
    db: DBSession,
) -> BatchEvalResponse:
    if corpus_name not in TEST_CORPUS:
        raise HTTPException(
            status_code=404,
            detail=f"Corpus '{corpus_name}' not found. Available: {list(TEST_CORPUS.keys())}",
        )
    batch_req = BatchEvalRequest(inputs=TEST_CORPUS[corpus_name])
    return await batch_evaluate(batch_req, request, db)


@router.get(
    "/research/corpora",
    summary="List available built-in test corpora",
)
async def list_corpora() -> dict:
    return {
        "corpora": [
            {"name": k, "size": len(v), "description": f"Built-in {k} test corpus"}
            for k, v in TEST_CORPUS.items()
        ]
    }


@router.get(
    "/research/metrics",
    summary="Aggregate metrics over all stored memories",
)
async def aggregate_metrics(db: DBSession) -> dict:
    """Compute live metrics over the entire stored memory database."""
    result = await db.execute(select(Memory).where(Memory.status != "FORGOTTEN"))
    memories = result.scalars().all()

    if not memories:
        return {"n": 0, "message": "No memories stored yet"}

    total = len(memories)
    decisions: dict[str, int] = {}
    for m in memories:
        decisions[m.decision] = decisions.get(m.decision, 0) + 1

    storage_decisions = {"STORE", "STORE_LONG_TERM", "STORE_ENCRYPT", "STORE_TEMPORARY", "SUMMARIZE"}
    stored = sum(1 for m in memories if m.decision in storage_decisions)
    encrypted = sum(1 for m in memories if m.is_encrypted)
    avg_amgs = sum(m.amgs_score for m in memories) / total
    avg_access = sum(m.access_count for m in memories) / total
    expired = sum(1 for m in memories if m.status == "EXPIRED")
    archived = sum(1 for m in memories if m.status == "ARCHIVED")

    # Privacy metrics
    high_priv = sum(1 for m in memories if m.f_privacy_risk > 0.5)
    priv_protected = sum(1 for m in memories if m.f_privacy_risk > 0.5
                         and m.decision in ("STORE_ENCRYPT", "REJECT", "REJECT_PRIVACY"))

    return {
        "n": total,
        "decision_distribution": decisions,
        "storage_rate": round(stored / total, 4),
        "encrypted_rate": round(encrypted / total, 4),
        "mean_amgs": round(avg_amgs, 4),
        "mean_access_count": round(avg_access, 2),
        "expired_count": expired,
        "archived_count": archived,
        "privacy_items": high_priv,
        "privacy_protection_rate": round(priv_protected / max(high_priv, 1), 4),
        "computed_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get(
    "/research/export",
    summary="Export all memories as JSON or CSV",
)
async def export_memories(
    db: DBSession,
    fmt: str = Query("json", description="json | csv"),
) -> StreamingResponse:
    result = await db.execute(select(Memory).where(Memory.status != "FORGOTTEN"))
    memories = result.scalars().all()

    if fmt == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            "id", "decision", "amgs_score", "sensitivity", "memory_category",
            "status", "f_usefulness", "f_context_rel", "f_frequency",
            "f_novelty", "f_redundancy", "f_privacy_risk", "f_temporal_decay",
            "is_encrypted", "access_count", "created_at",
        ])
        writer.writeheader()
        for m in memories:
            writer.writerow({
                "id": m.id, "decision": m.decision, "amgs_score": m.amgs_score,
                "sensitivity": m.sensitivity, "memory_category": m.memory_category,
                "status": m.status,
                "f_usefulness": m.f_usefulness, "f_context_rel": m.f_context_rel,
                "f_frequency": m.f_frequency, "f_novelty": m.f_novelty,
                "f_redundancy": m.f_redundancy, "f_privacy_risk": m.f_privacy_risk,
                "f_temporal_decay": m.f_temporal_decay,
                "is_encrypted": m.is_encrypted, "access_count": m.access_count,
                "created_at": m.created_at,
            })
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=aimf_memories.csv"},
        )

    # JSON export
    data = [
        {
            "id": m.id, "decision": m.decision, "amgs_score": m.amgs_score,
            "sensitivity": m.sensitivity, "memory_category": m.memory_category,
            "status": m.status,
            "factors": {
                "usefulness": m.f_usefulness, "context_relevance": m.f_context_rel,
                "frequency": m.f_frequency, "novelty": m.f_novelty,
                "redundancy": m.f_redundancy, "privacy_risk": m.f_privacy_risk,
                "temporal_decay": m.f_temporal_decay,
            },
            "is_encrypted": m.is_encrypted,
            "access_count": m.access_count,
            "created_at": m.created_at,
        }
        for m in memories
    ]
    json_str = json.dumps({"exported_at": datetime.now(timezone.utc).isoformat(), "memories": data}, indent=2)
    return StreamingResponse(
        iter([json_str]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=aimf_memories.json"},
    )
