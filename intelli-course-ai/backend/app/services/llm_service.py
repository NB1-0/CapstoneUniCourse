import json
from functools import lru_cache

import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings

logger = structlog.get_logger()

MOCK_SKILLS = {
    "data scientist": ["Python", "Machine Learning", "Statistics", "SQL", "Data Visualization", "Pandas", "Deep Learning"],
    "ml engineer": ["Python", "Deep Learning", "TensorFlow", "PyTorch", "MLOps", "Docker", "Cloud Computing"],
    "default": ["Python", "SQL", "Statistics", "Machine Learning", "Data Analysis", "Cloud Computing"],
}

MOCK_PATH_SUMMARY = (
    "This curated learning path progressively builds your skills from foundational concepts to advanced techniques. "
    "Each course has been selected to maximize skill transfer and ensure you're job-ready at every stage."
)


class LLMService:
    def __init__(self):
        self.settings = get_settings()
        self._client = None

    @property
    def client(self):
        if self._client is None and not self.settings.MOCK_MODE:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=self.settings.OPENAI_API_KEY)
        return self._client

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def chat(self, system_prompt: str, user_message: str, temperature: float = 0.7) -> str:
        if self.settings.MOCK_MODE:
            return f"[Mock response] Based on your query: {user_message[:100]}..."
        response = await self.client.chat.completions.create(
            model=self.settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=temperature,
            max_tokens=self.settings.MAX_TOKENS,
        )
        return response.choices[0].message.content or ""

    async def analyze_skills(self, target_role: str) -> list[str]:
        if self.settings.MOCK_MODE:
            role_lower = target_role.lower()
            for key, skills in MOCK_SKILLS.items():
                if key in role_lower:
                    return skills
            return MOCK_SKILLS["default"]

        system_prompt = (
            "You are a technical skills expert. Return a JSON array of 6-10 key skills required for the given role. "
            "Only return valid JSON, no markdown, no explanation."
        )
        raw = await self.chat(system_prompt, f"Role: {target_role}", temperature=0.3)
        try:
            cleaned = raw.strip().strip("```json").strip("```").strip()
            skills = json.loads(cleaned)
            return skills if isinstance(skills, list) else MOCK_SKILLS["default"]
        except Exception:
            logger.warning("Failed to parse skill list from LLM", raw=raw[:200])
            return MOCK_SKILLS["default"]

    async def generate_learning_path(self, goal: str, course_names: list[str], level: str) -> str:
        if self.settings.MOCK_MODE:
            return MOCK_PATH_SUMMARY
        courses_str = "\n".join(f"- {c}" for c in course_names)
        system_prompt = "You are an educational advisor. Write a 2-3 sentence summary of this learning path."
        user_msg = f"Goal: {goal}\nLevel: {level}\nCourses:\n{courses_str}"
        return await self.chat(system_prompt, user_msg, temperature=0.5)

    async def generate_why_recommended(self, course_name: str, user_goal: str) -> str:
        if self.settings.MOCK_MODE:
            return f"This course directly aligns with your goal of '{user_goal}' by teaching core concepts needed at this stage."
        system_prompt = "You are an academic advisor. In one sentence, explain why this course is recommended for the user's goal."
        return await self.chat(system_prompt, f"Course: {course_name}\nGoal: {user_goal}", temperature=0.6)

    async def detect_intent(self, query: str) -> str:
        if self.settings.MOCK_MODE:
            from app.agents.advisor_agent import detect_intent
            return detect_intent(query)
        system_prompt = (
            "Classify the user query into one of: search, recommend, learning_path, skill_gap, career, clarify. "
            "Return only the single word classification."
        )
        result = await self.chat(system_prompt, query, temperature=0.0)
        valid = {"search", "recommend", "learning_path", "skill_gap", "career", "clarify"}
        intent = result.strip().lower()
        return intent if intent in valid else "search"


_llm_service: LLMService | None = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
