from typing import AsyncGenerator
from urllib.parse import urlparse, urlunparse, urlencode, parse_qs

import structlog
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import get_settings

logger = structlog.get_logger()

_engine = None
_session_factory = None

# asyncpg doesn't understand these libpq query params — strip them and apply properly
_STRIP_PARAMS = {"sslmode", "channel_binding", "sslcert", "sslkey", "sslrootcert"}


def _clean_url(database_url: str) -> tuple[str, dict]:
    """
    Convert a libpq-style URL to asyncpg-compatible format.
    - Replaces postgresql:// with postgresql+asyncpg://
    - Strips unsupported query params (sslmode, channel_binding, etc.)
    - Returns (cleaned_url, connect_args)
    """
    # Ensure asyncpg driver prefix
    url = database_url
    if url.startswith("postgresql://") or url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url.split("://", 1)[1]

    parsed = urlparse(url)
    qs = parse_qs(parsed.query, keep_blank_values=True)

    connect_args: dict = {}
    is_neon = "neon.tech" in (parsed.hostname or "")

    # Detect sslmode from query string
    sslmode = qs.pop("sslmode", [None])[0]
    qs.pop("channel_binding", None)  # not supported by asyncpg

    if is_neon or sslmode in ("require", "verify-ca", "verify-full"):
        connect_args["ssl"] = "require"

    # Rebuild URL without stripped params
    clean_query = urlencode({k: v[0] for k, v in qs.items()}) if qs else ""
    cleaned = urlunparse((
        parsed.scheme, parsed.netloc, parsed.path,
        parsed.params, clean_query, parsed.fragment
    ))

    return cleaned, connect_args


def _build_engine(database_url: str):
    cleaned_url, connect_args = _clean_url(database_url)

    engine_kwargs: dict = {"echo": False, "pool_pre_ping": True}

    if connect_args:
        engine_kwargs["connect_args"] = connect_args

    # Neon pooler endpoints work best with a modest pool
    if "neon.tech" in database_url:
        engine_kwargs.update({"pool_size": 5, "max_overflow": 2, "pool_timeout": 30})
    else:
        engine_kwargs.update({"pool_size": 10, "max_overflow": 20})

    return create_async_engine(cleaned_url, **engine_kwargs)


async def init_db():
    global _engine, _session_factory
    settings = get_settings()
    try:
        _engine = _build_engine(settings.DATABASE_URL)
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
