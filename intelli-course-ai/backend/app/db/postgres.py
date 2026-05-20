from typing import AsyncGenerator

import structlog
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import get_settings

logger = structlog.get_logger()

_engine = None
_session_factory = None


async def init_db():
    global _engine, _session_factory
    settings = get_settings()
    try:
        _engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False, class_=AsyncSession)
        from app.models.course import Base
        async with _engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("PostgreSQL connected and tables created")
    except Exception as e:
        logger.warning("PostgreSQL unavailable, running without persistent storage", error=str(e))
        _engine = None
        _session_factory = None


async def get_db() -> AsyncGenerator[AsyncSession | None, None]:
    if _session_factory is None:
        yield None
        return
    async with _session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db():
    global _engine
    if _engine:
        await _engine.dispose()
