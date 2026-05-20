import hashlib
import math
from functools import lru_cache

import structlog

from app.config import get_settings

logger = structlog.get_logger()

EMBEDDING_DIM = 1536  # text-embedding-3-large dimension


def _mock_embedding(text: str) -> list[float]:
    """Deterministic pseudo-embedding based on text hash for mock mode."""
    seed = int(hashlib.md5(text.encode()).hexdigest(), 16)
    vec = []
    for i in range(EMBEDDING_DIM):
        seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
        vec.append((seed / 0x7FFFFFFF) * 2 - 1)
    magnitude = math.sqrt(sum(x * x for x in vec))
    return [x / magnitude for x in vec]


class EmbeddingService:
    def __init__(self):
        self.settings = get_settings()
        self._openai_client = None
        self._sentence_model = None
        self._cache: dict[str, list[float]] = {}

    @property
    def openai_client(self):
        if self._openai_client is None and not self.settings.MOCK_MODE:
            from openai import AsyncOpenAI
            self._openai_client = AsyncOpenAI(api_key=self.settings.OPENAI_API_KEY)
        return self._openai_client

    def _get_sentence_model(self):
        if self._sentence_model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._sentence_model = SentenceTransformer("BAAI/bge-large-en-v1.5")
                logger.info("Loaded sentence-transformers model")
            except Exception as e:
                logger.warning("Could not load sentence-transformers", error=str(e))
        return self._sentence_model

    async def embed_text(self, text: str) -> list[float]:
        if text in self._cache:
            return self._cache[text]

        embedding: list[float]

        if self.settings.MOCK_MODE:
            embedding = _mock_embedding(text)
        else:
            try:
                response = await self.openai_client.embeddings.create(
                    model=self.settings.EMBEDDING_MODEL,
                    input=text,
                )
                embedding = response.data[0].embedding
            except Exception as e:
                logger.warning("OpenAI embedding failed, using sentence-transformers", error=str(e))
                model = self._get_sentence_model()
                if model:
                    embedding = model.encode(text).tolist()
                else:
                    embedding = _mock_embedding(text)

        self._cache[text] = embedding
        return embedding

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if self.settings.MOCK_MODE:
            return [_mock_embedding(t) for t in texts]
        results = []
        batch_size = 50
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            try:
                response = await self.openai_client.embeddings.create(
                    model=self.settings.EMBEDDING_MODEL,
                    input=batch,
                )
                results.extend([item.embedding for item in response.data])
            except Exception as e:
                logger.warning("Batch embedding failed, using mock", error=str(e))
                results.extend([_mock_embedding(t) for t in batch])
        return results


_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
