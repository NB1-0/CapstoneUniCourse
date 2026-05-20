import re
from app.agents.base_agent import BaseAgent
from app.agents.course_retrieval_agent import CourseRetrievalAgent
from app.agents.skill_gap_agent import SkillGapAgent
from app.agents.learning_path_agent import LearningPathAgent
from app.agents.career_alignment_agent import CareerAlignmentAgent
from app.config import get_settings

INTENT_KEYWORDS = {
    "skill_gap": ["skill gap", "what skills", "missing skills", "need to learn", "qualify for", "ready for"],
    "learning_path": ["learning path", "roadmap", "how to become", "step by step", "course order", "what order"],
    "career": ["career", "job", "role", "become a", "work as", "hire as"],
    "recommend": ["recommend", "suggest", "best course", "good course", "top course"],
    "search": [],  # default fallback
}

CLARIFICATION_TRIGGERS = ["help", "something", "anything", "courses", "learn", "study"]


def detect_intent(query: str) -> str:
    q = query.lower()
    for intent, keywords in INTENT_KEYWORDS.items():
        if intent == "search":
            continue
        if any(kw in q for kw in keywords):
            return intent
    words = q.split()
    if len(words) <= 2 and any(t in q for t in CLARIFICATION_TRIGGERS):
        return "clarify"
    return "search"


class AdvisorAgent(BaseAgent):
    """Orchestrator agent that routes queries to the appropriate specialized agents."""

    def __init__(self):
        super().__init__("AdvisorAgent")
        self.retrieval_agent = CourseRetrievalAgent()
        self.skill_gap_agent = SkillGapAgent()
        self.learning_path_agent = LearningPathAgent()
        self.career_agent = CareerAlignmentAgent()

    async def run(self, input_data: dict) -> dict:
        query: str = input_data.get("query", "")
        context: dict = input_data.get("context", {})
        filters: dict = input_data.get("filters", {})
        top_k: int = input_data.get("top_k", 10)

        settings = get_settings()

        if not settings.MOCK_MODE:
            try:
                from app.services.llm_service import get_llm_service
                llm = get_llm_service()
                intent = await llm.detect_intent(query)
            except Exception:
                intent = detect_intent(query)
        else:
            intent = detect_intent(query)

        self.logger.info("Intent detected", intent=intent, query=query[:80])

        if intent == "clarify":
            return {
                "intent": "clarify",
                "clarification_needed": True,
                "clarification_question": "Could you tell me more? Are you looking to search for courses, build a learning path, or explore a career?",
                "results": [],
            }

        if intent == "skill_gap":
            target_role = context.get("target_role", query)
            current_skills = context.get("current_skills", [])
            return {
                "intent": intent,
                **await self.skill_gap_agent.execute({"target_role": target_role, "current_skills": current_skills}),
            }

        if intent == "learning_path":
            return {
                "intent": intent,
                **await self.learning_path_agent.execute({
                    "goal": query,
                    "current_level": context.get("current_level", "beginner"),
                    "max_courses": top_k,
                }),
            }

        if intent == "career":
            return {
                "intent": intent,
                **await self.career_agent.execute({
                    "career_goal": query,
                    "current_skills": context.get("current_skills", []),
                }),
            }

        result = await self.retrieval_agent.execute({"query": query, "filters": filters, "top_k": top_k})
        return {"intent": "search", **result}
