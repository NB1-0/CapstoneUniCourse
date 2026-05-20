import structlog

logger = structlog.get_logger()
_redis_client = None


async def get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        import redis.asyncio as aioredis
        from app.config import get_settings
        settings = get_settings()
        client = aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        await client.ping()
        _redis_client = client
        logger.info("Redis connected")
        return client
    except Exception as e:
        logger.warning("Redis unavailable", error=str(e))
        return None


async def close_redis():
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
