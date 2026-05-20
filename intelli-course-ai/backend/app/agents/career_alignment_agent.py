from app.agents.base_agent import BaseAgent
from app.agents.course_retrieval_agent import CourseRetrievalAgent
from app.config import get_settings
from app.schemas.response import CareerAlignResponse, CourseResult

CAREER_ROADMAPS = {
    "data scientist": "Start with Python and statistics fundamentals → Learn data manipulation with Pandas/SQL → Master ML algorithms → Build projects with real datasets → Learn deep learning → Specialize in NLP or Computer Vision → Deploy models with MLOps tools.",
    "machine learning engineer": "Master Python programming → Learn ML fundamentals → Deep dive into deep learning frameworks → Study software engineering best practices → Learn cloud platforms (AWS/GCP) → Master MLOps and model deployment → Build production ML pipelines.",
    "cloud architect": "Learn networking fundamentals → Get AWS/Azure/GCP associate certification → Study infrastructure as code → Master containerization (Docker/Kubernetes) → Learn security best practices → Achieve professional-level certifications → Design large-scale systems.",
    "full stack developer": "Learn HTML/CSS/JavaScript → Master React for frontend → Learn Node.js for backend → Study databases (SQL + NoSQL) → Learn REST API design → Understand CI/CD → Study system design and scalability.",
    "data engineer": "Master Python and SQL → Learn ETL pipeline design → Study Apache Spark and distributed computing → Learn cloud data services → Master Airflow for orchestration → Build data warehouses → Learn streaming with Kafka.",
    "devops engineer": "Learn Linux fundamentals → Master scripting (Bash/Python) → Study Docker and Kubernetes → Learn CI/CD pipelines → Study infrastructure as code (Terraform) → Learn monitoring and observability → Master cloud platforms.",
}

CAREER_SKILLS = {
    "data scientist": ["Python", "Machine Learning", "Statistics", "SQL", "Deep Learning", "Data Visualization"],
    "machine learning engineer": ["Python", "Deep Learning", "TensorFlow", "PyTorch", "MLOps", "Cloud Computing"],
    "cloud architect": ["AWS", "Azure", "Kubernetes", "Docker", "Terraform", "Networking"],
    "full stack developer": ["JavaScript", "React", "Node.js", "SQL", "REST APIs", "Git"],
    "data engineer": ["Python", "SQL", "Apache Spark", "Airflow", "Cloud Computing", "ETL"],
    "devops engineer": ["Docker", "Kubernetes", "CI/CD", "Linux", "Terraform", "Cloud Computing"],
}


class CareerAlignmentAgent(BaseAgent):
    """Aligns courses and skills with a specific career goal."""

    def __init__(self):
        super().__init__("CareerAlignmentAgent")
        self.retrieval_agent = CourseRetrievalAgent()

    async def run(self, input_data: dict) -> dict:
        career_goal: str = input_data.get("career_goal", "")
        current_skills: list[str] = input_data.get("current_skills", [])

        goal_lower = career_goal.lower()
        key_skills = []
        roadmap = ""
        for key in CAREER_SKILLS:
            if key in goal_lower or goal_lower in key:
                key_skills = CAREER_SKILLS[key]
                roadmap = CAREER_ROADMAPS.get(key, "")
                break

        if not key_skills:
            key_skills = ["Python", "SQL", "Cloud Computing", "Machine Learning", "Data Analysis"]
            roadmap = f"Build foundational technical skills → Specialize in {career_goal} domain → Work on real-world projects → Build a strong portfolio → Network and apply for roles."

        current_lower = {s.lower() for s in current_skills}
        matching = [s for s in key_skills if s.lower() in current_lower]
        alignment_score = round((len(matching) / len(key_skills)) * 100, 1) if key_skills else 0.0

        search_query = f"{career_goal} {' '.join(key_skills[:3])}"
        results = await self.retrieval_agent.execute({"query": search_query, "filters": {}, "top_k": 8})
        courses: list[CourseResult] = results.get("results", [])

        settings = get_settings()
        if not settings.MOCK_MODE:
            try:
                from app.services.llm_service import get_llm_service
                llm = get_llm_service()
                roadmap = await llm.chat(
                    system_prompt="You are a career counselor. Provide a concise 3-4 sentence career roadmap.",
                    user_message=f"Career goal: {career_goal}. Current skills: {', '.join(current_skills)}",
                )
            except Exception:
                pass

        response = CareerAlignResponse(
            career_goal=career_goal,
            alignment_score=alignment_score,
            aligned_courses=courses,
            career_roadmap=roadmap,
            key_skills_needed=key_skills,
            processing_time_ms=0.0,
        )
        return response.model_dump()
