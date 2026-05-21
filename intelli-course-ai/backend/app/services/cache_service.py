"""
CacheService — dual-layer Redis + in-memory cache.

Improvements over v1:
  • Batch get/set (mget / pipeline)
  • Pattern-based key deletion (SCAN + DEL)
  • Hit/miss metrics
  • Embedding storage via raw JSON (embeds cached 24h by query hash)
  • Graceful degradation: all ops fall back to in-memory on Redis failure
"""

import fnmatch
import hashlib
import json
import time
from typing import Any

import structlog

logger = structlog.get_logger()


# ── In-memory fallback ────────────────────────────────────────────────────────

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

    def delete_pattern(self, pattern: str) -> int:
        keys = [k for k in list(self._store) if fnmatch.fnmatch(k, pattern)]
        for k in keys:
            self._store.pop(k, None)
        return len(keys)

    def flush(self):
        self._store.clear()

    def size(self) -> int:
        return len(self._store)


# ── Main service ──────────────────────────────────────────────────────────────

class CacheService:
    def __init__(self):
        self._redis = None
        self._fallback = InMemoryCache()
        self._use_redis = False
        # Metrics
        self._hits: int = 0
        self._misses: int = 0

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

    # ── Key helpers ───────────────────────────────────────────────────────────

    @staticmethod
    def make_key(prefix: str, data: dict) -> str:
        serialized = json.dumps(data, sort_keys=True, default=str)
        digest = hashlib.sha256(serialized.encode()).hexdigest()[:24]
        return f"intellicourse:{prefix}:{digest}"

    @staticmethod
    def embedding_key(text: str) -> str:
        digest = hashlib.sha256(text.encode()).hexdigest()[:32]
        return f"intellicourse:emb:{digest}"

    # ── Single item ops ───────────────────────────────────────────────────────

    async def get(self, key: str) -> dict | None:
        if self._use_redis and self._redis:
            try:
                raw = await self._redis.get(key)
                if raw:
                    self._hits += 1
                    return json.loads(raw)
            except Exception as e:
                logger.warning("Redis get failed", error=str(e))
        result = self._fallback.get(key)
        if result is not None:
            self._hits += 1
        else:
            self._misses += 1
        return result

    async def set(self, key: str, value: Any, ttl: int = 3600):
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

    # ── Batch ops ─────────────────────────────────────────────────────────────

    async def get_many(self, keys: list[str]) -> dict[str, Any]:
        """Return {key: value} for all cache hits. Misses are omitted."""
        if not keys:
            return {}

        if self._use_redis and self._redis:
            try:
                values = await self._redis.mget(*keys)
                result = {}
                for key, raw in zip(keys, values):
                    if raw is not None:
                        result[key] = json.loads(raw)
                        self._hits += 1
                    else:
                        self._misses += 1
                return result
            except Exception as e:
                logger.warning("Redis mget failed", error=str(e))

        return {k: v for k in keys if (v := self._fallback.get(k)) is not None}

    async def set_many(self, items: dict[str, Any], ttl: int = 3600):
        """Set multiple key-value pairs atomically via pipeline."""
        if not items:
            return

        if self._use_redis and self._redis:
            try:
                pipe = self._redis.pipeline()
                for key, value in items.items():
                    pipe.setex(key, ttl, json.dumps(value, default=str))
                await pipe.execute()
                return
            except Exception as e:
                logger.warning("Redis pipeline set failed", error=str(e))

        for key, value in items.items():
            self._fallback.set(key, value, ttl)

    # ── Embedding-specific helpers ────────────────────────────────────────────

    async def get_embedding(self, text: str) -> list[float] | None:
        key = self.embedding_key(text)
        result = await self.get(key)
        return result if isinstance(result, list) else None

    async def set_embedding(self, text: str, embedding: list[float], ttl: int = 86400):
        key = self.embedding_key(text)
        await self.set(key, embedding, ttl)

    # ── Pattern invalidation ──────────────────────────────────────────────────

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching a glob pattern. Returns count deleted."""
        if self._use_redis and self._redis:
            try:
                count = 0
                async for key in self._redis.scan_iter(match=pattern, count=100):
                    await self._redis.delete(key)
                    count += 1
                return count
            except Exception as e:
                logger.warning("Redis scan_iter failed", error=str(e))
        return self._fallback.delete_pattern(pattern)

    async def invalidate_search_cache(self) -> int:
        return await self.delete_pattern("intellicourse:search:*")

    async def invalidate_courses_cache(self) -> int:
        return await self.delete_pattern("intellicourse:courses:list:*")

    # ── Metrics ───────────────────────────────────────────────────────────────

    def stats(self) -> dict:
        total = self._hits + self._misses
        return {
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(self._hits / total, 3) if total else 0.0,
            "backend": "redis" if self._use_redis else "memory",
            "memory_entries": self._fallback.size() if not self._use_redis else None,
        }


# ── Singleton ─────────────────────────────────────────────────────────────────

_cache_service: CacheService | None = None


def get_cache_service() -> CacheService:
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service
