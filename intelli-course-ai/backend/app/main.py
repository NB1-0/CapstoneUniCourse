import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.api.routes import health, courses, search, recommend, learning_path, skill_gap, career, ingest, notifications
from app.api.routes import graph as graph_routes
from app.api.routes import memory as memory_routes
from app.api.routes import market as market_routes

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("Starting IntelliCourse AI", version=settings.VERSION, mock_mode=settings.MOCK_MODE)

    # Initialize cache
    from app.services.cache_service import get_cache_service
    cache = get_cache_service()
    await cache.initialize()

    # Initialize databases (graceful degradation if unavailable)
    from app.db.postgres import init_db
    await init_db()

    from app.db.vector_db import get_vector_db
    vdb = get_vector_db()
    await vdb.initialize()

    # Load course data on startup
    from app.ingestion.ingest import ingest_courses, load_sample_data
    import os
    data_path = os.environ.get("COURSES_DATA_PATH", "data/courses.csv")
    try:
        count = await ingest_courses(data_path)
        logger.info("Courses loaded", count=count)
    except Exception as e:
        logger.warning("CSV ingestion failed, loading sample data", error=str(e))
        count = await load_sample_data()
        logger.info("Sample courses loaded", count=count)

    # Build knowledge graph from loaded courses
    from app.services.search_service import get_search_service
    from app.services.graph_service import build_knowledge_graph
    from app.graph import neo4j_client
    search_svc = get_search_service()
    await build_knowledge_graph(search_svc.courses)

    # Connect Neo4j if configured
    if settings.NEO4J_URI:
        await neo4j_client.init_neo4j(settings.NEO4J_URI, settings.NEO4J_USER, settings.NEO4J_PASSWORD)

    logger.info("IntelliCourse AI ready")
    yield

    # Shutdown
    from app.db.postgres import close_db
    from app.db.redis_client import close_redis
    from app.graph import neo4j_client
    await close_db()
    await close_redis()
    await neo4j_client.close_neo4j()
    logger.info("IntelliCourse AI shutdown complete")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.APP_NAME,
        description="AI-powered multimodal university course discovery and learning path recommendation platform",
        version=settings.VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception", path=request.url.path, error=str(exc))
        return JSONResponse(status_code=500, content={"detail": "Internal server error. Please try again."})

    prefix = "/api"
    app.include_router(health.router, prefix=prefix)
    app.include_router(courses.router, prefix=prefix)
    app.include_router(search.router, prefix=prefix)
    app.include_router(recommend.router, prefix=prefix)
    app.include_router(learning_path.router, prefix=prefix)
    app.include_router(skill_gap.router, prefix=prefix)
    app.include_router(career.router, prefix=prefix)
    app.include_router(ingest.router, prefix=prefix)
    app.include_router(notifications.router, prefix=prefix)
    app.include_router(graph_routes.router, prefix=prefix)
    app.include_router(memory_routes.router, prefix=f"{prefix}/memory")
    app.include_router(market_routes.router, prefix=prefix)

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
