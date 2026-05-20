from fastapi import APIRouter, Query
from app.schemas.response import CoursesListResponse, CourseResult
from app.services.search_service import get_search_service

router = APIRouter()


@router.get("/courses", response_model=CoursesListResponse, tags=["Courses"])
async def list_courses(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    difficulty: str | None = Query(default=None),
    min_rating: float | None = Query(default=None, ge=0.0, le=5.0),
    search: str | None = Query(default=None),
    skill: str | None = Query(default=None),
):
    svc = get_search_service()
    courses = svc.courses[:]

    if difficulty:
        courses = [c for c in courses if c.difficulty_level.lower() == difficulty.lower()]
    if min_rating is not None:
        courses = [c for c in courses if c.rating >= min_rating]
    if search:
        q = search.lower()
        courses = [c for c in courses if q in c.course_name.lower() or q in c.description.lower()]
    if skill:
        sk = skill.lower()
        courses = [c for c in courses if any(sk in s.lower() for s in c.skills)]

    total = len(courses)
    start = (page - 1) * page_size
    end = start + page_size
    page_courses = courses[start:end]

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
            relevance_score=c.rating / 5.0,
            why_recommended="",
            prerequisites=c.prerequisites,
            course_url=c.course_url,
        )
        for c in page_courses
    ]

    return CoursesListResponse(courses=results, total=total, page=page, page_size=page_size)
