"""
Market Intelligence models — Pydantic schemas for API responses.
All salary figures are USD/year. Growth rates are YoY percentages.
"""

from pydantic import BaseModel


class TrendingSkill(BaseModel):
    skill: str
    demand_score: float         # 0–100 composite demand index
    growth_rate: float          # % YoY change in job postings
    job_postings: int           # estimated active listings
    avg_salary: int             # USD/year median
    category: str               # AI/ML | Cloud | Web | Security | Data | DevOps | Languages
    difficulty: str             # Beginner | Intermediate | Advanced
    is_emerging: bool           # true for skills <3 yrs mainstream adoption
    related_careers: list[str]
    course_count: int = 0       # enriched from actual course catalogue


class CareerDemand(BaseModel):
    title: str
    demand_level: str           # Critical | High | Growing | Stable
    category: str               # Engineering | Data | Design | Management | Security
    growth_rate: float
    avg_salary: int
    salary_min: int
    salary_max: int
    required_skills: list[str]
    trending_skills: list[str]  # skills gaining traction in this role
    remote_friendly: bool
    description: str


class EmergingTech(BaseModel):
    name: str
    category: str               # AI/ML | Cloud | Web | Security | Data | Systems
    adoption_stage: str         # Early Adopter | Growing | Mainstream
    hype_score: float           # 0–100
    description: str
    use_cases: list[str]
    recommended_skills: list[str]
    market_size: str            # e.g. "$15B by 2028"
    timeline: str               # e.g. "Mainstream by 2026"


class SkillInsight(BaseModel):
    skill: str
    demand_score: float
    growth_rate: float
    trend_summary: str
    career_alignment: list[str]
    market_context: str
    salary_impact: str
    recommended_courses: list[dict]


class MarketSummary(BaseModel):
    total_skills_tracked: int
    fastest_growing: str
    fastest_growth_rate: float
    hottest_career: str
    top_emerging_tech: str
    avg_salary_increase_pct: float
    last_updated: str
