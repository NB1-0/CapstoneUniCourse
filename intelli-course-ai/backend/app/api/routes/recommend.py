import time

from fastapi import APIRouter

from app.agents.course_retrieval_agent import CourseRetrievalAgent
from app.config import get_settings
from app.schemas.request import RecommendRequest
from app.schemas.response import RecommendResponse
from app.services.cache_service import get_cache_service

router = APIRouter()
_agent = CourseRetrievalAgent()


@router.post("/recommend", response_model=RecommendResponse, tags=["Recommendations"])
async def recommend_courses(request: RecommendRequest):
    start = time.time()
    settings = get_settings()
    cache = get_cache_service()

    cache_key = cache.make_key("recommend", request.model_dump())
    if cached := await cache.get(cache_key):
        cached["processing_time_ms"] = round((time.time() - start) * 1000, 2)
        return RecommendResponse(**cached)

    combined_query = request.user_goals
    if request.target_skills:
        combined_query += " " + " ".join(request.target_skills)

    filters: dict = {}
    if request.difficulty_preference != "any":
        filters["difficulty"] = request.difficulty_preference

    result = await _agent.execute({"query": combined_query, "filters": filters, "top_k": 10})
    recommendations = result.get("results", [])

    rationale = (
        f"Based on your goal: '{request.user_goals}', "
        f"we found {len(recommendations)} courses matching your profile."
    )
    if not settings.MOCK_MODE and recommendations:
        try:
            from app.services.llm_service import get_llm_service
            llm = get_llm_service()
            rationale = await llm.chat(
                system_prompt="You are an academic advisor. In 2 sentences, explain why these courses are recommended.",
                user_message=f"Goal: {request.user_goals}\nSkills: {', '.join(request.current_skills)}",
            )
        except Exception:
            pass

    response = RecommendResponse(
        recommendations=recommendations,
        rationale=rationale,
        total=len(recommendations),
        processing_time_ms=round((time.time() - start) * 1000, 2),
    )
    await cache.set(cache_key, response.model_dump(), ttl=settings.REDIS_TTL)
    return response
