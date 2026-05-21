from pydantic import BaseModel, Field


class CourseResult(BaseModel):
    id: str
    course_name: str
    organization: str
    description: str
    skills: list[str]
    difficulty_level: str
    rating: float
    matched_skills: list[str] = Field(default_factory=list)
    relevance_score: float = Field(default=0.0, ge=0.0, le=1.0)
    why_recommended: str = ""
    prerequisites: list[str] = Field(default_factory=list)
    next_course_suggestion: str | None = None
    course_url: str | None = None
    certificate_type: str = ""
    students_enrolled: int = 0


class SearchResponse(BaseModel):
    query: str
    results: list[CourseResult]
    total: int
    clarification_needed: bool = False
    clarification_question: str | None = None
    processing_time_ms: float


class RecommendResponse(BaseModel):
    recommendations: list[CourseResult]
    rationale: str = ""
    total: int
    processing_time_ms: float


class LearningPathStep(BaseModel):
    order: int
    phase: str  # beginner / intermediate / advanced
    course: CourseResult
    skills_gained: list[str]
    reason: str
    estimated_duration: str
    prerequisites_met: bool = True


class LearningPathResponse(BaseModel):
    goal: str
    total_steps: int
    estimated_total_duration: str
    path: list[LearningPathStep]
    summary: str
    processing_time_ms: float


class SkillGapItem(BaseModel):
    skill: str
    have: bool
    importance: str = "important"  # critical / important / nice-to-have
    courses_to_fill_gap: list[CourseResult] = Field(default_factory=list)


class SkillGapResponse(BaseModel):
    target_role: str
    required_skills: list[str]
    current_skills: list[str]
    missing_skills: list[str]
    skill_gaps: list[SkillGapItem]
    readiness_score: float = Field(ge=0.0, le=100.0)
    recommendation: str
    processing_time_ms: float


class CareerAlignResponse(BaseModel):
    career_goal: str
    alignment_score: float = Field(ge=0.0, le=100.0)
    aligned_courses: list[CourseResult]
    career_roadmap: str
    key_skills_needed: list[str]
    processing_time_ms: float


class CoursesListResponse(BaseModel):
    courses: list[CourseResult]
    total: int
    page: int
    page_size: int


class IngestResponse(BaseModel):
    success: bool
    courses_ingested: int
    message: str
    processing_time_ms: float


class HealthResponse(BaseModel):
    status: str
    version: str
    mock_mode: bool
    services: dict[str, str]
