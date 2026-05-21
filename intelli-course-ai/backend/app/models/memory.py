"""
User memory models for persistent, personalized RAG.

Stores interaction history that drives personalization:
  - Searches made
  - Courses saved / viewed
  - Skills and careers expressed across all forms
  - Inferred profile (level, career, top skills)
"""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, UTC
from typing import Deque


# ── Individual memory entry ──────────────────────────────────────────────────

@dataclass
class MemoryEntry:
    type: str          # 'search' | 'save' | 'view' | 'skill' | 'career' | 'level'
    content: str       # human-readable value
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))
    weight: float = 1.0
    meta: dict = field(default_factory=dict)

    def age_days(self) -> float:
        return (datetime.now(UTC) - self.timestamp).total_seconds() / 86400


# ── Aggregated user profile ──────────────────────────────────────────────────

@dataclass
class UserProfile:
    user_id: str
    entries: Deque[MemoryEntry] = field(default_factory=lambda: deque(maxlen=120))

    # Frequency counters — updated incrementally on every interaction
    skill_counts: Counter = field(default_factory=Counter)
    topic_counts: Counter = field(default_factory=Counter)

    # Inferred stable preferences
    inferred_career: str | None = None
    inferred_level: str | None = None   # Beginner / Intermediate / Advanced

    total_interactions: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    last_active: datetime = field(default_factory=lambda: datetime.now(UTC))

    # ── Derived properties ────────────────────────────────────────────────────

    @property
    def inferred_skills(self) -> list[str]:
        """Top skills by accumulated frequency weight."""
        return [skill for skill, _ in self.skill_counts.most_common(10)]

    @property
    def top_topics(self) -> list[str]:
        return [t for t, _ in self.topic_counts.most_common(6)]

    @property
    def recent_searches(self) -> list[str]:
        return [
            e.content for e in reversed(self.entries)
            if e.type == "search"
        ][:8]

    @property
    def recent_saves(self) -> list[str]:
        return [
            e.content for e in reversed(self.entries)
            if e.type == "save"
        ][:6]

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "inferred_skills": self.inferred_skills,
            "inferred_career": self.inferred_career,
            "inferred_level": self.inferred_level,
            "top_topics": self.top_topics,
            "recent_searches": self.recent_searches,
            "recent_saves": self.recent_saves,
            "total_interactions": self.total_interactions,
            "last_active": self.last_active.isoformat(),
            "created_at": self.created_at.isoformat(),
            "entries": [
                {
                    "type": e.type,
                    "content": e.content,
                    "timestamp": e.timestamp.isoformat(),
                    "meta": e.meta,
                }
                for e in list(self.entries)[-30:]   # return last 30 for UI
            ],
        }

    def build_context_string(self) -> str:
        """Rich text context injected into LLM prompts."""
        parts: list[str] = []
        if self.inferred_skills:
            parts.append(f"User's known skills: {', '.join(self.inferred_skills[:8])}")
        if self.inferred_career:
            parts.append(f"Career goal: {self.inferred_career}")
        if self.inferred_level:
            parts.append(f"Experience level: {self.inferred_level}")
        if self.recent_searches:
            parts.append(f"Recent searches: {', '.join(self.recent_searches[:5])}")
        if self.recent_saves:
            parts.append(f"Saved courses: {', '.join(self.recent_saves[:4])}")
        return "\n".join(parts)
