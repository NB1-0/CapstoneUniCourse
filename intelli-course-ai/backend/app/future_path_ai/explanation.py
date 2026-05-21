"""
Generates mentor-style natural-language explanations for career paths.
Template-based for reliability in mock mode; GPT-4o extension point included.
"""

from __future__ import annotations

from app.future_path_ai.schemas import StudentProfile
from app.future_path_ai.scoring import CAREER_PROFILES

_TIMELINE_DESCRIPTIONS = {
    "Conservative Path": "a well-paced, lower-risk route that plays to your existing strengths",
    "Balanced Path": "a balanced approach that optimises for both speed and quality",
    "Aggressive Path": "an accelerated route that requires significant weekly commitment",
    "Experimental Path": "an ambitious frontier path with meaningful skill gaps still to bridge",
}

_RISK_ADVICE = {
    "Low": "Your current skills and learning pace make this a very achievable goal.",
    "Medium": "You have solid foundations — focused effort on the missing skills is the key leverage point.",
    "High": "This is a stretch goal. Strengthen your prerequisites first and maintain consistent study hours.",
}

_MARKET_CONTEXT = {
    "GenAI Engineer": "Generative AI Engineers are among the most sought-after professionals globally right now (+340 % YoY demand).",
    "MLOps Engineer": "MLOps demand is growing at 120 % YoY as companies scale their ML infrastructure.",
    "ML Engineer": "ML Engineering remains one of the highest-paying and fastest-growing technical roles.",
    "Data Scientist": "Data Science continues to evolve — hybrid roles that blend LLMs with traditional analytics are surging.",
    "Data Engineer": "Data Engineering underpins every analytics and AI system; demand grew 42 % last year.",
    "Software Engineer": "Software Engineering is the foundation role with the widest job market and clearest entry path.",
    "Cloud Architect": "Cloud Architecture commands top salaries ($130k–$195k) as enterprises accelerate cloud migrations.",
}


def build_explanation(career_key: str, scores: dict, profile: StudentProfile) -> str:
    """Return a 3-5 sentence mentor-style explanation for the path."""
    cp = CAREER_PROFILES.get(career_key, {})
    timeline_desc = _TIMELINE_DESCRIPTIONS.get(scores["timeline_type"], "a structured path")
    risk_advice = _RISK_ADVICE.get(scores["difficulty_risk"], "")
    market_context = _MARKET_CONTEXT.get(career_key, f"{career_key} is a strong career choice.")

    missing = scores["missing_skills"]
    success = scores["success_probability"]
    months = scores["estimated_months"]
    readiness = scores["readiness_score"]

    # Format missing skills
    if not missing:
        gap_sentence = "You already cover all required skills — you are essentially ready to start applying."
    elif len(missing) <= 2:
        gap_sentence = f"Your only gaps are {' and '.join(missing[:2])}, which are addressable in a few focused weeks."
    else:
        top3 = ", ".join(missing[:3])
        extra = f" (and {len(missing) - 3} others)" if len(missing) > 3 else ""
        gap_sentence = f"Your primary skill gaps are: {top3}{extra}."

    readiness_label = (
        "You are well-positioned" if readiness >= 70
        else "You have a solid starting point" if readiness >= 45
        else "This will require building from the ground up"
    )

    return (
        f"Based on your profile, the {career_key} path follows {timeline_desc} "
        f"with an estimated {months}-month timeline and a {success:.0f}% success probability. "
        f"{readiness_label} — your current skill coverage is {readiness:.0f}%. "
        f"{gap_sentence} "
        f"{risk_advice} "
        f"{market_context}"
    ).strip()
