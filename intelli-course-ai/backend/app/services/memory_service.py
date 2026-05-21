"""
MemoryService — persistent, personalized RAG memory.

Architecture:
  - Primary store: in-process dict (fast, no deps)
  - Optional Redis persistence: serialise profile on write, deserialise on read
  - Profile updated on every search, save, skill/career signal
  - Personalization: post-hoc re-ranking of hybrid search results

Personalization scoring (additive boosts, capped at +0.25):
  • Each matching inferred skill in course skills    → +0.04  (max 5 skills = +0.20)
  • Career goal keyword in course name / description → +0.08
  • Level preference matches difficulty              → +0.06
  • Course topic matches recent search history       → +0.03  (max 2 = +0.06)
  • Penalise already-saved courses (novelty)         → -0.04

The `why_recommended` field is overwritten to surface the memory reason.
"""

from __future__ import annotations

import re
from datetime import datetime, UTC
from typing import Optional

import structlog

from app.models.memory import MemoryEntry, UserProfile
from app.schemas.response import CourseResult
from app.ingestion.text_cleaner import extract_skills_from_text

logger = structlog.get_logger()

# ── Singleton store ───────────────────────────────────────────────────────────

_profiles: dict[str, UserProfile] = {}

# Weight increments per interaction type
_SKILL_WEIGHTS = {
    "search":  1,
    "view":    1,
    "save":    3,     # saving is a strong signal
    "skill":   4,     # explicit skill input (from skill-gap form)
    "career":  1,
    "level":   1,
    "path":    2,     # learning path goal input
}

# Boost constants
_SKILL_BOOST   = 0.045
_CAREER_BOOST  = 0.08
_LEVEL_BOOST   = 0.06
_TOPIC_BOOST   = 0.03
_NOVELTY_PEN   = 0.05
_MAX_BOOST     = 0.25


# ── Public API ────────────────────────────────────────────────────────────────

def get_profile(user_id: str) -> UserProfile:
    if user_id not in _profiles:
        _profiles[user_id] = UserProfile(user_id=user_id)
    return _profiles[user_id]


def all_user_ids() -> list[str]:
    return list(_profiles.keys())


# ── Recording interactions ────────────────────────────────────────────────────

def record_search(user_id: str, query: str, results: list[CourseResult]) -> None:
    """Record a search query and infer skills/topics from it."""
    p = get_profile(user_id)
    p.entries.append(MemoryEntry(type="search", content=query))
    p.total_interactions += 1
    p.last_active = datetime.now(UTC)

    # Infer skills from query text
    skills = extract_skills_from_text(query)
    for s in skills:
        p.skill_counts[s] += _SKILL_WEIGHTS["search"]

    # Infer topics from top result names
    for r in results[:3]:
        words = _extract_topic_words(r.course_name)
        for w in words:
            p.topic_counts[w] += 1


def record_interaction(
    user_id: str,
    course_id: str,
    course_name: str,
    skills: list[str],
    action: str,   # 'save' | 'view'
) -> None:
    """Record a course interaction and update skill/topic weights."""
    p = get_profile(user_id)
    p.entries.append(MemoryEntry(
        type=action,
        content=course_name,
        meta={"course_id": course_id},
    ))
    p.total_interactions += 1
    p.last_active = datetime.now(UTC)

    w = _SKILL_WEIGHTS.get(action, 1)
    for s in skills:
        p.skill_counts[s] += w
    for word in _extract_topic_words(course_name):
        p.topic_counts[word] += w


def record_skills(user_id: str, skills: list[str]) -> None:
    """Explicit skill signal from a form input (skill-gap, career, etc.)."""
    p = get_profile(user_id)
    for s in skills:
        if s.strip():
            p.entries.append(MemoryEntry(type="skill", content=s.strip()))
            p.skill_counts[s.strip()] += _SKILL_WEIGHTS["skill"]
    p.total_interactions += len(skills)
    p.last_active = datetime.now(UTC)


def record_career(user_id: str, career: str) -> None:
    """Record or update the user's career goal."""
    p = get_profile(user_id)
    p.inferred_career = career
    p.entries.append(MemoryEntry(type="career", content=career))
    p.total_interactions += 1
    p.last_active = datetime.now(UTC)
    # Treat career as skill signal too
    for word in career.split():
        if len(word) > 3:
            p.skill_counts[word.title()] += _SKILL_WEIGHTS["career"]


