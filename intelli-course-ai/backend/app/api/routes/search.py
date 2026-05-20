import time

from fastapi import APIRouter, HTTPException

from app.agents.course_retrieval_agent import CourseRetrievalAgent
from app.config import get_settings
from app.schemas.request import SearchRequest
from app.schemas.response import SearchResponse
from app.services.cache_service import get_cache_service

router = APIRouter()
_agent = CourseRetrievalAgent()


@router.post("/search", response_model=SearchResponse, tags=["Search"])
async def search_courses(request: SearchRequest):
    start = time.time()
    settings = get_settings()
    cache = get_cache_service()

    cache_key = cache.make_key("search", request.model_dump())
    if cached := await cache.get(cache_key):
        cached["processing_time_ms"] = round((time.time() - start) * 1000, 2)
        return SearchResponse(**cached)

    if not request.query.strip():
        raise HTTPException(status_code=422, detail="Query cannot be empty")

    result = await _agent.execute({
        "query": request.query,
        "filters": request.filters,
        "top_k": request.top_k,
    })

    results = result.get("results", [])
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

    await cache.set(cache_key, response.model_dump(), ttl=settings.REDIS_TTL)
    return response
