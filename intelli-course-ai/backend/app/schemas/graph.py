"""Pydantic schemas for GraphRAG API requests and responses."""

from pydantic import BaseModel, Field


# ── Requests ─────────────────────────────────────────────────────────────────

class SkillPathRequest(BaseModel):
    from_skill: str = Field(..., description="Starting skill name")
    to_skill: str = Field(..., description="Target skill name")
    max_depth: int = Field(default=8, ge=1, le=12)


class CareerPathRequest(BaseModel):
    career_goal: str = Field(..., description="Target career title")
    current_skills: list[str] = Field(default_factory=list)
    max_courses_per_skill: int = Field(default=2, ge=1, le=5)


class GraphRecommendRequest(BaseModel):
    query: str = Field(..., description="Natural language query")
    current_skills: list[str] = Field(default_factory=list)
    target_skills: list[str] = Field(default_factory=list)
    top_k: int = Field(default=10, ge=1, le=30)
    node_types: list[str] = Field(default_factory=list, description="Filter viz by type")


class GraphExploreRequest(BaseModel):
    node_types: list[str] = Field(default_factory=list)
    max_nodes: int = Field(default=250, ge=10, le=500)
    focus_skill: str | None = None


# ── Sub-models ────────────────────────────────────────────────────────────────

class VizNode(BaseModel):
    id: str
    label: str
    type: str
    properties: dict = Field(default_factory=dict)


class VizEdge(BaseModel):
    source: str
    target: str
    type: str


class GraphStats(BaseModel):
    total_nodes: int
    total_edges: int
    nodes_by_type: dict[str, int]
    edges_by_type: dict[str, int]
    neo4j_active: bool = False


class SkillStep(BaseModel):
    skill: str
    rel_type: str | None
    depth: int
    courses: list[dict] = Field(default_factory=list)
    estimated_weeks: int = 4


class CareerSkillGap(BaseModel):
    skill: str
    have: bool
    importance: str = "important"
    courses: list[dict] = Field(default_factory=list)


class GraphCourseResult(BaseModel):
    id: str
    course_name: str
    organization: str
    difficulty_level: str
    rating: float
    skills: list[str]
    course_url: str = ""
    relevance_score: float = 0.0
    graph_score: float = 0.0
    hybrid_score: float = 0.0
    why_recommended: str = ""
    students_enrolled: int = 0


# ── Responses ────────────────────────────────────────────────────────────────

class SkillPathResponse(BaseModel):
    from_skill: str
    to_skill: str
    path_found: bool
    path: list[SkillStep]
    total_steps: int
    estimated_weeks: int
    processing_time_ms: float


class CareerPathResponse(BaseModel):
    career_goal: str
    required_skills: list[str]
    current_skills: list[str]
    missing_skills: list[str]
    readiness_score: float
    skill_gaps: list[CareerSkillGap]
    recommended_sequence: list[GraphCourseResult]
    graph_data: dict = Field(default_factory=dict)
    processing_time_ms: float


class GraphRecommendResponse(BaseModel):
    query: str
    results: list[GraphCourseResult]
    total: int
    graph_enhanced: bool
    processing_time_ms: float


class GraphExploreResponse(BaseModel):
    nodes: list[VizNode]
    edges: list[VizEdge]
    stats: dict
    processing_time_ms: float


class RelatedSkillsResponse(BaseModel):
    skill: str
    advances_to: list[str]
    related_to: list[str]
    leads_to: list[str]
    required_by_careers: list[str]
    taught_by_courses: list[dict]
