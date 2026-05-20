import time

from fastapi import APIRouter

from app.agents.skill_gap_agent import SkillGapAgent
from app.config import get_settings
from app.schemas.request import SkillGapRequest
from app.schemas.response import SkillGapResponse
from app.services.cache_service import get_cache_service

router = APIRouter()
_agent = SkillGapAgent()


@router.post("/skill-gap", response_model=SkillGapResponse, tags=["Skill Gap"])
async def analyze_skill_gap(request: SkillGapRequest):
    start = time.time()
    settings = get_settings()
    cache = get_cache_service()

    cache_key = cache.make_key("skill_gap", request.model_dump())
    if cached := await cache.get(cache_key):
        cached["processing_time_ms"] = round((time.time() - start) * 1000, 2)
        return SkillGapResponse(**cached)

    result = await _agent.execute({
        "target_role": request.target_role,
        "current_skills": request.current_skills,
    })
    result["processing_time_ms"] = round((time.time() - start) * 1000, 2)
    response = SkillGapResponse(**result)
    await cache.set(cache_key, response.model_dump(), ttl=settings.REDIS_TTL)
    return response
