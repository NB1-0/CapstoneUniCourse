import structlog

from app.models.course import Course

logger = structlog.get_logger()
_vector_db = None


class VectorDB:
    def __init__(self, collection_name: str):
        self.collection_name = collection_name
        self._client = None
        self._collection = None
        self._initialized = False

    async def initialize(self):
        try:
            import chromadb
            from app.config import get_settings
            settings = get_settings()
            self._client = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
            self._collection = self._client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )
            self._initialized = True
            logger.info("ChromaDB connected", collection=self.collection_name)
        except Exception as e:
            logger.warning("ChromaDB unavailable, using in-memory fallback", error=str(e))
            self._initialized = False

    async def add_courses(self, courses: list[Course], embeddings: list[list[float]]):
        if not self._initialized or not self._collection:
            return
        try:
            batch_size = 100
            for i in range(0, len(courses), batch_size):
                batch_courses = courses[i:i + batch_size]
                batch_embs = embeddings[i:i + batch_size]
                self._collection.upsert(
                    ids=[c.id for c in batch_courses],
                    embeddings=batch_embs,
                    documents=[c.get_text_for_embedding() for c in batch_courses],
                    metadatas=[{
                        "course_name": c.course_name,
                        "organization": c.organization,
                        "difficulty_level": c.difficulty_level,
                        "rating": c.rating,
                    } for c in batch_courses],
                )
            logger.info("Upserted to ChromaDB", count=len(courses))
        except Exception as e:
            logger.error("ChromaDB upsert failed", error=str(e))

    async def search(self, embedding: list[float], top_k: int, filters: dict) -> list[dict]:
        if not self._initialized or not self._collection:
            return []
        try:
            where = {}
            if diff := filters.get("difficulty"):
                where["difficulty_level"] = diff
            results = self._collection.query(
                query_embeddings=[embedding],
                n_results=top_k,
                where=where if where else None,
                include=["distances", "metadatas"],
            )
            output = []
            if results["ids"] and results["ids"][0]:
                for idx, doc_id in enumerate(results["ids"][0]):
                    dist = results["distances"][0][idx]
                    score = 1.0 - (dist / 2.0)
                    output.append({"id": doc_id, "score": score})
            return output
        except Exception as e:
            logger.error("ChromaDB search failed", error=str(e))
            return []

    async def get_collection_count(self) -> int:
        if self._initialized and self._collection:
            try:
                return self._collection.count()
            except Exception:
                pass
        return 0


def get_vector_db() -> VectorDB:
    global _vector_db
    if _vector_db is None:
        from app.config import get_settings
        settings = get_settings()
        _vector_db = VectorDB(settings.CHROMA_COLLECTION)
    return _vector_db
