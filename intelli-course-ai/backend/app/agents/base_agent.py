import time
from abc import ABC, abstractmethod

import structlog

logger = structlog.get_logger()


class BaseAgent(ABC):
    def __init__(self, name: str):
        self.name = name
        self.logger = structlog.get_logger().bind(agent=name)

    @abstractmethod
    async def run(self, input_data: dict) -> dict:
        pass

    async def execute(self, input_data: dict) -> dict:
        start = time.time()
        self.logger.info("Agent starting", input_keys=list(input_data.keys()))
        try:
            result = await self.run(input_data)
            elapsed_ms = (time.time() - start) * 1000
            self.logger.info("Agent completed", elapsed_ms=round(elapsed_ms, 2))
            return result
        except Exception as e:
            self.logger.error("Agent failed", error=str(e))
            raise
