"""
/api/graph/* — GraphRAG knowledge graph endpoints.

All endpoints fall back gracefully when the graph is empty
(e.g. during startup before courses are loaded).
"""

import time

from fastapi import APIRouter, HTTPException, Query

import app.services.graph_service as gs
from app.graph import neo4j_client
from app.schemas.graph import (
    SkillPathRequest, SkillPathResponse,
    CareerPathRequest, CareerPathResponse,
    GraphRecommendRequest, GraphRecommendResponse,
    GraphExploreResponse, RelatedSkillsResponse,
    GraphStats, VizNode, VizEdge, GraphCourseResult,
)

router = APIRouter(prefix="/graph", tags=["graph"])


# ── Health & Stats ─────────────────────────────────────────────────────────────

@router.get("/stats", response_model=GraphStats)
async def graph_stats():
    """Node and edge counts by type. Use to verify the graph is populated."""
    g = gs.get_graph()
    stats = g.stats()
    return GraphStats(
        total_nodes=stats["total_nodes"],
        total_edges=stats["total_edges"],
        nodes_by_type=stats.get("nodes_by_type", {}),
        edges_by_type=stats.get("edges_by_type", {}),
        neo4j_active=neo4j_client.is_available(),
    )


# ── Graph Visualisation ────────────────────────────────────────────────────────

@router.get("/explore", response_model=GraphExploreResponse)
async def explore_graph(
    node_types: str = Query(default="", description="Comma-separated types: Skill,Course,Career,Domain"),
    max_nodes: int = Query(default=200, ge=10, le=500),
    focus_skill: str = Query(default=""),
):
    """
    Return the full (or filtered) knowledge graph for frontend visualisation.
    Use `focus_skill` to get a skill-centric subgraph.
    """
    t0 = time.perf_counter()
    g = gs.get_graph()

    types = [t.strip() for t in node_types.split(",") if t.strip()] or None

    if focus_skill:
        # Return ego-graph around the skill (depth-2)
        data = _ego_graph(g, focus_skill, max_nodes)
    else:
        data = g.to_viz_data(max_nodes=max_nodes, node_types=types)

    ms = (time.perf_counter() - t0) * 1000
    return GraphExploreResponse(
        nodes=[VizNode(**n) for n in data["nodes"]],
        edges=[VizEdge(**e) for e in data["edges"]],
        stats=data["stats"],
        processing_time_ms=round(ms, 2),
    )


def _ego_graph(g, skill_name: str, max_nodes: int) -> dict:
    """Subgraph centred on a skill — depth-2 neighbourhood."""
    from app.graph.builder import _skill_id
    sid = _skill_id(skill_name)

    node_ids: set[str] = {sid}
    for node, _ in g.out_neighbours(sid):
        node_ids.add(node.id)
        for inner, _ in g.out_neighbours(node.id):
            node_ids.add(inner.id)
    for node, _ in g.in_neighbours(sid):
        node_ids.add(node.id)

    node_ids = set(list(node_ids)[:max_nodes])
    nodes = [
        {"id": nid, "label": g.node(nid).label(), "type": g.node(nid).type, "properties": g.node(nid).properties}
        for nid in node_ids if g.node(nid)
    ]
    edges = [
        {"source": e.source, "target": e.target, "type": e.rel_type}
        for e in g._edges
        if e.source in node_ids and e.target in node_ids
    ]
    return {"nodes": nodes, "edges": edges, "stats": {"total_nodes": len(nodes), "total_edges": len(edges), "returned_nodes": len(nodes), "returned_edges": len(edges)}}


# ── Skill Path ─────────────────────────────────────────────────────────────────

@router.post("/skill-path", response_model=SkillPathResponse)
async def skill_path(req: SkillPathRequest):
    """
    Find the shortest skill progression path from one skill to another.
    Returns each intermediate step with top courses to learn that skill.

    Example: Python → Data Analysis → Machine Learning → Deep Learning
    """
    t0 = time.perf_counter()
    steps = gs.find_skill_path(req.from_skill, req.to_skill, req.max_depth)
    ms = (time.perf_counter() - t0) * 1000

    total_weeks = sum(s.estimated_weeks for s in steps)
    return SkillPathResponse(
        from_skill=req.from_skill,
        to_skill=req.to_skill,
        path_found=len(steps) > 0,
        path=steps,
        total_steps=len(steps),
        estimated_weeks=total_weeks or 12,
        processing_time_ms=round(ms, 2),
    )


