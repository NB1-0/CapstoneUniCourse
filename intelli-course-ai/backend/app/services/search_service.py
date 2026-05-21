"""
SearchService — hybrid BM25 + semantic retrieval.

Performance improvements over v1:
  • Singleton CrossEncoder — loaded once in a thread, never reloaded per query
  • Query embedding cache — Redis hit avoids OpenAI round-trip (~200ms saved)
  • Parallel BM25 + semantic — asyncio.gather() runs both concurrently
  • BM25 in thread pool — CPU-bound, won't block event loop
  • Batched missing embeddings — one embed_batch() call, not N embed_text() calls
  • Single-pass filter — one list comprehension instead of five sequential passes
"""

from __future__ import annotations

import asyncio
import math
from typing import Optional

import structlog

from app.config import get_settings
from app.models.course import Course
from app.schemas.response import CourseResult

logger = structlog.get_logger()

BM25_WEIGHT    = 0.4
SEMANTIC_WEIGHT = 0.6

# ── Singleton CrossEncoder (loaded once, shared across all requests) ───────────
_reranker = None
_reranker_lock = asyncio.Lock()


async def _get_reranker():
    global _reranker
    if _reranker is not None:
        return _reranker
    async with _reranker_lock:
        if _reranker is None:
            from sentence_transformers import CrossEncoder
            settings = get_settings()
            # Run sync model load in thread so event loop stays free
            _reranker = await asyncio.to_thread(CrossEncoder, settings.RERANKER_MODEL)
            logger.info("CrossEncoder reranker loaded", model=settings.RERANKER_MODEL)
    return _reranker


# ── Helpers ───────────────────────────────────────────────────────────────────

def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _course_to_result(course: Course, score: float = 0.5, why: str = "", matched: list[str] | None = None) -> CourseResult:
    return CourseResult(
        id=course.id,
        course_name=course.course_name,
        organization=course.organization,
        description=course.description,
        skills=course.skills,
        difficulty_level=course.difficulty_level,
        rating=course.rating,
        matched_skills=matched or [],
        relevance_score=round(min(1.0, max(0.0, score)), 4),
        why_recommended=why or f"Highly relevant course from {course.organization}.",
        prerequisites=course.prerequisites,
        course_url=course.course_url,
        certificate_type=getattr(course, "certificate_type", ""),
        students_enrolled=getattr(course, "students_enrolled", 0),
    )


# ── Service ───────────────────────────────────────────────────────────────────

