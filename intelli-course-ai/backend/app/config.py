from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    EMBEDDING_MODEL: str = "text-embedding-3-large"

    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_COLLECTION: str = "courses"

    REDIS_URL: str = "redis://localhost:6379"
    REDIS_TTL: int = 3600

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/intellicourse"

    # ── Neo4j (optional — leave empty to use in-memory graph) ─────────────
    NEO4J_URI: str = ""
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = ""

    TOP_K_RESULTS: int = 10
    RERANK_TOP_K: int = 5
    MAX_TOKENS: int = 2000

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    APP_NAME: str = "IntelliCourse AI"
    VERSION: str = "1.0.0"

    @property
    def MOCK_MODE(self) -> bool:
        return not bool(self.OPENAI_API_KEY)


@lru_cache
def get_settings() -> Settings:
    return Settings()
