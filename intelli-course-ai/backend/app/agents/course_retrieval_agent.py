from app.agents.base_agent import BaseAgent
from app.schemas.response import CourseResult


class CourseRetrievalAgent(BaseAgent):
    """Retrieves and reranks courses using hybrid search (BM25 + semantic)."""

    def __init__(self):
        super().__init__("CourseRetrievalAgent")
        self._search_service = None

    @property
    def search_service(self):
        if self._search_service is None:
            from app.services.search_service import get_search_service
            self._search_service = get_search_service()
        return self._search_service

    async def run(self, input_data: dict) -> dict:
        query: str = input_data.get("query", "")
        filters: dict = input_data.get("filters", {})
        top_k: int = input_data.get("top_k", 10)

        if not query.strip():
            return {"results": [], "total": 0}

        results: list[CourseResult] = await self.search_service.hybrid_search(
            query=query, filters=filters, top_k=top_k * 2
        )
        reranked: list[CourseResult] = await self.search_service.rerank(
            query=query, results=results
        )
        final = reranked[:top_k]

        self.logger.info("Retrieved courses", count=len(final), query=query[:80])
        return {"results": final, "total": len(final)}

    async def retrieve_for_skill(self, skill: str, top_k: int = 5) -> list[CourseResult]:
        return await self.search_service.search_by_skill(skill, top_k)
