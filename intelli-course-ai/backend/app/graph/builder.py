"""
GraphBuilder — populates the knowledge graph from indexed course objects.

Builds nodes and relationships from three sources:
  1. The indexed Course objects (Course → Skill TEACHES, Course → Domain BELONGS_TO)
  2. The static schema maps (Skill → Skill ADVANCES_TO / RELATED_TO)
  3. The career skills map (Career → Skill REQUIRES)
"""

import structlog

from app.graph.in_memory import InMemoryGraph
from app.graph.schema import (
    SKILL_DOMAINS,
    SKILL_PROGRESSIONS,
    RELATED_SKILLS,
    CAREER_SKILLS,
    DIFFICULTY_ORDER,
)
from app.models.course import Course

logger = structlog.get_logger()


def _skill_id(name: str) -> str:
    return f"skill:{name.lower()}"


def _course_id(course: Course) -> str:
    return f"course:{course.id}"


def _career_id(title: str) -> str:
    return f"career:{title.lower().replace(' ', '_')}"


def _domain_id(name: str) -> str:
    return f"domain:{name.lower().replace(' ', '_').replace('&', 'and')}"


def _level_id(level: str) -> str:
    return f"level:{level.lower()}"


def build_graph(courses: list[Course]) -> InMemoryGraph:
    """
    Build and return a fully populated InMemoryGraph from a list of courses.
    Idempotent — safe to call multiple times (graph is cleared first).
    """
    g = InMemoryGraph()

    # ── LearningLevel nodes ───────────────────────────────────────────────
    for level in ("Beginner", "Intermediate", "Advanced", "Mixed"):
        g.add_node(
            _level_id(level),
            "LearningLevel",
            {"name": level, "order": DIFFICULTY_ORDER.get(level, 1)},
        )

    # ── Domain nodes ──────────────────────────────────────────────────────
    domains: set[str] = set(SKILL_DOMAINS.values())
    for domain in domains:
        g.add_node(_domain_id(domain), "Domain", {"name": domain})

    # ── Skill nodes + Skill → Domain BELONGS_TO ───────────────────────────
    all_skills: set[str] = set()
    # Gather from courses
    for course in courses:
        all_skills.update(course.skills)
    # Gather from schema maps
    for skill in SKILL_DOMAINS:
        all_skills.add(skill)
    for a, b in SKILL_PROGRESSIONS + RELATED_SKILLS:
        all_skills.update([a, b])
    for skills in CAREER_SKILLS.values():
        all_skills.update(skills)

    for skill_name in all_skills:
        sid = _skill_id(skill_name)
        domain = SKILL_DOMAINS.get(skill_name, "General")
        g.add_node(sid, "Skill", {"name": skill_name, "domain": domain})
        did = _domain_id(domain)
        if did not in g._nodes:
            g.add_node(did, "Domain", {"name": domain})
        g.add_edge(sid, did, "BELONGS_TO")

    # ── Course nodes + TEACHES + BELONGS_TO (level) ───────────────────────
    for course in courses:
        cid = _course_id(course)
        g.add_node(
            cid,
            "Course",
            {
                "id": course.id,
                "name": course.course_name,
                "organization": course.organization,
                "difficulty": course.difficulty_level,
                "rating": course.rating,
                "url": course.course_url,
                "certificate_type": getattr(course, "certificate_type", ""),
                "students_enrolled": getattr(course, "students_enrolled", 0),
            },
        )
        # Course → LearningLevel
        g.add_edge(cid, _level_id(course.difficulty_level), "BELONGS_TO")

        for skill_name in course.skills:
            sid = _skill_id(skill_name)
            # Course TEACHES Skill
            g.add_edge(cid, sid, "TEACHES")
        for prereq in getattr(course, "prerequisites", []):
            sid = _skill_id(prereq)
            if sid in g._nodes:
                # Course REQUIRES Skill
                g.add_edge(cid, sid, "REQUIRES")

    # ── Skill progression (ADVANCES_TO) ──────────────────────────────────
    for from_skill, to_skill in SKILL_PROGRESSIONS:
        fid, tid = _skill_id(from_skill), _skill_id(to_skill)
        if fid in g._nodes and tid in g._nodes:
            g.add_edge(fid, tid, "ADVANCES_TO")

    # ── Related skills (RELATED_TO, bidirectional) ────────────────────────
    for a, b in RELATED_SKILLS:
        aid, bid = _skill_id(a), _skill_id(b)
        if aid in g._nodes and bid in g._nodes:
            g.add_edge(aid, bid, "RELATED_TO")
            g.add_edge(bid, aid, "RELATED_TO")

    # ── Career nodes + REQUIRES ───────────────────────────────────────────
    for career_title, skills in CAREER_SKILLS.items():
        caid = _career_id(career_title)
        g.add_node(caid, "Career", {"title": career_title})
        for skill_name in skills:
            sid = _skill_id(skill_name)
            if sid in g._nodes:
                g.add_edge(caid, sid, "REQUIRES")

    # ── Inter-skill LEADS_TO (course-derived prerequisite chains) ─────────
    # If course A teaches skill X and requires skill Y → Y LEADS_TO X
    for course in courses:
        for prereq in getattr(course, "prerequisites", []):
            for taught_skill in course.skills:
                pid = _skill_id(prereq)
                tid = _skill_id(taught_skill)
                if pid in g._nodes and tid in g._nodes and pid != tid:
                    g.add_edge(pid, tid, "LEADS_TO")

    stats = g.stats()
    logger.info(
        "Knowledge graph built",
        nodes=stats["total_nodes"],
        edges=stats["total_edges"],
        courses=len(courses),
    )
    return g
