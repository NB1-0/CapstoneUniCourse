import time

from fastapi import APIRouter

from app.agents.learning_path_agent import LearningPathAgent
from app.config import get_settings
from app.schemas.request import LearningPathRequest
from app.schemas.response import LearningPathResponse
from app.services.cache_service import get_cache_service

router = APIRouter()
_agent = LearningPathAgent()


@router.post("/learning-path", response_model=LearningPathResponse, tags=["Learning Path"])
async def generate_learning_path(request: LearningPathRequest):
    start = time.time()
    settings = get_settings()
    cache = get_cache_service()

    cache_key = cache.make_key("learning_path", request.model_dump())
    if cached := await cache.get(cache_key):
        cached["processing_time_ms"] = round((time.time() - start) * 1000, 2)
        return LearningPathResponse(**cached)

    result = await _agent.execute({
        "goal": request.goal,
        "current_level": request.current_level,
        "max_courses": request.max_courses,
    })

    result["processing_time_ms"] = round((time.time() - start) * 1000, 2)
    response = LearningPathResponse(**result)
    await cache.set(cache_key, response.model_dump(), ttl=settings.REDIS_TTL)
    return response
