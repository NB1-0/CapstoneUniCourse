"""
Future Timeline Generator.

Generates a list of FutureCareerPath objects from a StudentProfile.
Pulls real courses from the existing catalogue for each missing skill.
Falls back to descriptive placeholders if the catalogue has no match.
"""

from __future__ import annotations

import uuid

from app.future_path_ai.schemas import FutureCareerPath, RoadmapStep, StudentProfile
from app.future_path_ai.scoring import CAREER_PROFILES, match_career, score_path
from app.future_path_ai.explanation import build_explanation

_PHASES = ["Foundation", "Core Skills", "Advanced", "Career Ready"]

# Default career order when the user hasn't specified targets
_DEFAULT_CAREERS = ["Data Scientist", "ML Engineer", "GenAI Engineer", "Software Engineer"]


# ── Course catalogue helper ───────────────────────────────────────────────────

def _find_courses_for_skill(skill: str, limit: int = 2) -> list[dict]:
    """Return top-rated catalogue courses that teach the given skill."""
    try:
        from app.services.search_service import get_search_service
        svc = get_search_service()
        keyword = skill.lower().split()[0]
        hits = [
            c for c in svc.courses
            if keyword in " ".join(getattr(c, "skills", [])).lower()
            or keyword in getattr(c, "course_name", "").lower()
        ]
        hits.sort(key=lambda c: getattr(c, "rating", 0), reverse=True)
        return [
            {
                "id": getattr(c, "id", ""),
                "course_name": getattr(c, "course_name", ""),
                "organization": getattr(c, "organization", ""),
                "difficulty_level": getattr(c, "difficulty_level", ""),
                "rating": getattr(c, "rating", 0.0),
                "course_url": getattr(c, "course_url", None),
                "skills": getattr(c, "skills", [])[:4],
            }
            for c in hits[:limit]
        ]
    except Exception:
        return []


# ── Roadmap builder ───────────────────────────────────────────────────────────

def _build_roadmap(career_key: str, missing_skills: list[str], current_skills: list[str]) -> list[RoadmapStep]:
    cp = CAREER_PROFILES[career_key]
    current_lower = {s.lower() for s in current_skills}

    # Prioritise prerequisites not yet covered, then remaining missing skills
    prereqs_missing = [p for p in cp["prerequisites"] if p.lower() not in current_lower]
    remaining = [s for s in missing_skills if s not in prereqs_missing]
    ordered = (prereqs_missing + remaining)[:8]

    steps: list[RoadmapStep] = []
    for i, skill in enumerate(ordered):
        courses = _find_courses_for_skill(skill, limit=1)
        course_name = courses[0]["course_name"] if courses else f"{skill} — Foundational Course"
        course_id = courses[0]["id"] if courses else ""

        phase = _PHASES[min(i // 2, 3)]
        weeks = 3 if i < 2 else (4 if i < 4 else 5)

        steps.append(RoadmapStep(
            step=i + 1,
            phase=phase,
            skill=skill,
            course_name=course_name,
            course_id=course_id,
            estimated_weeks=weeks,
            description=f"Build proficiency in {skill} for {career_key} readiness.",
        ))
    return steps


# ── Path label helper ─────────────────────────────────────────────────────────

_TIMELINE_PREFIX = {
    "Conservative Path": "Steady",
    "Balanced Path": "Balanced",
    "Aggressive Path": "Accelerated",
    "Experimental Path": "Frontier",
}


def _path_label(career_key: str, timeline_type: str) -> str:
    prefix = _TIMELINE_PREFIX.get(timeline_type, "")
    return f"{prefix} {career_key} Track".strip()


# ── Closest-career fallback ───────────────────────────────────────────────────

def _closest_career(target: str) -> str:
    target_lower = target.lower()
    for key in CAREER_PROFILES:
        if any(w in target_lower for w in key.lower().split() if len(w) > 3):
            return key
    return list(CAREER_PROFILES.keys())[0]


# ── Public API ────────────────────────────────────────────────────────────────

def generate_paths(profile: StudentProfile) -> list[FutureCareerPath]:
    """
    Generate one FutureCareerPath per recognised target career (up to 4),
    augmented with popular defaults so the user always sees at least 3 options.
    """
    # Resolve requested careers
    resolved: dict[str, str] = {}  # canonical_key → display_name
    for t in profile.target_careers:
        key = match_career(t) or _closest_career(t)
        if key and key not in resolved:
            resolved[key] = t

    # Add defaults until we have ≥ 3 and ≤ 4 paths
    for dc in _DEFAULT_CAREERS:
        if len(resolved) >= 4:
            break
        if dc not in resolved:
            resolved[dc] = dc

    paths: list[FutureCareerPath] = []
    for career_key in resolved:
        scores = score_path(career_key, profile)
        roadmap = _build_roadmap(career_key, scores["missing_skills"], profile.current_skills)

        # Collect best unique courses from roadmap steps
        rec_courses: list[dict] = []
        seen: set[str] = set()
        for step in roadmap:
            for c in _find_courses_for_skill(step.skill, limit=1):
                if c["id"] and c["id"] not in seen:
                    rec_courses.append(c)
                    seen.add(c["id"])
                    if len(rec_courses) >= 5:
                        break
            if len(rec_courses) >= 5:
                break

        path = FutureCareerPath(
            path_id=str(uuid.uuid4())[:8],
            path_name=_path_label(career_key, scores["timeline_type"]),
            career_goal=career_key,
            timeline_type=scores["timeline_type"],
            estimated_months=scores["estimated_months"],
            success_probability=scores["success_probability"],
            readiness_score=scores["readiness_score"],
            difficulty_risk=scores["difficulty_risk"],
            career_alignment_score=scores["career_alignment_score"],
            missing_skills=scores["missing_skills"],
            recommended_courses=rec_courses,
            roadmap_steps=roadmap,
            explanation=build_explanation(career_key, scores, profile),
            score_breakdown=scores["score_breakdown"],
        )
        paths.append(path)

    # Highest success probability first
    paths.sort(key=lambda p: p.success_probability, reverse=True)
    return paths
