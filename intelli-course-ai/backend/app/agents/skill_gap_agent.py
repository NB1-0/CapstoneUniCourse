from app.agents.base_agent import BaseAgent
from app.agents.course_retrieval_agent import CourseRetrievalAgent
from app.config import get_settings
from app.schemas.response import SkillGapItem, SkillGapResponse, CourseResult

ROLE_SKILLS_MAP = {
    "data scientist": ["Python", "Machine Learning", "Statistics", "SQL", "Data Visualization", "Pandas", "Scikit-learn", "Deep Learning"],
    "machine learning engineer": ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "MLOps", "Docker", "Cloud Computing"],
    "data engineer": ["Python", "SQL", "Apache Spark", "Hadoop", "ETL", "Data Pipelines", "Cloud Computing", "Airflow"],
    "software engineer": ["Data Structures", "Algorithms", "Python", "System Design", "APIs", "Git", "Testing", "SQL"],
    "cloud architect": ["AWS", "Azure", "GCP", "Kubernetes", "Docker", "Networking", "Security", "IaC"],
    "nlp engineer": ["Python", "NLP", "Deep Learning", "Transformers", "BERT", "Text Processing", "PyTorch"],
    "computer vision engineer": ["Python", "Deep Learning", "Computer Vision", "OpenCV", "PyTorch", "CNNs"],
    "business analyst": ["SQL", "Excel", "Data Visualization", "Tableau", "Power BI", "Statistics", "Business Intelligence"],
    "devops engineer": ["Docker", "Kubernetes", "CI/CD", "Linux", "Cloud Computing", "Ansible", "Terraform"],
    "full stack developer": ["JavaScript", "React", "Node.js", "Python", "SQL", "REST APIs", "Git", "HTML/CSS"],
}

SKILL_IMPORTANCE = {
    "critical": ["Python", "SQL", "Machine Learning", "Deep Learning", "Cloud Computing"],
    "important": ["Data Visualization", "Statistics", "Docker", "Git", "APIs"],
}


class SkillGapAgent(BaseAgent):
    """Analyzes the gap between current skills and target role requirements."""

    def __init__(self):
        super().__init__("SkillGapAgent")
        self.retrieval_agent = CourseRetrievalAgent()
        self._llm_service = None

    @property
    def llm_service(self):
        if self._llm_service is None:
            from app.services.llm_service import get_llm_service
            self._llm_service = get_llm_service()
        return self._llm_service

    def _get_required_skills(self, target_role: str) -> list[str]:
        role_lower = target_role.lower()
        for key, skills in ROLE_SKILLS_MAP.items():
            if key in role_lower or role_lower in key:
                return skills
        return ["Python", "SQL", "Statistics", "Data Analysis", "Machine Learning", "Cloud Computing"]

    def _skill_importance(self, skill: str) -> str:
        for importance, skills in SKILL_IMPORTANCE.items():
            if any(s.lower() in skill.lower() for s in skills):
                return importance
        return "nice-to-have"

    async def run(self, input_data: dict) -> dict:
        target_role: str = input_data.get("target_role", "")
        current_skills: list[str] = input_data.get("current_skills", [])

        settings = get_settings()
        if not settings.MOCK_MODE:
            try:
                required_skills = await self.llm_service.analyze_skills(target_role)
            except Exception:
                required_skills = self._get_required_skills(target_role)
        else:
            required_skills = self._get_required_skills(target_role)

        current_lower = {s.lower() for s in current_skills}
        missing_skills = [s for s in required_skills if s.lower() not in current_lower]

        skill_gaps: list[SkillGapItem] = []
        for skill in required_skills:
            have = skill.lower() in current_lower
            courses: list[CourseResult] = []
            if not have:
                courses = await self.retrieval_agent.retrieve_for_skill(skill, top_k=2)
            skill_gaps.append(SkillGapItem(
                skill=skill,
                have=have,
                importance=self._skill_importance(skill),
                courses_to_fill_gap=courses,
            ))

        have_count = sum(1 for sg in skill_gaps if sg.have)
        readiness_score = round((have_count / len(skill_gaps)) * 100, 1) if skill_gaps else 0.0

        recommendation = (
            f"You have {have_count}/{len(required_skills)} required skills for {target_role}. "
            f"Focus on: {', '.join(missing_skills[:3])}." if missing_skills
            else f"Great news! You already have all the key skills for {target_role}."
        )

        response = SkillGapResponse(
            target_role=target_role,
            required_skills=required_skills,
            current_skills=current_skills,
            missing_skills=missing_skills,
            skill_gaps=skill_gaps,
            readiness_score=readiness_score,
            recommendation=recommendation,
            processing_time_ms=0.0,
        )
        return response.model_dump()
