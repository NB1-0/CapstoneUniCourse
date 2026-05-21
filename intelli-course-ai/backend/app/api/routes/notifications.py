import asyncio
import json
import time

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.config import get_settings

router = APIRouter(tags=["notifications"])


@router.get("/notifications/stream")
async def notification_stream():
    """Server-Sent Events endpoint for real-time client notifications."""
    settings = get_settings()

    async def generator():
        # Initial connected event
        payload = json.dumps({
            "type": "system",
            "title": "Connected",
            "message": f"IntelliCourse AI backend online — {'mock' if settings.MOCK_MODE else 'production'} mode.",
        })
        yield f"event: notification\ndata: {payload}\n\n"

        # Heartbeat loop — keeps the connection alive through proxies
        while True:
            yield f": ping {int(time.time())}\n\n"
            await asyncio.sleep(25)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Transfer-Encoding": "chunked",
        },
    )
