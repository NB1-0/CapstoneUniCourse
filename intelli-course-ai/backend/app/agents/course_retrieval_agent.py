"""
CourseRetrievalAgent — hybrid search + streaming.

stream() is an async generator that yields progressive events:
  start     → search accepted
  bm25      → keyword results ready (fast, ~10-50ms)
  reranking → merge + rerank in progress
  final     → re-ranked results ready
  done      → stream complete

run() is preserved for backward-compatible non-streaming callers.
"""

from __future__ import annotations

import asyncio
import time
from typing import AsyncGenerator

from app.agents.base_agent import BaseAgent
from app.schemas.response import CourseResult
from app.services.search_service import BM25_WEIGHT, SEMANTIC_WEIGHT, _course_to_result


class CourseRetrievalAgent(BaseAgent):
    def __init__(self):
        super().__init__("CourseRetrievalAgent")
        self._search_service = None

    @property
    def search_service(self):
        if self._search_service is None:
            from app.services.search_service import get_search_service
            self._search_service = get_search_service()
        return self._search_service

    # ── Non-streaming (backward-compatible) ───────────────────────────────────

    async def run(self, input_data: dict) -> dict:
        query: str = input_data.get("query", "")
        filters: dict = input_data.get("filters", {})
        top_k: int = input_data.get("top_k", 10)

        if not query.strip():
            return {"results": [], "total": 0}

        results = await self.search_service.hybrid_search(query=query, filters=filters, top_k=top_k * 2)
        reranked = await self.search_service.rerank(query=query, results=results)
        final = reranked[:top_k]
        self.logger.info("Retrieved courses", count=len(final), query=query[:80])
        return {"results": final, "total": len(final)}

    async def retrieve_for_skill(self, skill: str, top_k: int = 5) -> list[CourseResult]:
        return await self.search_service.search_by_skill(skill, top_k)

    # ── Streaming generator ───────────────────────────────────────────────────

    async def stream(self, input_data: dict) -> AsyncGenerator[dict, None]:
        """
        Yield search events progressively:
          1. BM25 results (fast — no I/O, usually <50 ms)
          2. Final reranked results (after semantic + CrossEncoder)
        """
        query: str = input_data.get("query", "")
        filters: dict = input_data.get("filters", {})
        top_k: int = input_data.get("top_k", 10)
        t0 = time.perf_counter()

        if not query.strip():
            yield {"type": "error", "message": "Query cannot be empty"}
            return

        yield {"type": "start", "query": query}

        svc = self.search_service
        if not svc.courses:
            yield {"type": "error", "message": "Course catalogue not loaded yet"}
            return

        # Launch BM25 (CPU, thread) and semantic (I/O) concurrently
        kw_task  = asyncio.create_task(asyncio.to_thread(svc._keyword_search_sync, query, top_k * 2))
        sem_task = asyncio.create_task(svc.semantic_search(query, top_k * 2, filters))

        # Yield BM25 results as soon as they land (usually wins the race)
        kw_results = await kw_task
        if kw_results:
            query_terms = set(query.lower().split())
            bm25_out = [
                _course_to_result(
                    c, s,
                    why=f"Strong keyword match for '{query}'",
                    matched=[sk for sk in c.skills if any(t in sk.lower() for t in query_terms)],
                )
                for c, s in kw_results[:top_k]
            ]
            yield {
                "type": "bm25",
                "results": [r.model_dump() for r in bm25_out],
                "count": len(bm25_out),
                "elapsed_ms": round((time.perf_counter() - t0) * 1000, 1),
            }

        # Wait for semantic
        sem_results = await sem_task
        yield {"type": "reranking", "elapsed_ms": round((time.perf_counter() - t0) * 1000, 1)}

        # Merge BM25 + semantic
        scores: dict[str, float] = {}
        course_map = {}
        matched_map: dict[str, list[str]] = {}
        query_terms = set(query.lower().split())

        for course, score in kw_results:
            scores[course.id] = scores.get(course.id, 0.0) + score * BM25_WEIGHT
            course_map[course.id] = course
            matched_map[course.id] = [s for s in course.skills if any(t in s.lower() for t in query_terms)]

        for course, score in sem_results:
            scores[course.id] = scores.get(course.id, 0.0) + score * SEMANTIC_WEIGHT
            course_map[course.id] = course
            if course.id not in matched_map:
                matched_map[course.id] = [s for s in course.skills if any(t in s.lower() for t in query_terms)]

        sorted_ids = sorted(scores, key=lambda cid: scores[cid], reverse=True)
        merged = [
            _course_to_result(course_map[cid], scores[cid], matched=matched_map.get(cid, []))
            for cid in sorted_ids[: top_k * 2]
        ]

        reranked = await svc.rerank(query, merged)
        final = reranked[:top_k]

        ms = round((time.perf_counter() - t0) * 1000, 1)
        yield {
            "type": "final",
            "results": [r.model_dump() for r in final],
            "total": len(final),
            "processing_time_ms": ms,
        }
        yield {"type": "done", "processing_time_ms": ms}
