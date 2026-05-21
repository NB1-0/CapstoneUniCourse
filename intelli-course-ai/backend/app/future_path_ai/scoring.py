"""
Career Path Scoring Engine.

Transparent, weighted formula:

  success_probability =
    0.25 * prerequisite_score      — do they have required foundations?
    0.20 * skill_match_score       — required skills already covered?
    0.15 * learning_capacity_score — weekly hours vs path complexity
    0.15 * difficulty_fit_score    — preferred difficulty vs path difficulty
    0.15 * career_alignment_score  — target career matches this career?
    0.10 * market_relevance_score  — how hot is this career right now?

All sub-scores are 0–100; result is also 0–100.
"""

from __future__ import annotations

import re

from app.future_path_ai.schemas import StudentProfile

# ── Career profiles ───────────────────────────────────────────────────────────
# Each profile drives the scoring and roadmap generation.

CAREER_PROFILES: dict[str, dict] = {
    "ML Engineer": {
        "aliases": ["machine learning engineer", "ml engineer", "machine learning"],
        "required_skills": ["Python", "Machine Learning", "Deep Learning", "Statistics", "TensorFlow", "PyTorch"],
        "nice_to_have": ["MLOps", "Docker", "Kubernetes", "Spark", "AWS"],
        "prerequisites": ["Python", "Statistics", "Linear Algebra"],
        "complexity": 0.75,
        "market_demand": 87.0,
        "base_months": 10,
        "description": "Build and deploy production machine learning systems.",
    },
    "Data Scientist": {
        "aliases": ["data scientist", "data science"],
        "required_skills": ["Python", "Statistics", "Machine Learning", "SQL", "Data Visualization"],
        "nice_to_have": ["R", "Spark", "Deep Learning", "A/B Testing", "Tableau"],
        "prerequisites": ["Python", "SQL", "Mathematics"],
        "complexity": 0.60,
        "market_demand": 82.0,
        "base_months": 7,
        "description": "Extract insights and build predictive models from data.",
    },
    "GenAI Engineer": {
        "aliases": ["generative ai engineer", "genai engineer", "ai engineer", "generative ai", "llm engineer"],
        "required_skills": ["Python", "LangChain", "RAG", "Vector Databases", "Prompt Engineering", "LLMOps"],
        "nice_to_have": ["LangGraph", "Fine-tuning", "Multimodal AI", "Docker", "FastAPI"],
        "prerequisites": ["Python", "Machine Learning", "APIs"],
        "complexity": 0.85,
        "market_demand": 98.0,
        "base_months": 12,
        "description": "Design and deploy LLM-powered production applications.",
    },
    "Data Engineer": {
        "aliases": ["data engineer", "analytics engineer", "etl engineer"],
        "required_skills": ["Python", "SQL", "Apache Spark", "Apache Kafka", "Data Pipelines", "dbt"],
        "nice_to_have": ["Airflow", "Flink", "Terraform", "AWS", "Snowflake"],
        "prerequisites": ["Python", "SQL", "Databases"],
        "complexity": 0.65,
        "market_demand": 85.0,
        "base_months": 8,
        "description": "Build and maintain data pipelines that power analytics and AI.",
    },
    "MLOps Engineer": {
        "aliases": ["mlops engineer", "ml platform engineer", "ml infrastructure"],
        "required_skills": ["Python", "MLOps", "Docker", "Kubernetes", "CI/CD", "Monitoring"],
        "nice_to_have": ["Terraform", "MLflow", "Ray", "Prometheus", "AWS", "Feast"],
        "prerequisites": ["Python", "Docker", "Linux", "Git"],
        "complexity": 0.80,
        "market_demand": 89.0,
        "base_months": 11,
        "description": "Build infrastructure that trains, serves, and monitors ML models at scale.",
    },
    "Software Engineer": {
        "aliases": ["software engineer", "backend engineer", "full stack", "developer", "software developer", "backend developer"],
        "required_skills": ["Python", "Algorithms", "Data Structures", "REST APIs", "Databases", "Git"],
        "nice_to_have": ["TypeScript", "React", "Docker", "Cloud", "Testing", "CI/CD"],
        "prerequisites": ["Programming Fundamentals", "Computer Science Basics"],
        "complexity": 0.55,
        "market_demand": 80.0,
        "base_months": 6,
        "description": "Design and build scalable software systems end-to-end.",
    },
    "Cloud Architect": {
        "aliases": ["cloud architect", "solutions architect", "cloud engineer", "aws architect"],
        "required_skills": ["Cloud Architecture", "AWS", "Terraform", "Kubernetes", "Networking", "Security"],
        "nice_to_have": ["FinOps", "Serverless", "Multi-cloud", "IaC", "GCP", "Azure"],
        "prerequisites": ["Linux", "Networking", "Programming", "Databases"],
        "complexity": 0.78,
        "market_demand": 84.0,
        "base_months": 14,
        "description": "Define and govern cloud strategy and infrastructure at enterprise scale.",
    },
}

# ── Learning pace multipliers ─────────────────────────────────────────────────

