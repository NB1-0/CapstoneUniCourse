"""
Streaming endpoints — SSE and WebSocket.

GET  /api/stream/search   → Server-Sent Events (one-way, HTTP/1.1 compatible)
WS   /api/ws/search       → WebSocket (bidirectional, supports multi-turn)

Both deliver the same progressive event sequence:
  start     → {"type":"start", "query":"..."}
  bm25      → {"type":"bm25", "results":[...], "count":N, "elapsed_ms":N}
  reranking → {"type":"reranking", "elapsed_ms":N}
  final     → {"type":"final", "results":[...], "total":N, "processing_time_ms":N}
  done      → {"type":"done", "processing_time_ms":N}
  error     → {"type":"error", "message":"..."}
"""

from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from app.agents.course_retrieval_agent import CourseRetrievalAgent
from app.services import memory_service

router = APIRouter()
_agent = CourseRetrievalAgent()


# ── Shared: apply personalization to final event ──────────────────────────────

def _personalize_final(event: dict, user_id: str, query: str) -> dict:
    """Post-hoc memory personalization on the final result set."""
    from app.schemas.response import CourseResult
    try:
        results = [CourseResult(**r) for r in event.get("results", [])]
        results = memory_service.personalize_results(user_id, results, query)
        memory_service.record_search(user_id, query, results)
        event = {**event, "results": [r.model_dump() for r in results]}
    except Exception:
        pass
    return event


# ── SSE endpoint ──────────────────────────────────────────────────────────────

@router.get("/stream/search", tags=["Streaming"])
async def sse_search(
    request: Request,
    query: str = Query(..., min_length=1),
    user_id: Optional[str] = Query(None),
    top_k: int = Query(10, ge=1, le=50),
    difficulty: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None, ge=0.0, le=5.0),
):
    filters: dict = {}
    if difficulty:
        filters["difficulty"] = difficulty
    if min_rating is not None:
        filters["min_rating"] = min_rating

    async def event_stream():
        try:
            async for event in _agent.stream({
                "query": query,
                "filters": filters,
                "top_k": top_k,
            }):
                # Apply memory personalization to the final result set
                if event.get("type") == "final" and user_id:
                    event = _personalize_final(event, user_id, query)

                yield f"data: {json.dumps(event)}\n\n"

                # Stop sending if client disconnected
                if await request.is_disconnected():
                    break
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",   # Disable Nginx buffering
            "Access-Control-Allow-Origin": "*",
        },
    )


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@router.websocket("/ws/search")
async def ws_search(websocket: WebSocket):
    """
    Bidirectional streaming search.

    Client sends:
      {"query": "machine learning", "user_id": "...", "top_k": 10}

    Server replies with the same progressive event stream as SSE.
    The connection stays open — client can send multiple queries.
    """
    await websocket.accept()
    try:
        while True:
            # Wait for search request
            try:
                data = await websocket.receive_json()
            except WebSocketDisconnect:
                break

            query   = (data.get("query") or "").strip()
            user_id = data.get("user_id")
            top_k   = int(data.get("top_k", 10))
            filters: dict = {}
            if diff := data.get("difficulty"):
                filters["difficulty"] = diff
            if mr := data.get("min_rating"):
                filters["min_rating"] = float(mr)

            if not query:
                await websocket.send_json({"type": "error", "message": "Query cannot be empty"})
                continue

            # Stream events back to client
            async for event in _agent.stream({
                "query": query,
                "filters": filters,
                "top_k": top_k,
            }):
                if event.get("type") == "final" and user_id:
                    event = _personalize_final(event, user_id, query)

                await websocket.send_json(event)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


# ── Cache stats endpoint ──────────────────────────────────────────────────────

@router.get("/cache/stats", tags=["Performance"])
async def cache_stats():
    from app.services.cache_service import get_cache_service
    return get_cache_service().stats()


@router.delete("/cache/search", tags=["Performance"])
async def invalidate_search_cache():
    from app.services.cache_service import get_cache_service
    count = await get_cache_service().invalidate_search_cache()
    return {"invalidated": count, "pattern": "intellicourse:search:*"}


@router.delete("/cache/courses", tags=["Performance"])
async def invalidate_courses_cache():
    from app.services.cache_service import get_cache_service
    count = await get_cache_service().invalidate_courses_cache()
    return {"invalidated": count, "pattern": "intellicourse:courses:list:*"}
