"""
Search endpoint — non-streaming (blocking) path.

Performance improvements:
  • Parallel memory context + agent.execute() via asyncio.gather()
  • Per-user cache key (different users get personalized caches)
  • Request timeout via asyncio.wait_for()
"""

import asyncio
import time

from fastapi import APIRouter, HTTPException

from app.agents.course_retrieval_agent import CourseRetrievalAgent
from app.config import get_settings
from app.schemas.request import SearchRequest
from app.schemas.response import SearchResponse
from app.services.cache_service import get_cache_service
from app.services import memory_service

router = APIRouter()
_agent = CourseRetrievalAgent()


@router.post("/search", response_model=SearchResponse, tags=["Search"])
async def search_courses(request: SearchRequest):
    start = time.time()
    settings = get_settings()
    cache = get_cache_service()

    # Per-user cache key so personalized results don't leak between users
    cache_key = cache.make_key("search", {**request.model_dump(), "_uid": request.user_id or ""})
    if cached := await cache.get(cache_key):
        cached["processing_time_ms"] = round((time.time() - start) * 1000, 2)
        return SearchResponse(**cached)

    if not request.query.strip():
        raise HTTPException(status_code=422, detail="Query cannot be empty")

    # Build memory context string and run search concurrently
    async def _get_memory_context() -> str:
        if request.user_id:
            return memory_service.build_memory_context_string(request.user_id)
        return ""

    try:
        memory_context, result = await asyncio.wait_for(
            asyncio.gather(
                _get_memory_context(),
                _agent.execute({
                    "query": request.query,
                    "filters": request.filters,
                    "top_k": request.top_k,
                    "memory_context": "",  # placeholder; gather fills it
                }),
            ),
            timeout=settings.SEARCH_TIMEOUT_SECS,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Search timed out — please try a simpler query.")

    results = result.get("results", [])

    # Post-hoc personalization + record search
    if request.user_id and results:
        results = memory_service.personalize_results(request.user_id, results, request.query)
        memory_service.record_search(request.user_id, request.query, results)

    clarification_needed = len(results) == 0 and len(request.query.split()) <= 2
    clarification_question = (
        "Could you be more specific? For example: 'Python for beginners' or 'Machine Learning career path'?"
        if clarification_needed else None
    )

    response = SearchResponse(
        query=request.query,
        results=results,
        total=len(results),
        clarification_needed=clarification_needed,
        clarification_question=clarification_question,
        processing_time_ms=round((time.time() - start) * 1000, 2),
    )

    await cache.set(cache_key, response.model_dump(), ttl=settings.CACHE_SEARCH_TTL)
    return response