# ── Career Path ────────────────────────────────────────────────────────────────

@router.post("/career-path", response_model=CareerPathResponse)
async def career_path(req: CareerPathRequest):
    """
    Graph-based career analysis:
    — Required skills for the target career
    — Skill gaps vs current skills
    — Ordered course sequence (beginner → advanced)
    — Mini knowledge graph data for client visualisation
    """
    t0 = time.perf_counter()
    result = gs.get_career_path(
        req.career_goal,
        req.current_skills,
        req.max_courses_per_skill,
    )
    ms = (time.perf_counter() - t0) * 1000
    result["processing_time_ms"] = round(ms, 2)
    return CareerPathResponse(**result)


# ── Hybrid Graph + Vector Recommendations ──────────────────────────────────────

@router.post("/recommendations", response_model=GraphRecommendResponse)
async def graph_recommendations(req: GraphRecommendRequest):
    """
    Hybrid GraphRAG recommendations — RRF fusion of vector similarity + graph coverage.
    Outperforms pure vector search for skill-gap and career-progression queries.
    """
    t0 = time.perf_counter()
    from app.agents.graph_rag_agent import GraphRAGAgent

    agent = GraphRAGAgent()
    result = await agent.execute({
        "query": req.query,
        "current_skills": req.current_skills,
        "target_skills": req.target_skills,
        "top_k": req.top_k,
    })
    ms = (time.perf_counter() - t0) * 1000

    courses = [
        GraphCourseResult(
            id=r["id"],
            course_name=r["course_name"],
            organization=r["organization"],
            difficulty_level=r["difficulty_level"],
            rating=r["rating"],
            skills=r.get("skills", []),
            course_url=r.get("course_url", ""),
            relevance_score=r.get("relevance_score", 0.0),
            graph_score=r.get("graph_score", 0.0),
            hybrid_score=r.get("hybrid_score", 0.0),
            why_recommended=r.get("why_recommended", ""),
            students_enrolled=r.get("students_enrolled", 0),
        )
        for r in result.get("results", [])
    ]

    return GraphRecommendResponse(
        query=req.query,
        results=courses,
        total=len(courses),
        graph_enhanced=result.get("graph_enhanced", False),
        processing_time_ms=round(ms, 2),
    )


# ── Related Skills ─────────────────────────────────────────────────────────────

@router.get("/related/{skill_name}", response_model=RelatedSkillsResponse)
async def related_skills(skill_name: str):
    """
    Return all graph neighbours of a skill:
    advances_to, related_to, leads_to, careers that require it, courses that teach it.
    """
    data = gs.get_related_skills(skill_name)
    return RelatedSkillsResponse(**data)


# ── Available Careers ──────────────────────────────────────────────────────────

@router.get("/careers")
async def list_careers():
    """List all career paths available in the knowledge graph."""
    from app.graph.schema import CAREER_SKILLS
    g = gs.get_graph()
    careers = []
    for title, skills in CAREER_SKILLS.items():
        careers.append({
            "title": title,
            "required_skills_count": len(skills),
            "key_skills": skills[:4],
        })
    return {"careers": careers, "total": len(careers)}


# ── Skill Domains ──────────────────────────────────────────────────────────────

@router.get("/domains")
async def list_domains():
    """Return all domain nodes with their skill counts."""
    g = gs.get_graph()
    domain_nodes = g.nodes_by_type("Domain")
    result = []
    for d in domain_nodes:
        skills_in_domain = [
            n for n in g.in_neighbours(d.id, ["BELONGS_TO"])
            if n[0].type == "Skill"
        ]
        result.append({
            "name": d.properties.get("name", ""),
            "skill_count": len(skills_in_domain),
        })
    return {"domains": sorted(result, key=lambda x: -x["skill_count"])}
