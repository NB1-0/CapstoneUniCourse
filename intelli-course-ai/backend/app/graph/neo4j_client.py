"""
Neo4j async driver wrapper.
The system runs on InMemoryGraph when Neo4j is not configured — no hard dependency.
"""

from typing import Optional, Any

import structlog

logger = structlog.get_logger()

_driver: Optional[Any] = None
_available: bool = False


async def init_neo4j(uri: str, user: str, password: str) -> bool:
    global _driver, _available
    if not uri:
        logger.info("NEO4J_URI not set — using in-memory graph")
        return False
    try:
        from neo4j import AsyncGraphDatabase  # type: ignore
        _driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
        await _driver.verify_connectivity()
        _available = True
        logger.info("Neo4j connected", uri=uri)
        return True
    except ImportError:
        logger.warning("neo4j package not installed — using in-memory graph")
    except Exception as e:
        logger.warning("Neo4j unavailable — using in-memory graph", error=str(e))
    _driver = None
    _available = False
    return False


def get_driver() -> Optional[Any]:
    return _driver


def is_available() -> bool:
    return _available


async def run_query(cypher: str, params: dict | None = None) -> list[dict]:
    """Execute a Cypher query and return list of record dicts."""
    if not _driver:
        return []
    params = params or {}
    async with _driver.session() as session:
        result = await session.run(cypher, **params)
        records = await result.data()
        return records


async def close_neo4j() -> None:
    global _driver, _available
    if _driver:
        await _driver.close()
    _driver = None
    _available = False
