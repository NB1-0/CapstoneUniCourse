"""
GraphService — the single production-ready service layer for all graph operations.

Wraps InMemoryGraph (always available) and Neo4j (optional).
All graph features degrade gracefully when Neo4j is offline.
"""

import time
from typing import Optional

import structlog

from app.graph.in_memory import InMemoryGraph
from app.graph.builder import build_graph, _skill_id, _career_id
from app.graph.schema import CAREER_SKILLS, DIFFICULTY_ORDER
from app.models.course import Course
from app.schemas.graph import (
    SkillStep,
    CareerSkillGap,
    GraphCourseResult,
)

logger = structlog.get_logger()

_graph: Optional[InMemoryGraph] = None


def get_graph() -> InMemoryGraph:
    global _graph
    if _graph is None:
        _graph = InMemoryGraph()
    return _graph


async def build_knowledge_graph(courses: list[Course]) -> None:
    """Called at startup after courses are loaded into the search service."""
    global _graph
    _graph = build_graph(courses)
    logger.info("Knowledge graph ready", **_graph.stats())


def _course_node_to_result(node, score: float = 0.5, graph_score: float = 0.0) -> GraphCourseResult:
    p = node.properties
    return GraphCourseResult(
        id=p.get("id", node.id),
        course_name=p.get("name", ""),
        organization=p.get("organization", ""),
        difficulty_level=p.get("difficulty", "Mixed"),
        rating=p.get("rating", 4.0),
        skills=[],
        course_url=p.get("url", ""),
        relevance_score=round(score, 4),
        graph_score=round(graph_score, 4),
        hybrid_score=round(min(1.0, (score * 0.6 + graph_score * 0.4)), 4),
        students_enrolled=p.get("students_enrolled", 0),
    )


# ── Graph-based Recommendations ───────────────────────────────────────────────

def get_graph_recommendations(
    current_skills: list[str],
    target_skills: list[str],
    top_k: int = 10,
) -> list[GraphCourseResult]:
    """
    Score courses by graph coverage of target skills.
    Courses that TEACH target skills or teach skills adjacent to them rank highest.
    """
    g = get_graph()
    if not g._nodes:
        return []

    # Collect all course nodes
    course_nodes = g.nodes_by_type("Course")
    scores: list[tuple[object, float]] = []

    current_lower = {s.lower() for s in current_skills}
    target_set = list(target_skills) if target_skills else current_skills

    for node in course_nodes:
        graph_score = g.score_course_for_skills(node.id, target_set)
        # Downrank courses that only teach things the user already knows
        taught_skills = {
            nbr.properties["name"].lower()
            for nbr, rel in g.out_neighbours(node.id, ["TEACHES"])
        }
        already_known = len(taught_skills & current_lower)
        novelty_penalty = already_known / (len(taught_skills) + 1)
        final_score = graph_score * (1 - 0.3 * novelty_penalty)

        if final_score > 0:
            scores.append((node, final_score))

    scores.sort(key=lambda x: (x[1], x[0].properties.get("rating", 0)), reverse=True)

    results = []
    for node, score in scores[:top_k]:
        r = _course_node_to_result(node, score=score, graph_score=score)
        # Attach skills from graph
        r.skills = [
            nbr.properties["name"]
            for nbr, _ in g.out_neighbours(node.id, ["TEACHES"])
        ][:8]
        results.append(r)
    return results


# ── Skill Path ─────────────────────────────────────────────────────────────────

def find_skill_path(from_skill: str, to_skill: str, max_depth: int = 8) -> list[SkillStep]:
    """
    BFS path from from_skill → to_skill following ADVANCES_TO / LEADS_TO edges.
    Each step includes the top courses to learn that skill.
    """
    g = get_graph()
    path_nodes = g.bfs_path(
        _skill_id(from_skill),
        _skill_id(to_skill),
        rel_types=["ADVANCES_TO", "LEADS_TO"],
        max_depth=max_depth,
    )

    if not path_nodes:
        # Try with RELATED_TO as well
        path_nodes = g.bfs_path(
            _skill_id(from_skill),
            _skill_id(to_skill),
            rel_types=["ADVANCES_TO", "LEADS_TO", "RELATED_TO"],
            max_depth=max_depth,
        )

    steps: list[SkillStep] = []
    for depth, (node, rel_type) in enumerate(path_nodes):
        if node.type != "Skill":
            continue
        skill_name = node.properties.get("name", node.label())
        courses = g.courses_teaching_skill(skill_name)[:3]
        steps.append(SkillStep(
            skill=skill_name,
            rel_type=rel_type,
            depth=depth,
            courses=[
                {
                    "id": c.properties.get("id", ""),
                    "course_name": c.properties.get("name", ""),
                    "organization": c.properties.get("organization", ""),
                    "difficulty_level": c.properties.get("difficulty", ""),
                    "rating": c.properties.get("rating", 0.0),
                    "course_url": c.properties.get("url", ""),
                }
                for c in courses
            ],
            estimated_weeks=_weeks_for_skill(skill_name),
        ))

    return steps


def _weeks_for_skill(skill: str) -> int:
    """Rough estimate of weeks to learn a skill based on its difficulty."""
    advanced = {"Deep Learning", "Machine Learning", "NLP", "Computer Vision",
                "MLOps", "Data Engineering", "Kubernetes", "Blockchain"}
    intermediate = {"Python", "SQL", "React", "Docker", "AWS", "TensorFlow",
                    "Data Science", "Statistics"}
    if skill in advanced:
        return 8
    if skill in intermediate:
        return 5
    return 3


