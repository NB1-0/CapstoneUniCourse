"""
FuturePath AI Service — orchestrates simulate, what-if, and history.

Storage: in-memory dict (user_id → list of simulation records).
For production, swap _simulations for PostgreSQL + Redis.
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime, UTC

import structlog

from app.future_path_ai.schemas import (
    SimulateRequest,
    WhatIfRequest,
    StudentProfile,
    SimulationResponse,
    WhatIfResponse,
    HistoryResponse,
    SimulationHistoryItem,
)
from app.future_path_ai.timeline_generator import generate_paths
from app.future_path_ai.what_if import run_what_if
from app.future_path_ai.graph_builder import build_timeline_graph
from app.future_path_ai.scoring import match_career
from app.future_path_ai.schemas import FutureCareerPath

logger = structlog.get_logger()

# In-memory store: user_id → list[simulation_record]
_simulations: dict[str, list[dict]] = {}


def simulate(request: SimulateRequest) -> SimulationResponse:
    start = time.time()
    sim_id = str(uuid.uuid4())[:12]

    profile = StudentProfile(
        user_id=request.user_id,
        current_skills=request.current_skills,
        completed_courses=request.completed_courses,
        target_careers=request.target_careers,
        weekly_learning_hours=request.weekly_learning_hours,
        preferred_difficulty=request.preferred_difficulty,
        learning_pace=request.learning_pace,
        career_priority=request.career_priority,
    )

    paths = generate_paths(profile)
    summary = _build_summary(profile, paths)
    created_at = datetime.now(UTC).isoformat()

    # Persist for history and what-if
    record = {
        "simulation_id": sim_id,
        "created_at": created_at,
        "profile": profile.model_dump(),
        "paths": [p.model_dump() for p in paths],
    }
    _simulations.setdefault(request.user_id, []).append(record)
    logger.info("FuturePath simulation created", user_id=request.user_id, sim_id=sim_id, paths=len(paths))

    return SimulationResponse(
        simulation_id=sim_id,
        user_id=request.user_id,
        created_at=created_at,
        paths=paths,
        summary=summary,
        processing_time_ms=round((time.time() - start) * 1000, 2),
    )


def what_if(request: WhatIfRequest) -> WhatIfResponse:
    # Locate base simulation
    sims = _simulations.get(request.user_id, [])
    base_sim = next(
        (s for s in reversed(sims) if s["simulation_id"] == request.base_simulation_id),
        sims[-1] if sims else None,
    )

    if base_sim:
        profile = StudentProfile(**base_sim["profile"])
        top_path = max(base_sim["paths"], key=lambda p: p["success_probability"])
        base_career_key = match_career(top_path["career_goal"]) or "Data Scientist"
    else:
        # Graceful fallback — create a blank profile for the demo
        profile = StudentProfile(
            user_id=request.user_id,
            current_skills=[],
            target_careers=["Data Scientist"],
            weekly_learning_hours=10.0,
        )
        base_career_key = "Data Scientist"

    return run_what_if(request.scenario_change, profile, base_career_key)


def get_history(user_id: str) -> HistoryResponse:
    sims = _simulations.get(user_id, [])
    items = [
        SimulationHistoryItem(
            simulation_id=s["simulation_id"],
            created_at=s["created_at"],
            target_careers=[p["career_goal"] for p in s["paths"][:3]],
            path_count=len(s["paths"]),
            top_probability=max((p["success_probability"] for p in s["paths"]), default=0.0),
        )
        for s in reversed(sims[-20:])
    ]
    return HistoryResponse(user_id=user_id, simulations=items, total=len(items))


def get_graph(user_id: str, sim_id: str, path_id: str) -> dict | None:
    sims = _simulations.get(user_id, [])
    sim = next((s for s in sims if s["simulation_id"] == sim_id), None)
    if not sim:
        return None
    path_data = next((p for p in sim["paths"] if p["path_id"] == path_id), None)
    if not path_data:
        return None
    return build_timeline_graph(FutureCareerPath(**path_data))


def _build_summary(profile: StudentProfile, paths: list[FutureCareerPath]) -> str:
    if not paths:
        return "No paths generated for the given profile."
    best = paths[0]
    return (
        f"Generated {len(paths)} future career timelines. "
        f"Your strongest match is {best.career_goal} "
        f"({best.success_probability:.0f}% success probability, ~{best.estimated_months} months). "
        f"You currently have {len(profile.current_skills)} skills on record."
    )