def record_level(user_id: str, level: str) -> None:
    """Record inferred or explicit experience level."""
    p = get_profile(user_id)
    p.inferred_level = level
    p.entries.append(MemoryEntry(type="level", content=level))
    p.total_interactions += 1
    p.last_active = datetime.now(UTC)


def clear_memory(user_id: str) -> None:
    if user_id in _profiles:
        del _profiles[user_id]


def remove_entry(user_id: str, index: int) -> bool:
    """Remove a specific entry by position from the last 30."""
    p = _profiles.get(user_id)
    if not p:
        return False
    entries = list(p.entries)
    # index refers to the last-30 slice shown in the UI
    visible = entries[-30:]
    if index >= len(visible):
        return False
    target = visible[index]
    # Remove from deque
    try:
        entries.remove(target)
        p.entries.clear()
        p.entries.extend(entries)
        return True
    except ValueError:
        return False


# ── Personalization ───────────────────────────────────────────────────────────

def personalize_results(
    user_id: str,
    results: list[CourseResult],
    query: str,
) -> list[CourseResult]:
    """
    Re-rank results using the user's memory profile.
    Returns a new sorted list; original objects are mutated in place (scores + why).
    """
    p = _profiles.get(user_id)
    if not p or p.total_interactions == 0:
        return results

    inferred_skills_lower = {s.lower() for s in p.inferred_skills}
    saved_names_lower     = {s.lower() for s in p.recent_saves}
    recent_topics         = set(p.top_topics)
    career                = (p.inferred_career or "").lower()
    level                 = p.inferred_level or ""

    for r in results:
        boost = 0.0
        reasons: list[str] = []

        # ── Skill overlap boost ────────────────────────────────────────────
        course_skills_lower = {s.lower() for s in r.skills}
        matching = course_skills_lower & inferred_skills_lower
        if matching:
            skill_boost = min(len(matching) * _SKILL_BOOST, _SKILL_BOOST * 5)
            boost += skill_boost
            top = sorted(matching, key=lambda s: p.skill_counts.get(s.title(), 0), reverse=True)
            reasons.append(f"Matches your interest in {', '.join(s.title() for s in list(top)[:2])}")

        # ── Career goal boost ──────────────────────────────────────────────
        if career:
            haystack = (r.course_name + " " + r.description).lower()
            if career in haystack or any(w in haystack for w in career.split() if len(w) > 4):
                boost += _CAREER_BOOST
                reasons.append(f"Relevant to your {p.inferred_career} goal")

        # ── Level preference boost ─────────────────────────────────────────
        if level and r.difficulty_level and level.lower() == r.difficulty_level.lower():
            boost += _LEVEL_BOOST
            reasons.append(f"Matches your {level} level")

        # ── Topic recency boost ────────────────────────────────────────────
        course_words = set(_extract_topic_words(r.course_name))
        topic_matches = course_words & recent_topics
        if topic_matches:
            t_boost = min(len(topic_matches) * _TOPIC_BOOST, _TOPIC_BOOST * 2)
            boost += t_boost
            reasons.append("Aligns with your recent activity")

        # ── Novelty penalty — don't keep showing already-saved courses ─────
        if r.course_name.lower() in saved_names_lower:
            boost -= _NOVELTY_PEN

        # Apply (cap at +MAX_BOOST so semantic relevance still dominates)
        if boost != 0:
            r.relevance_score = round(min(1.0, max(0.0, r.relevance_score + min(boost, _MAX_BOOST))), 4)
            if reasons and not r.why_recommended.startswith("Based on your"):
                r.why_recommended = f"Based on your history — {reasons[0].lower()}. " + r.why_recommended

    # Re-sort after boosting
    results.sort(key=lambda r: r.relevance_score, reverse=True)
    return results


def build_memory_context_string(user_id: str) -> str:
    """Plain-text memory summary for injection into LLM prompts."""
    p = _profiles.get(user_id)
    if not p:
        return ""
    return p.build_context_string()


# ── Helpers ───────────────────────────────────────────────────────────────────

_STOP_WORDS = {
    "the", "and", "for", "with", "using", "from", "into", "about",
    "course", "learn", "learning", "complete", "guide", "introduction",
    "beginner", "intermediate", "advanced", "professional", "certificate",
    "specialization", "program", "series",
}


def _extract_topic_words(text: str) -> list[str]:
    words = re.findall(r"[a-zA-Z]{4,}", text.lower())
    return [w for w in words if w not in _STOP_WORDS]
