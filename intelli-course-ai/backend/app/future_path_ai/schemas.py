"""
Pydantic schemas for the FuturePath AI module.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Request models ────────────────────────────────────────────────────────────

class SimulateRequest(BaseModel):
    user_id: str
    current_skills: list[str] = Field(default_factory=list)
    completed_courses: list[str] = Field(default_factory=list)
    target_careers: list[str] = Field(default_factory=list)
    weekly_learning_hours: float = Field(default=10.0, ge=1.0, le=80.0)
    preferred_difficulty: str = Field(default="Intermediate")   # Beginner | Intermediate | Advanced
    learning_pace: str = Field(default="Moderate")               # Slow | Moderate | Fast | Accelerated
    career_priority: str = Field(default="balance")              # speed | quality | balance


class WhatIfRequest(BaseModel):
    user_id: str
    base_simulation_id: str
    scenario_change: str   # e.g. "increase_weekly_hours_to_15", "skip_mathematics"


# ── Response building-blocks ──────────────────────────────────────────────────

class RoadmapStep(BaseModel):
    step: int
    phase: str           # Foundation | Core Skills | Advanced | Career Ready
    skill: str
    course_name: str
    course_id: str
    estimated_weeks: int
    description: str


class FutureCareerPath(BaseModel):
    path_id: str
    path_name: str
    career_goal: str
    timeline_type: str   # Conservative Path | Balanced Path | Aggressive Path | Experimental Path
    estimated_months: int
    success_probability: float = Field(ge=0.0, le=100.0)
    readiness_score: float = Field(ge=0.0, le=100.0)
    difficulty_risk: str        # Low | Medium | High
    career_alignment_score: float = Field(ge=0.0, le=100.0)
    missing_skills: list[str]
    recommended_courses: list[dict]
    roadmap_steps: list[RoadmapStep]
    explanation: str
    score_breakdown: dict


class SimulationResponse(BaseModel):
    simulation_id: str
    user_id: str
    created_at: str
    paths: list[FutureCareerPath]
    summary: str
    processing_time_ms: float


class PathMetrics(BaseModel):
    success_probability: float
    estimated_months: int
    difficulty_risk: str
    timeline_type: str
    career_alignment_score: float


class WhatIfResponse(BaseModel):
    scenario: str
    explanation: str
    before_metrics: PathMetrics
    after_metrics: PathMetrics
    delta_probability: float
    delta_months: int
    risk_change: str       # Increased | Decreased | Unchanged
    recommendation: str
    processing_time_ms: float


class SimulationHistoryItem(BaseModel):
    simulation_id: str
    created_at: str
    target_careers: list[str]
    path_count: int
    top_probability: float


class HistoryResponse(BaseModel):
    user_id: str
    simulations: list[SimulationHistoryItem]
    total: int


# ── Internal helper ───────────────────────────────────────────────────────────

class StudentProfile(BaseModel):
    """Validated student profile used internally across the pipeline."""
    user_id: str
    current_skills: list[str] = Field(default_factory=list)
    completed_courses: list[str] = Field(default_factory=list)
    target_careers: list[str] = Field(default_factory=list)
    weekly_learning_hours: float = 10.0
    preferred_difficulty: str = "Intermediate"
    learning_pace: str = "Moderate"
    career_priority: str = "balance"
