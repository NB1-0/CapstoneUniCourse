from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(..., description="Natural language search query")
    filters: dict = Field(default_factory=dict, description="Optional filters: difficulty, min_rating, skills")
    top_k: int = Field(default=10, ge=1, le=50)
    user_id: str | None = None


class RecommendRequest(BaseModel):
    user_goals: str = Field(..., description="User's learning goals in natural language")
    current_skills: list[str] = Field(default_factory=list)
    target_skills: list[str] = Field(default_factory=list)
    difficulty_preference: str = Field(default="any", pattern="^(beginner|intermediate|advanced|any)$")
    user_id: str | None = None


class LearningPathRequest(BaseModel):
    goal: str = Field(..., description="Learning goal, e.g. 'Become a Data Scientist'")
    current_level: str = Field(default="beginner", pattern="^(beginner|intermediate|advanced)$")
    available_time: str = Field(default="self-paced")
    max_courses: int = Field(default=8, ge=2, le=20)
    user_id: str | None = None


class SkillGapRequest(BaseModel):
    target_role: str = Field(..., description="Target job role, e.g. 'Machine Learning Engineer'")
    current_skills: list[str] = Field(default_factory=list)
    user_id: str | None = None


class CareerAlignRequest(BaseModel):
    career_goal: str = Field(..., description="Career goal, e.g. 'Become a Cloud Architect'")
    current_skills: list[str] = Field(default_factory=list)
    user_id: str | None = None


class IngestRequest(BaseModel):
    source: str = Field(default="csv", pattern="^(csv|json|sample)$")
    file_path: str = Field(default="data/courses.csv")