class SearchService:
    def __init__(self):
        self.settings = get_settings()
        self.courses: list[Course] = []
        self._bm25 = None
        self._tokenized_corpus: list[list[str]] = []
        self._vector_db = None

    def _build_bm25(self):
        try:
            from rank_bm25 import BM25Okapi
            self._tokenized_corpus = [c.get_text_for_embedding().lower().split() for c in self.courses]
            self._bm25 = BM25Okapi(self._tokenized_corpus)
            logger.info("BM25 index built", courses=len(self.courses))
        except Exception as e:
            logger.warning("BM25 build failed", error=str(e))

    async def load_courses(self, courses: list[Course]):
        self.courses = courses
        self._build_bm25()
        if not self.settings.MOCK_MODE:
            try:
                from app.db.vector_db import get_vector_db
                from app.services.embedding_service import get_embedding_service
                self._vector_db = get_vector_db()
                emb_svc = get_embedding_service()
                texts = [c.get_text_for_embedding() for c in courses]
                # Batched embedding — one API call per EMBEDDING_BATCH_SIZE courses
                embeddings = await emb_svc.embed_batch(texts)
                for course, emb in zip(courses, embeddings):
                    course.embedding = emb
                await self._vector_db.add_courses(courses, embeddings)
                logger.info("Vector DB loaded", courses=len(courses))
            except Exception as e:
                logger.warning("Vector DB load failed, using in-memory", error=str(e))

    # ── Filtering (single-pass) ───────────────────────────────────────────────

    def _apply_filters(self, courses: list[Course], filters: dict) -> list[Course]:
        diff  = (filters.get("difficulty") or "").lower() or None
        min_r = filters.get("min_rating")
        skills_f = [s.lower() for s in filters["skills"]] if isinstance(filters.get("skills"), list) else None

        return [
            c for c in courses
            if (not diff or c.difficulty_level.lower() == diff)
            and (min_r is None or c.rating >= float(min_r))
            and (not skills_f or any(sf in (s.lower() for s in c.skills) for sf in skills_f))
        ]

    # ── BM25 (CPU-bound, runs in thread) ─────────────────────────────────────

    def _keyword_search_sync(self, query: str, top_k: int) -> list[tuple[Course, float]]:
        if not self._bm25 or not self.courses:
            return []
        scores = self._bm25.get_scores(query.lower().split())
        max_score = max(scores) if max(scores) > 0 else 1.0
        indexed = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)[:top_k]
        return [(self.courses[i], float(s / max_score)) for i, s in indexed if s > 0]

    async def keyword_search(self, query: str, top_k: int) -> list[tuple[Course, float]]:
        return await asyncio.to_thread(self._keyword_search_sync, query, top_k)

    # ── Semantic search (cached query embeddings) ─────────────────────────────

    async def _get_query_embedding(self, query: str) -> list[float]:
        """Check Redis cache before calling OpenAI — saves ~200ms on cache hit."""
        from app.services.cache_service import get_cache_service
        cache = get_cache_service()
        cached = await cache.get_embedding(query)
        if cached:
            return cached
        from app.services.embedding_service import get_embedding_service
        emb_svc = get_embedding_service()
        embedding = await emb_svc.embed_text(query)
        await cache.set_embedding(query, embedding, ttl=self.settings.CACHE_EMBEDDING_TTL)
        return embedding

    async def semantic_search(self, query: str, top_k: int, filters: dict) -> list[tuple[Course, float]]:
        q_emb = await self._get_query_embedding(query)

        if self._vector_db and not self.settings.MOCK_MODE:
            try:
                raw = await self._vector_db.search(q_emb, top_k, filters)
                results = []
                for r in raw:
                    course = next((c for c in self.courses if c.id == r["id"]), None)
                    if course:
                        results.append((course, r.get("score", 0.5)))
                return results
            except Exception:
                pass

        # In-memory fallback — batch any missing embeddings first
        candidates = self._apply_filters(self.courses, filters)
        missing = [c for c in candidates if not c.embedding]
        if missing:
            from app.services.embedding_service import get_embedding_service
            emb_svc = get_embedding_service()
            texts = [c.get_text_for_embedding() for c in missing]
            embeddings = await emb_svc.embed_batch(texts)
            for course, emb in zip(missing, embeddings):
                course.embedding = emb

        scored = [
            (c, _cosine_similarity(q_emb, c.embedding))
            for c in candidates if c.embedding
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    # ── Hybrid search (parallel) ──────────────────────────────────────────────

    async def hybrid_search(self, query: str, filters: dict, top_k: int) -> list[CourseResult]:
        if not self.courses:
            return []

        # BM25 (thread) + semantic (async I/O) run concurrently
        kw_results, sem_results = await asyncio.gather(
            self.keyword_search(query, top_k * 2),
            self.semantic_search(query, top_k * 2, filters),
        )

        scores: dict[str, float] = {}
        course_map: dict[str, Course] = {}

        for course, score in kw_results:
            scores[course.id] = scores.get(course.id, 0.0) + score * BM25_WEIGHT
            course_map[course.id] = course

        for course, score in sem_results:
            scores[course.id] = scores.get(course.id, 0.0) + score * SEMANTIC_WEIGHT
            course_map[course.id] = course

        query_terms = set(query.lower().split())
        sorted_ids = sorted(scores, key=lambda cid: scores[cid], reverse=True)
        results = []
        for cid in sorted_ids[:top_k]:
            course = course_map[cid]
            matched = [s for s in course.skills if any(t in s.lower() for t in query_terms)]
            results.append(_course_to_result(course, scores[cid], matched=matched))

        return results

    # ── Reranking (singleton CrossEncoder) ───────────────────────────────────

    async def rerank(self, query: str, results: list[CourseResult]) -> list[CourseResult]:
        if not results:
            return results
        if self.settings.MOCK_MODE or len(results) <= 3:
            return sorted(results, key=lambda r: r.relevance_score, reverse=True)

        try:
            reranker = await _get_reranker()
            pairs = [(query, f"{r.course_name}. {r.description[:300]}") for r in results]
            # Prediction is CPU-bound — run in thread
            rerank_scores = await asyncio.to_thread(reranker.predict, pairs)
            scored = sorted(zip(results, rerank_scores), key=lambda x: x[1], reverse=True)
            for result, score in scored:
                result.relevance_score = round(float(score), 4)
            return [r for r, _ in scored]
        except Exception as e:
            logger.warning("Reranking failed, using original order", error=str(e))
            return sorted(results, key=lambda r: r.relevance_score, reverse=True)

    # ── Skill search ──────────────────────────────────────────────────────────

    async def search_by_skill(self, skill: str, top_k: int = 5) -> list[CourseResult]:
        sk = skill.lower()
        matching = [c for c in self.courses if any(sk in s.lower() for s in c.skills)]
        matching.sort(key=lambda c: c.rating, reverse=True)
        return [_course_to_result(c, 0.8, f"This course directly teaches {skill}.", [skill]) for c in matching[:top_k]]


# ── Singleton ─────────────────────────────────────────────────────────────────

_search_service: Optional[SearchService] = None


def get_search_service() -> SearchService:
    global _search_service
    if _search_service is None:
        _search_service = SearchService()
    return _search_service