# ── Career Path ────────────────────────────────────────────────────────────────

def get_career_path(
    career_goal: str,
    current_skills: list[str],
    max_courses_per_skill: int = 2,
) -> dict:
    """
    Full career analysis: required skills, gap, ordered course sequence,
    and a mini graph for visualisation.
    """
    g = get_graph()

    required_skills = CAREER_SKILLS.get(career_goal, [])
    if not required_skills:
        # Try fuzzy match
        for title in CAREER_SKILLS:
            if career_goal.lower() in title.lower() or title.lower() in career_goal.lower():
                required_skills = CAREER_SKILLS[title]
                career_goal = title
                break

    current_lower = {s.lower() for s in current_skills}
    missing = [s for s in required_skills if s.lower() not in current_lower]
    have = [s for s in required_skills if s.lower() in current_lower]
    readiness = round(len(have) / max(len(required_skills), 1) * 100, 1)

    # Build skill gaps with top courses per missing skill
    skill_gaps: list[CareerSkillGap] = []
    all_recommended: list[tuple[object, int, str]] = []  # (course_node, priority, skill)

    for i, skill in enumerate(required_skills):
        already_have = skill.lower() in current_lower
        courses = g.courses_teaching_skill(skill)[:max_courses_per_skill]
        skill_gaps.append(CareerSkillGap(
            skill=skill,
            have=already_have,
            importance="critical" if i < 3 else "important" if i < 6 else "nice-to-have",
            courses=[
                {
                    "id": c.properties.get("id", ""),
                    "course_name": c.properties.get("name", ""),
                    "organization": c.properties.get("organization", ""),
                    "difficulty_level": c.properties.get("difficulty", ""),
                    "rating": c.properties.get("rating", 0.0),
                }
                for c in courses
            ],
        ))
        if not already_have:
            for c in courses:
                all_recommended.append((c, i, skill))

    # Deduplicate and order by difficulty (beginner first)
    seen_ids: set[str] = set()
    sequence: list[GraphCourseResult] = []
    for node, priority, skill in sorted(
        all_recommended,
        key=lambda x: (
            DIFFICULTY_ORDER.get(x[0].properties.get("difficulty", "Mixed"), 1),
            x[1],
            -x[0].properties.get("rating", 0),
        ),
    ):
        nid = node.properties.get("id", node.id)
        if nid in seen_ids:
            continue
        seen_ids.add(nid)
        r = _course_node_to_result(node, score=0.85, graph_score=0.9)
        r.skills = [
            nbr.properties["name"]
            for nbr, _ in g.out_neighbours(node.id, ["TEACHES"])
        ][:6]
        r.why_recommended = f"Teaches {skill}, required for {career_goal}."
        sequence.append(r)

    # Mini graph data (career + its required skills + courses for each)
    mini_nodes: list[dict] = []
    mini_edges: list[dict] = []
    career_node_id = _career_id(career_goal)
    mini_nodes.append({"id": career_node_id, "label": career_goal, "type": "Career", "properties": {}})

    for skill in required_skills[:10]:
        sid = _skill_id(skill)
        mini_nodes.append({"id": sid, "label": skill, "type": "Skill", "properties": {"have": skill.lower() in current_lower}})
        mini_edges.append({"source": career_node_id, "target": sid, "type": "REQUIRES"})
        for c in g.courses_teaching_skill(skill)[:1]:
            cid = c.id
            mini_nodes.append({
                "id": cid, "label": c.properties.get("name", "")[:30],
                "type": "Course", "properties": c.properties,
            })
            mini_edges.append({"source": cid, "target": sid, "type": "TEACHES"})

    return {
        "career_goal": career_goal,
        "required_skills": required_skills,
        "current_skills": current_skills,
        "missing_skills": missing,
        "readiness_score": readiness,
        "skill_gaps": skill_gaps,
        "recommended_sequence": sequence,
        "graph_data": {"nodes": mini_nodes, "edges": mini_edges},
    }


# ── Related Skills ──────────────────────────────────────────────────────────────

def get_related_skills(skill_name: str) -> dict:
    g = get_graph()
    sid = _skill_id(skill_name)

    advances_to = [
        n.properties.get("name", "")
        for n, rt in g.out_neighbours(sid, ["ADVANCES_TO"])
    ]
    related_to = [
        n.properties.get("name", "")
        for n, rt in g.out_neighbours(sid, ["RELATED_TO"])
    ]
    leads_to = [
        n.properties.get("name", "")
        for n, rt in g.out_neighbours(sid, ["LEADS_TO"])
    ]
    careers = [
        n.properties.get("title", "")
        for n, rt in g.in_neighbours(sid, ["REQUIRES"])
        if n.type == "Career"
    ]
    courses = g.courses_teaching_skill(skill_name)[:5]

    return {
        "skill": skill_name,
        "advances_to": advances_to,
        "related_to": related_to,
        "leads_to": leads_to,
        "required_by_careers": careers,
        "taught_by_courses": [
            {
                "id": c.properties.get("id", ""),
                "course_name": c.properties.get("name", ""),
                "organization": c.properties.get("organization", ""),
                "rating": c.properties.get("rating", 0.0),
                "difficulty_level": c.properties.get("difficulty", ""),
            }
            for c in courses
        ],
    }
