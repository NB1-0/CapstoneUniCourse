from typing import Optional

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel

from app.services import memory_service

router = APIRouter()


# ── Request schemas ───────────────────────────────────────────────────────────

class InteractionRequest(BaseModel):
    course_id: str
    course_name: str
    skills: list[str] = []
    action: str = "view"   # 'save' | 'view'


class SkillsRequest(BaseModel):
    skills: list[str]


class CareerRequest(BaseModel):
    career: str


class LevelRequest(BaseModel):
    level: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/{user_id}", tags=["Memory"])
async def get_memory(user_id: str):
    """Return the full memory profile for a user."""
    profile = memory_service.get_profile(user_id)
    return profile.to_dict()


@router.delete("/{user_id}", tags=["Memory"])
async def clear_memory(user_id: str):
    """Wipe all memory for a user (irreversible)."""
    memory_service.clear_memory(user_id)
    return {"cleared": True, "user_id": user_id}


@router.delete("/{user_id}/entry/{index}", tags=["Memory"])
async def remove_memory_entry(user_id: str, index: int):
    """Remove a specific entry by its position in the last-30 visible list."""
    ok = memory_service.remove_entry(user_id, index)
    if not ok:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"removed": True}


@router.post("/{user_id}/interaction", tags=["Memory"])
async def record_interaction(user_id: str, body: InteractionRequest):
    """Record a course save or view from the frontend."""
    if body.action not in ("save", "view"):
        raise HTTPException(status_code=422, detail="action must be 'save' or 'view'")
    memory_service.record_interaction(
        user_id=user_id,
        course_id=body.course_id,
        course_name=body.course_name,
        skills=body.skills,
        action=body.action,
    )
    return {"recorded": True}


@router.post("/{user_id}/skills", tags=["Memory"])
async def record_skills(user_id: str, body: SkillsRequest):
    """Record explicit skills from a form (skill-gap, career form, etc.)."""
    memory_service.record_skills(user_id, body.skills)
    return {"recorded": True, "count": len(body.skills)}


@router.post("/{user_id}/career", tags=["Memory"])
async def record_career(user_id: str, body: CareerRequest):
    """Record or update the user's career goal."""
    memory_service.record_career(user_id, body.career)
    return {"recorded": True}


@router.post("/{user_id}/level", tags=["Memory"])
async def record_level(user_id: str, body: LevelRequest):
    """Record the user's experience level."""
    memory_service.record_level(user_id, body.level)
    return {"recorded": True}
