"""
GraphRAGAgent — hybrid vector + graph retrieval agent.

Combines:
  1. Vector similarity search (BM25 + semantic) from the existing SearchService
  2. Graph-based relevance scoring from the knowledge graph
  3. Weighted fusion with explanation generation

This is an additive layer — it imports and enhances the existing pipeline
without modifying any existing agent.
"""

import time
from typing import Any

import structlog

from app.agents.base_agent import BaseAgent
from app.schemas.response import CourseResult
from app.schemas.graph import GraphCourseResult
from app.services import graph_service as gs

logger = structlog.get_logger()

# Weights for hybrid fusion
VECTOR_WEIGHT = 0.55
GRAPH_WEIGHT = 0.45


class GraphRAGAgent(BaseAgent):
    """
    Retrieves courses using both vector similarity and graph traversal,
    then fuses scores to produce a ranked, explainable result list.
    """

    async def run(self, input_data: dict) -> dict:
        query: str = input_data.get("query", "")
        current_skills: list[str] = input_data.get("current_skills", [])
        target_skills: list[str] = input_data.get("target_skills", [])
        top_k: int = input_data.get("top_k", 10)

        # ── 1. Vector retrieval ──────────────────────────────────────────
        from app.services.search_service import get_search_service
        search_svc = get_search_service()

        vector_results: list[CourseResult] = []
        try:
            vector_results = await search_svc.hybrid_search(
                query=query,
                filters={},
                top_k=top_k * 2,
            )
        except Exception as e:
            logger.warning("Vector search failed in GraphRAGAgent", error=str(e))

        # ── 2. Graph retrieval ────────────────────────────────────────────
        effective_targets = target_skills or _extract_skills_from_query(query)
        graph_results = gs.get_graph_recommendations(
            current_skills=current_skills,
            target_skills=effective_targets,
            top_k=top_k * 2,
        )

        # ── 3. Hybrid fusion ──────────────────────────────────────────────
        fused = _fuse_results(vector_results, graph_results, query, top_k)

        return {
            "results": fused,
            "total": len(fused),
            "graph_enhanced": True,
            "vector_count": len(vector_results),
            "graph_count": len(graph_results),
        }


def _extract_skills_from_query(query: str) -> list[str]:
    """Quick keyword extraction from query to use as target skills for graph search."""
    from app.ingestion.text_cleaner import extract_skills_from_text
    return extract_skills_from_text(query)[:5]


def _fuse_results(
    vector_results: list[CourseResult],
    graph_results: list[GraphCourseResult],
    query: str,
    top_k: int,
) -> list[dict]:
    """
    Reciprocal Rank Fusion (RRF) + score blending.
    Each list contributes a rank-based score; final sort uses combined score.
    """
    RRF_K = 60  # standard RRF constant

    combined: dict[str, dict[str, Any]] = {}

    # Vector contribution
    for rank, course in enumerate(vector_results):
        cid = course.id
        if cid not in combined:
            combined[cid] = {
                "id": cid,
                "course_name": course.course_name,
                "organization": course.organization,
                "difficulty_level": course.difficulty_level,
                "rating": course.rating,
                "skills": course.skills,
                "course_url": course.course_url or "",
                "students_enrolled": getattr(course, "students_enrolled", 0),
                "vector_score": 0.0,
                "graph_score": 0.0,
                "rrf_score": 0.0,
                "why_recommended": course.why_recommended,
            }
        rrf = 1 / (RRF_K + rank + 1)
        combined[cid]["vector_score"] = course.relevance_score
        combined[cid]["rrf_score"] += rrf * VECTOR_WEIGHT

    # Graph contribution
    for rank, course in enumerate(graph_results):
        cid = course.id
        if cid not in combined:
            combined[cid] = {
                "id": cid,
                "course_name": course.course_name,
                "organization": course.organization,
                "difficulty_level": course.difficulty_level,
                "rating": course.rating,
                "skills": course.skills,
                "course_url": course.course_url or "",
                "students_enrolled": course.students_enrolled,
                "vector_score": 0.0,
                "graph_score": 0.0,
                "rrf_score": 0.0,
                "why_recommended": course.why_recommended,
            }
        rrf = 1 / (RRF_K + rank + 1)
        combined[cid]["graph_score"] = course.graph_score
        combined[cid]["rrf_score"] += rrf * GRAPH_WEIGHT

    # Sort by RRF score, break ties by rating
    ranked = sorted(
        combined.values(),
        key=lambda x: (x["rrf_score"], x.get("rating", 0)),
        reverse=True,
    )[:top_k]

    # Normalize and annotate
    max_rrf = ranked[0]["rrf_score"] if ranked else 1
    for item in ranked:
        item["hybrid_score"] = round(min(1.0, item["rrf_score"] / max(max_rrf, 1e-9)), 4)
        item["relevance_score"] = item["hybrid_score"]
        if not item["why_recommended"]:
            item["why_recommended"] = (
                f"Graph + vector match — teaches {', '.join(item['skills'][:3])}."
                if item["skills"]
                else "Highly relevant based on semantic + graph analysis."
            )

    return ranked
