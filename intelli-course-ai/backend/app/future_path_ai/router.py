"""
FuturePath AI router.

Endpoints:
  POST /api/future-path/simulate       → generate multiple career timelines
  POST /api/future-path/what-if        → apply a what-if scenario
  GET  /api/future-path/history/{uid}  → past simulations for a user
  GET  /api/future-path/graph/{uid}/{sim_id}/{path_id} → React Flow graph JSON
"""

import asyncio

from fastapi import APIRouter, HTTPException

from app.future_path_ai.schemas import SimulateRequest, WhatIfRequest
from app.future_path_ai import service

router = APIRouter(prefix="/future-path", tags=["FuturePath AI"])


@router.post("/simulate")
async def simulate_path(request: SimulateRequest):
    """Generate multiple future career timelines from a student profile."""
    return await asyncio.to_thread(service.simulate, request)


@router.post("/what-if")
async def what_if(request: WhatIfRequest):
    """Simulate a scenario change and return before/after comparison."""
    return await asyncio.to_thread(service.what_if, request)


@router.get("/history/{user_id}")
async def get_history(user_id: str):
    """Return the simulation history for a user."""
    return service.get_history(user_id)


@router.get("/graph/{user_id}/{sim_id}/{path_id}")
async def get_timeline_graph(user_id: str, sim_id: str, path_id: str):
    """Return React Flow graph JSON for a specific career path."""
    graph = service.get_graph(user_id, sim_id, path_id)
    if not graph:
        raise HTTPException(status_code=404, detail="Simulation or path not found.")
    return graph
