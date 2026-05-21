"""
Courses list endpoint.

Performance improvements:
  • Single-pass filter (one list comprehension vs five sequential passes)
  • Redis cache by filter hash — 5 min TTL
  • sort_by parameter (rating | name | students)
  • Keeps offset-based pagination (stable API contract)
"""

from typing import Literal, Optional

from fastapi import APIRouter, Query

from app.schemas.response import CoursesListResponse, CourseResult
from app.services.cache_service import get_cache_service
from app.services.search_service import get_search_service

router = APIRouter()

SortBy = Literal["rating", "name", "students"]

_SORT_KEY = {
    "rating":   lambda c: -c.rating,
    "name":     lambda c: c.course_name.lower(),
    "students": lambda c: -(getattr(c, "students_enrolled", 0) or 0),
}


@router.get("/courses", response_model=CoursesListResponse, tags=["Courses"])
async def list_courses(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    difficulty: Optional[str] = Query(default=None),
    min_rating: Optional[float] = Query(default=None, ge=0.0, le=5.0),
    search: Optional[str] = Query(default=None),
    skill: Optional[str] = Query(default=None),
    sort_by: SortBy = Query(default="rating"),
):
    cache = get_cache_service()
    cache_key = cache.make_key("courses:list", {
        "p": page, "ps": page_size, "d": difficulty,
        "mr": min_rating, "s": search, "sk": skill, "sb": sort_by,
    })

    if cached := await cache.get(cache_key):
        return CoursesListResponse(**cached)

    svc = get_search_service()

    # Normalise filter values once
    diff_lower   = difficulty.lower() if difficulty else None
    search_lower = search.lower() if search else None
    skill_lower  = skill.lower() if skill else None

    # Single-pass filter
    courses = [
        c for c in svc.courses
        if (not diff_lower or c.difficulty_level.lower() == diff_lower)
        and (min_rating is None or c.rating >= min_rating)
        and (not search_lower or search_lower in c.course_name.lower() or search_lower in c.description.lower())
        and (not skill_lower or any(skill_lower in s.lower() for s in c.skills))
    ]

    courses.sort(key=_SORT_KEY.get(sort_by, _SORT_KEY["rating"]))

    total = len(courses)
    start = (page - 1) * page_size
    page_courses = courses[start: start + page_size]

    results = [
        CourseResult(
            id=c.id,
            course_name=c.course_name,
            organization=c.organization,
            description=c.description,
            skills=c.skills,
            difficulty_level=c.difficulty_level,
            rating=c.rating,
            matched_skills=[],
            relevance_score=round(c.rating / 5.0, 4),
            why_recommended="",
            prerequisites=c.prerequisites,
            course_url=c.course_url,
        )
        for c in page_courses
    ]

    from app.config import get_settings
    response = CoursesListResponse(courses=results, total=total, page=page, page_size=page_size)
    await cache.set(cache_key, response.model_dump(), ttl=get_settings().CACHE_COURSES_TTL)
    return response
