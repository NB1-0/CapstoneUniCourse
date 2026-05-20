import time

from fastapi import APIRouter

from app.agents.career_alignment_agent import CareerAlignmentAgent
from app.config import get_settings
from app.schemas.request import CareerAlignRequest
from app.schemas.response import CareerAlignResponse
from app.services.cache_service import get_cache_service

router = APIRouter()
_agent = CareerAlignmentAgent()


@router.post("/career-align", response_model=CareerAlignResponse, tags=["Career"])
async def align_career(request: CareerAlignRequest):
    start = time.time()
    settings = get_settings()
    cache = get_cache_service()

    cache_key = cache.make_key("career", request.model_dump())
    if cached := await cache.get(cache_key):
        cached["processing_time_ms"] = round((time.time() - start) * 1000, 2)
        return CareerAlignResponse(**cached)

    result = await _agent.execute({
        "career_goal": request.career_goal,
        "current_skills": request.current_skills,
    })
    result["processing_time_ms"] = round((time.time() - start) * 1000, 2)
    response = CareerAlignResponse(**result)
    await cache.set(cache_key, response.model_dump(), ttl=settings.REDIS_TTL)
    return response
