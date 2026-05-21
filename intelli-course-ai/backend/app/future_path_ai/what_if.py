"""
What-If Simulation Engine.

Parses a natural-language scenario_change string, applies a delta to
a StudentProfile copy, re-scores the path, and returns a before/after comparison.

Supported scenario patterns (case-insensitive, underscores/hyphens normalised):
  - "increase_weekly_hours_to_15"     → weekly_learning_hours = 15
  - "study 15 hours"                  → same
  - "skip mathematics"                → removes 'mathematics' from skills
  - "already know Python"             → adds 'Python' to skills
  - "choose GenAI Engineer"           → target_careers = ['GenAI Engineer']
  - "prefer advanced difficulty"      → preferred_difficulty = 'Advanced'
  - "accelerated pace"                → learning_pace = 'Accelerated'
"""

from __future__ import annotations

import re
import time

from app.future_path_ai.schemas import StudentProfile, PathMetrics, WhatIfResponse
from app.future_path_ai.scoring import score_path, match_career


# ── Scenario parsing ──────────────────────────────────────────────────────────

def _parse_scenario(scenario: str, profile: StudentProfile) -> tuple[StudentProfile, str]:
    """
    Returns (modified_profile, human_readable_desc).
    Profile is a fresh copy — original is untouched.
    """
    s = scenario.lower().replace("_", " ").replace("-", " ").strip()
    data = profile.model_dump()

    # Hours change: "increase weekly hours to 15" / "study 15 hours" / "15 hours per week"
    m = re.search(r"(?:increase.*hours.*to|study|study at)\s+(\d+)", s) or re.search(r"(\d+)\s+hours", s)
    if m:
        new_hours = float(m.group(1))
        data["weekly_learning_hours"] = new_hours
        return StudentProfile(**data), f"studying {new_hours:.0f} hours per week"

    # Skip skill/topic: "skip mathematics" / "skip deep learning"
    m = re.search(r"\bskip\s+(.+)$", s)
    if m:
        topic = m.group(1).strip()
        data["current_skills"] = [sk for sk in data["current_skills"] if topic not in sk.lower()]
        return StudentProfile(**data), f"skipping {topic}"

    # Already know / add / learn: "already know Python" / "add skill React"
    m = re.search(r"(?:already know|add skill|add|learn|i know|with)\s+(.+)$", s)
    if m:
        skill = m.group(1).strip().title()
        if skill not in data["current_skills"]:
            data["current_skills"].append(skill)
        return StudentProfile(**data), f"already knowing {skill}"

    # Choose career: "choose GenAI Engineer" / "switch to data scientist"
    m = re.search(r"(?:choose|switch to|target|become)\s+(.+)$", s)
    if m:
        career_name = m.group(1).strip().title()
        data["target_careers"] = [career_name]
        return StudentProfile(**data), f"targeting {career_name}"

    # Difficulty: "prefer advanced" / "change difficulty to beginner"
    m = re.search(r"(?:prefer|difficulty|study at)\s+(beginner|intermediate|advanced)", s)
    if m:
        level = m.group(1).capitalize()
        data["preferred_difficulty"] = level
        return StudentProfile(**data), f"preferring {level} difficulty"

    # Pace
    if any(x in s for x in ["accelerated pace", "accelerate", "very fast"]):
        data["learning_pace"] = "Accelerated"
        return StudentProfile(**data), "switching to accelerated pace"
    if "fast pace" in s or "faster" in s:
        data["learning_pace"] = "Fast"
        return StudentProfile(**data), "switching to fast pace"
    if "slow pace" in s or "slower" in s:
        data["learning_pace"] = "Slow"
        return StudentProfile(**data), "switching to slow pace"

    # Fallback — no recognised pattern, return unchanged profile
    return StudentProfile(**data), f'applying "{scenario}"'


# ── Explanation helpers ───────────────────────────────────────────────────────

def _explain(human_desc: str, delta_prob: float, delta_months: int, risk_change: str, modified: dict) -> str:
    parts = [f"Simulating the scenario of {human_desc}:"]
    if delta_prob > 0:
        parts.append(f"Your success probability improves by +{delta_prob:.1f} percentage points.")
    elif delta_prob < 0:
        parts.append(f"Your success probability drops by {abs(delta_prob):.1f} percentage points.")
    else:
        parts.append("Success probability is unchanged.")
    if delta_months < 0:
        parts.append(f"Timeline shortens by {abs(delta_months)} month(s) — a meaningful acceleration.")
    elif delta_months > 0:
        parts.append(f"Timeline extends by {delta_months} month(s).")
    if risk_change != "Unchanged":
        parts.append(f"Difficulty risk {risk_change.lower()}s to {modified['difficulty_risk']}.")
    if modified["missing_skills"]:
        parts.append(f"Still missing: {', '.join(modified['missing_skills'][:3])}.")
    return " ".join(parts)


def _recommend(delta_prob: float, delta_months: int, risk_change: str, modified: dict) -> str:
    if delta_prob >= 12:
        return (
            f"Highly recommended. This change significantly strengthens your "
            f"{modified['timeline_type'].lower()} viability."
        )
    if delta_prob <= -15:
        return (
            "Not recommended. This change materially reduces your success probability. "
            "Consider alternative adjustments first."
        )
    if delta_months <= -2 and delta_prob >= 0:
        return "Viable acceleration. Timeline compresses without sacrificing probability."
    if risk_change == "Increased" and delta_prob < 5:
        return "Proceed with caution — risk rises without meaningful probability gains."
    return "Moderate impact. Valid scenario with modest changes to your outlook."


# ── Public API ────────────────────────────────────────────────────────────────

def run_what_if(scenario: str, profile: StudentProfile, base_career_key: str) -> WhatIfResponse:
    start = time.time()

    baseline = score_path(base_career_key, profile)
    new_profile, human_desc = _parse_scenario(scenario, profile)

    # If the scenario changed the career, pick the new key
    if new_profile.target_careers != profile.target_careers and new_profile.target_careers:
        new_key = match_career(new_profile.target_careers[0]) or base_career_key
    else:
        new_key = base_career_key

    modified = score_path(new_key, new_profile)

    before = PathMetrics(
        success_probability=baseline["success_probability"],
        estimated_months=baseline["estimated_months"],
        difficulty_risk=baseline["difficulty_risk"],
        timeline_type=baseline["timeline_type"],
        career_alignment_score=baseline["career_alignment_score"],
    )
    after = PathMetrics(
        success_probability=modified["success_probability"],
        estimated_months=modified["estimated_months"],
        difficulty_risk=modified["difficulty_risk"],
        timeline_type=modified["timeline_type"],
        career_alignment_score=modified["career_alignment_score"],
    )

    delta_prob = round(modified["success_probability"] - baseline["success_probability"], 1)
    delta_months = modified["estimated_months"] - baseline["estimated_months"]

    _risk_order = {"Low": 0, "Medium": 1, "High": 2}
    r_diff = _risk_order.get(modified["difficulty_risk"], 1) - _risk_order.get(baseline["difficulty_risk"], 1)
    risk_change = "Increased" if r_diff > 0 else "Decreased" if r_diff < 0 else "Unchanged"

    return WhatIfResponse(
        scenario=scenario,
        explanation=_explain(human_desc, delta_prob, delta_months, risk_change, modified),
        before_metrics=before,
        after_metrics=after,
        delta_probability=delta_prob,
        delta_months=delta_months,
        risk_change=risk_change,
        recommendation=_recommend(delta_prob, delta_months, risk_change, modified),
        processing_time_ms=round((time.time() - start) * 1000, 2),
    )