_PACE_MULTIPLIERS = {
    "Slow": 1.40,
    "Moderate": 1.00,
    "Fast": 0.72,
    "Accelerated": 0.52,
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _skill_match(required: str, current_lower: set[str]) -> bool:
    """Case-insensitive, partial-match skill comparison (handles 'TensorFlow / PyTorch')."""
    req_lower = required.lower().strip()
    if req_lower in current_lower:
        return True
    if any(req_lower in c or c in req_lower for c in current_lower if len(c) > 2):
        return True
    # Handle slash-separated alternatives
    parts = [p.strip() for p in re.split(r"[/,]", req_lower) if len(p.strip()) > 2]
    return any(
        any(p in c or c in p for c in current_lower)
        for p in parts
    )


def _hours_to_capacity(hours: float) -> float:
    """Weekly hours → capacity score 0–100."""
    if hours <= 5:
        return 25.0
    if hours <= 10:
        return 25 + (hours - 5) * 5.0        # 25–50
    if hours <= 20:
        return 50 + (hours - 10) * 2.5       # 50–75
    if hours <= 30:
        return 75 + (hours - 20) * 1.5       # 75–90
    return min(100.0, 90 + (hours - 30) * 0.5)


def match_career(target: str) -> str | None:
    """Return the canonical career key, or None if unrecognised."""
    target_lower = target.lower().strip()
    # Exact key match
    for key in CAREER_PROFILES:
        if target_lower == key.lower():
            return key
    # Alias exact match
    for key, profile in CAREER_PROFILES.items():
        if target_lower in profile["aliases"]:
            return key
    # Partial alias match
    for key, profile in CAREER_PROFILES.items():
        if any(a in target_lower or target_lower in a for a in profile["aliases"]):
            return key
    return None


# ── Main scoring function ─────────────────────────────────────────────────────

def score_path(career_key: str, profile: StudentProfile) -> dict:
    """Return the full scoring breakdown dict for one career path."""
    cp = CAREER_PROFILES[career_key]
    current_lower = {s.lower().strip() for s in profile.current_skills}

    # 1. Prerequisite coverage
    prereqs = cp["prerequisites"]
    prereq_hits = sum(1 for p in prereqs if _skill_match(p, current_lower))
    prereq_score = (prereq_hits / len(prereqs) * 100) if prereqs else 100.0

    # 2. Required-skill match
    required = cp["required_skills"]
    skill_hits = sum(1 for r in required if _skill_match(r, current_lower))
    skill_match_score = (skill_hits / len(required) * 100) if required else 100.0

    # 3. Learning capacity
    capacity_raw = _hours_to_capacity(profile.weekly_learning_hours)
    complexity_penalty = max(0.0, (cp["complexity"] - 0.5) * 30) if profile.weekly_learning_hours < 10 else 0.0
    learning_capacity_score = max(0.0, capacity_raw - complexity_penalty)

    # 4. Difficulty fit — how well preferred_difficulty aligns with path complexity
    diff_map = {"Beginner": 0.30, "Intermediate": 0.60, "Advanced": 0.90}
    pref = diff_map.get(profile.preferred_difficulty, 0.60)
    diff_distance = abs(pref - cp["complexity"])
    difficulty_fit_score = max(0.0, 100.0 - diff_distance * 120)

    # 5. Career alignment — does this career appear in target_careers?
    target_lower_set = {t.lower() for t in profile.target_careers}
    exact = any(
        career_key.lower() in t or t in career_key.lower()
        or any(a in t for a in cp["aliases"])
        for t in target_lower_set
    )
    career_alignment_score = 100.0 if exact else 58.0

    # 6. Market relevance
    market_relevance_score = cp["market_demand"]

    # Weighted composite
    success_prob = round(
        0.25 * prereq_score
        + 0.20 * skill_match_score
        + 0.15 * learning_capacity_score
        + 0.15 * difficulty_fit_score
        + 0.15 * career_alignment_score
        + 0.10 * market_relevance_score,
        1,
    )
    success_prob = max(5.0, min(98.0, success_prob))

    # Readiness = average prerequisite + skill coverage
    readiness_score = round((prereq_score + skill_match_score) / 2, 1)

    # Missing skills (required not yet covered)
    missing = [r for r in required if not _skill_match(r, current_lower)]

    # Estimated months adjusted for skill coverage and pace
    skill_coverage = skill_match_score / 100.0
    months_raw = cp["base_months"] * (1.0 - skill_coverage * 0.55)
    pace_mult = _PACE_MULTIPLIERS.get(profile.learning_pace, 1.0)
    estimated_months = max(1, round(months_raw * pace_mult))

    # Timeline type
    if success_prob >= 80:
        timeline_type = "Conservative Path"
    elif success_prob >= 65:
        timeline_type = "Balanced Path"
    elif success_prob >= 48:
        timeline_type = "Aggressive Path"
    else:
        timeline_type = "Experimental Path"

    # Difficulty risk
    high_complexity = cp["complexity"] >= 0.80
    low_hours = profile.weekly_learning_hours < 10
    if high_complexity and low_hours:
        difficulty_risk = "High"
    elif cp["complexity"] >= 0.65 or low_hours:
        difficulty_risk = "Medium"
    else:
        difficulty_risk = "Low"

    return {
        "success_probability": success_prob,
        "readiness_score": readiness_score,
        "estimated_months": estimated_months,
        "timeline_type": timeline_type,
        "difficulty_risk": difficulty_risk,
        "career_alignment_score": career_alignment_score,
        "missing_skills": missing,
        "score_breakdown": {
            "prerequisite_score": round(prereq_score, 1),
            "skill_match_score": round(skill_match_score, 1),
            "learning_capacity_score": round(learning_capacity_score, 1),
            "difficulty_fit_score": round(difficulty_fit_score, 1),
            "career_alignment_score": round(career_alignment_score, 1),
            "market_relevance_score": round(market_relevance_score, 1),
        },
    }
