from app.agents.base_agent import BaseAgent
from app.agents.course_retrieval_agent import CourseRetrievalAgent
from app.config import get_settings
from app.schemas.response import LearningPathStep, LearningPathResponse, CourseResult

PHASE_DURATIONS = {
    "beginner": "4-6 weeks",
    "intermediate": "6-8 weeks",
    "advanced": "8-10 weeks",
}

PHASE_ORDER = ["beginner", "intermediate", "advanced"]

DIFFICULTY_TO_PHASE = {
    "beginner": "beginner",
    "intermediate": "intermediate",
    "advanced": "advanced",
    "mixed": "intermediate",
}


class LearningPathAgent(BaseAgent):
    """Generates a structured, phased learning path toward a learning goal."""

    def __init__(self):
        super().__init__("LearningPathAgent")
        self.retrieval_agent = CourseRetrievalAgent()
        self._llm_service = None

    @property
    def llm_service(self):
        if self._llm_service is None:
            from app.services.llm_service import get_llm_service
            self._llm_service = get_llm_service()
        return self._llm_service

    def _assign_phase(self, course: CourseResult, current_level: str) -> str:
        diff = course.difficulty_level.lower()
        phase = DIFFICULTY_TO_PHASE.get(diff, "intermediate")
        level_idx = PHASE_ORDER.index(current_level) if current_level in PHASE_ORDER else 0
        phase_idx = PHASE_ORDER.index(phase)
        if phase_idx < level_idx:
            return current_level
        return phase

    async def run(self, input_data: dict) -> dict:
        goal: str = input_data.get("goal", "")
        current_level: str = input_data.get("current_level", "beginner")
        max_courses: int = input_data.get("max_courses", 8)

        results = await self.retrieval_agent.execute({"query": goal, "filters": {}, "top_k": max_courses * 2})
        courses: list[CourseResult] = results.get("results", [])

        if not courses:
            return LearningPathResponse(
                goal=goal, total_steps=0, estimated_total_duration="N/A",
                path=[], summary="No courses found for this goal.", processing_time_ms=0.0,
            ).model_dump()

        seen_ids: set[str] = set()
        deduped: list[CourseResult] = []
        for c in courses:
            if c.id not in seen_ids:
                seen_ids.add(c.id)
                deduped.append(c)

        sorted_courses = sorted(deduped, key=lambda c: (
            PHASE_ORDER.index(DIFFICULTY_TO_PHASE.get(c.difficulty_level.lower(), "intermediate")),
            -c.rating,
        ))[:max_courses]

        path_steps: list[LearningPathStep] = []
        for i, course in enumerate(sorted_courses):
            phase = self._assign_phase(course, current_level)
            step = LearningPathStep(
                order=i + 1,
                phase=phase,
                course=course,
                skills_gained=course.skills[:5],
                reason=course.why_recommended or f"Builds foundational {phase} knowledge for {goal}.",
                estimated_duration=PHASE_DURATIONS.get(phase, "4-6 weeks"),
                prerequisites_met=(i == 0 or True),
            )
            path_steps.append(step)

        settings = get_settings()
        if not settings.MOCK_MODE and path_steps:
            try:
                summary = await self.llm_service.generate_learning_path(goal, [s.course.course_name for s in path_steps], current_level)
            except Exception:
                summary = self._default_summary(goal, path_steps)
        else:
            summary = self._default_summary(goal, path_steps)

        total_weeks = len(path_steps) * 5
        total_duration = f"{total_weeks}-{total_weeks + len(path_steps) * 2} weeks"

        response = LearningPathResponse(
            goal=goal,
            total_steps=len(path_steps),
            estimated_total_duration=total_duration,
            path=path_steps,
            summary=summary,
            processing_time_ms=0.0,
        )
        return response.model_dump()

    def _default_summary(self, goal: str, steps: list[LearningPathStep]) -> str:
        phases = sorted({s.phase for s in steps}, key=lambda p: PHASE_ORDER.index(p) if p in PHASE_ORDER else 1)
        return (
            f"Your personalized learning path to '{goal}' has {len(steps)} courses across "
            f"{len(phases)} phase(s): {', '.join(phases)}. "
            f"Start with foundational concepts and progressively build toward advanced topics."
        )
