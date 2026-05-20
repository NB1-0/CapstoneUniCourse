import hashlib
import json
import time
from typing import Any

import structlog

logger = structlog.get_logger()


class InMemoryCache:
    def __init__(self):
        self._store: dict[str, tuple[Any, float]] = {}

    def get(self, key: str) -> Any | None:
        if key in self._store:
            value, expires_at = self._store[key]
            if expires_at == 0 or time.time() < expires_at:
                return value
            del self._store[key]
        return None

    def set(self, key: str, value: Any, ttl: int = 3600):
        expires_at = time.time() + ttl if ttl > 0 else 0
        self._store[key] = (value, expires_at)

    def delete(self, key: str):
        self._store.pop(key, None)

    def flush(self):
        self._store.clear()


class CacheService:
    def __init__(self):
        self._redis = None
        self._fallback = InMemoryCache()
        self._use_redis = False

    async def initialize(self):
        try:
            from app.db.redis_client import get_redis
            r = await get_redis()
            if r:
                self._redis = r
                self._use_redis = True
                logger.info("Cache: using Redis")
            else:
                logger.info("Cache: Redis unavailable, using in-memory fallback")
        except Exception as e:
            logger.warning("Cache init failed, using in-memory", error=str(e))

    @staticmethod
    def make_key(prefix: str, data: dict) -> str:
        serialized = json.dumps(data, sort_keys=True, default=str)
        digest = hashlib.sha256(serialized.encode()).hexdigest()[:16]
        return f"intellicourse:{prefix}:{digest}"

    async def get(self, key: str) -> dict | None:
        if self._use_redis and self._redis:
            try:
                raw = await self._redis.get(key)
                if raw:
                    return json.loads(raw)
            except Exception as e:
                logger.warning("Redis get failed", error=str(e))
        return self._fallback.get(key)

    async def set(self, key: str, value: dict, ttl: int = 3600):
        if self._use_redis and self._redis:
            try:
                await self._redis.setex(key, ttl, json.dumps(value, default=str))
                return
            except Exception as e:
                logger.warning("Redis set failed", error=str(e))
        self._fallback.set(key, value, ttl)

    async def delete(self, key: str):
        if self._use_redis and self._redis:
            try:
                await self._redis.delete(key)
            except Exception:
                pass
        self._fallback.delete(key)

    async def flush(self):
        if self._use_redis and self._redis:
            try:
                await self._redis.flushdb()
            except Exception:
                pass
        self._fallback.flush()


_cache_service: CacheService | None = None


def get_cache_service() -> CacheService:
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service
