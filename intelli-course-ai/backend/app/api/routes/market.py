from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.models.market import (
    TrendingSkill, CareerDemand, EmergingTech, SkillInsight, MarketSummary,
)
from app.services import market_intelligence_service as svc

router = APIRouter()


@router.get("/market/summary", response_model=MarketSummary, tags=["Market Intelligence"])
async def market_summary():
    """High-level market snapshot — fastest growing skill, hottest career, emerging tech leader."""
    return svc.get_market_summary()


@router.get("/market/trending-skills", response_model=list[TrendingSkill], tags=["Market Intelligence"])
async def trending_skills(
    category: Optional[str] = Query(None, description="Filter by category: AI/ML | Cloud | Web | Security | Data | DevOps | Languages"),
    limit: int = Query(20, ge=1, le=50),
    emerging_only: bool = Query(False),
):
    """Top trending skills ranked by composite demand score, enriched with live course counts."""
    return svc.get_trending_skills(category=category, limit=limit, emerging_only=emerging_only)


@router.get("/market/career-demand", response_model=list[CareerDemand], tags=["Market Intelligence"])
async def career_demand(
    demand_level: Optional[str] = Query(None, description="Filter by demand level: Critical | High | Growing | Stable"),
    category: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=30),
):
    """Career demand insights sorted by demand level and growth rate."""
    return svc.get_career_demand(demand_level=demand_level, category=category, limit=limit)


@router.get("/market/emerging-tech", response_model=list[EmergingTech], tags=["Market Intelligence"])
async def emerging_tech(
    category: Optional[str] = Query(None, description="Filter by category: AI/ML | Cloud | Web | DevOps | Data | Systems"),
    limit: int = Query(10, ge=1, le=20),
):
    """Emerging technology landscape sorted by hype/adoption score."""
    return svc.get_emerging_tech(category=category, limit=limit)


@router.get("/market/skill-insight/{skill_name}", response_model=SkillInsight, tags=["Market Intelligence"])
async def skill_insight(skill_name: str):
    """Deep-dive insight for a specific skill: trend analysis, career alignment, salary impact, top courses."""
    insight = svc.get_skill_insight(skill_name)
    if not insight:
        raise HTTPException(status_code=404, detail=f"No market data found for skill: '{skill_name}'")
    return insight
