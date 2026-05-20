from fastapi import APIRouter
from app.config import get_settings
from app.schemas.response import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    settings = get_settings()

    services: dict[str, str] = {"api": "ok"}

    try:
        from app.db.redis_client import get_redis
        r = await get_redis()
        services["redis"] = "ok" if r else "unavailable"
    except Exception:
        services["redis"] = "unavailable"

    try:
        from app.services.search_service import get_search_service
        svc = get_search_service()
        services["search_index"] = f"{len(svc.courses)} courses indexed"
    except Exception:
        services["search_index"] = "not initialized"

    try:
        from app.db.vector_db import get_vector_db
        vdb = get_vector_db()
        count = await vdb.get_collection_count()
        services["vector_db"] = f"ok ({count} docs)" if count >= 0 else "unavailable"
    except Exception:
        services["vector_db"] = "unavailable"

    services["llm"] = "mock mode" if settings.MOCK_MODE else "openai connected"

    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        mock_mode=settings.MOCK_MODE,
        services=services,
    )
