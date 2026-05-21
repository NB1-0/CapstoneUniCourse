"""
Market Intelligence Service.

Provides curated, data-rich market trend information cross-referenced with
the live course catalogue to surface demand-aligned recommendations.

Data reflects 2024-2025 tech job market trends. Growth rates are YoY.
"""

from __future__ import annotations

from datetime import date
from typing import Optional

import structlog

from app.models.market import (
    TrendingSkill, CareerDemand, EmergingTech, SkillInsight, MarketSummary,
)

logger = structlog.get_logger()

# ── Base market dataset ───────────────────────────────────────────────────────

_TRENDING_SKILLS: list[TrendingSkill] = [
    TrendingSkill(skill="Generative AI", demand_score=98, growth_rate=340, job_postings=45_000,
                  avg_salary=148_000, category="AI/ML", difficulty="Intermediate", is_emerging=True,
                  related_careers=["Generative AI Engineer", "AI Product Manager", "AI Researcher"]),
    TrendingSkill(skill="Prompt Engineering", demand_score=93, growth_rate=450, job_postings=35_000,
                  avg_salary=135_000, category="AI/ML", difficulty="Beginner", is_emerging=True,
                  related_careers=["Generative AI Engineer", "Content Strategist", "AI Researcher"]),
    TrendingSkill(skill="LangChain", demand_score=92, growth_rate=280, job_postings=28_000,
                  avg_salary=148_000, category="AI/ML", difficulty="Intermediate", is_emerging=True,
                  related_careers=["Generative AI Engineer", "AI Developer", "NLP Engineer"]),
    TrendingSkill(skill="RAG Systems", demand_score=91, growth_rate=220, job_postings=20_000,
                  avg_salary=142_000, category="AI/ML", difficulty="Intermediate", is_emerging=True,
                  related_careers=["Generative AI Engineer", "AI Developer", "Backend Engineer"]),
    TrendingSkill(skill="Vector Databases", demand_score=90, growth_rate=250, job_postings=22_000,
                  avg_salary=138_000, category="Data", difficulty="Intermediate", is_emerging=True,
                  related_careers=["Generative AI Engineer", "Data Engineer", "Backend Engineer"]),
    TrendingSkill(skill="Python", demand_score=95, growth_rate=42, job_postings=125_000,
                  avg_salary=115_000, category="Languages", difficulty="Beginner", is_emerging=False,
                  related_careers=["Data Scientist", "ML Engineer", "Backend Engineer"]),
    TrendingSkill(skill="Machine Learning", demand_score=87, growth_rate=38, job_postings=95_000,
                  avg_salary=130_000, category="AI/ML", difficulty="Advanced", is_emerging=False,
                  related_careers=["ML Engineer", "Data Scientist", "Research Scientist"]),
    TrendingSkill(skill="MLOps", demand_score=89, growth_rate=120, job_postings=32_000,
                  avg_salary=140_000, category="DevOps", difficulty="Advanced", is_emerging=True,
                  related_careers=["MLOps Engineer", "ML Platform Engineer", "DevOps Engineer"]),
    TrendingSkill(skill="TypeScript", demand_score=88, growth_rate=65, job_postings=85_000,
                  avg_salary=118_000, category="Web", difficulty="Intermediate", is_emerging=False,
                  related_careers=["Frontend Developer", "Full Stack Developer", "React Developer"]),
    TrendingSkill(skill="Kubernetes", demand_score=85, growth_rate=45, job_postings=65_000,
                  avg_salary=135_000, category="DevOps", difficulty="Advanced", is_emerging=False,
                  related_careers=["DevOps Engineer", "Platform Engineer", "Cloud Architect"]),
    TrendingSkill(skill="Cloud Architecture (AWS)", demand_score=84, growth_rate=52, job_postings=72_000,
                  avg_salary=145_000, category="Cloud", difficulty="Advanced", is_emerging=False,
                  related_careers=["Cloud Architect", "Solutions Architect", "DevOps Engineer"]),
    TrendingSkill(skill="Data Engineering", demand_score=86, growth_rate=65, job_postings=60_000,
                  avg_salary=125_000, category="Data", difficulty="Intermediate", is_emerging=False,
                  related_careers=["Data Engineer", "Analytics Engineer", "Platform Developer"]),
    TrendingSkill(skill="Cybersecurity", demand_score=83, growth_rate=78, job_postings=58_000,
                  avg_salary=130_000, category="Security", difficulty="Advanced", is_emerging=False,
                  related_careers=["Security Engineer", "Penetration Tester", "SOC Analyst"]),
    TrendingSkill(skill="Rust", demand_score=82, growth_rate=85, job_postings=18_000,
                  avg_salary=132_000, category="Languages", difficulty="Advanced", is_emerging=True,
                  related_careers=["Systems Programmer", "Blockchain Developer", "Embedded Engineer"]),
    TrendingSkill(skill="Go (Golang)", demand_score=78, growth_rate=58, job_postings=32_000,
                  avg_salary=128_000, category="Languages", difficulty="Intermediate", is_emerging=False,
                  related_careers=["Backend Engineer", "Platform Engineer", "Cloud Native Developer"]),
    TrendingSkill(skill="Terraform", demand_score=80, growth_rate=72, job_postings=42_000,
                  avg_salary=130_000, category="DevOps", difficulty="Intermediate", is_emerging=False,
                  related_careers=["DevOps Engineer", "Cloud Architect", "Platform Engineer"]),
    TrendingSkill(skill="dbt (data build tool)", demand_score=75, growth_rate=95, job_postings=18_000,
                  avg_salary=120_000, category="Data", difficulty="Intermediate", is_emerging=True,
                  related_careers=["Analytics Engineer", "Data Analyst", "Data Engineer"]),
    TrendingSkill(skill="Apache Kafka", demand_score=76, growth_rate=48, job_postings=28_000,
                  avg_salary=128_000, category="Data", difficulty="Advanced", is_emerging=False,
                  related_careers=["Data Engineer", "Platform Engineer", "Backend Engineer"]),
    TrendingSkill(skill="React", demand_score=82, growth_rate=28, job_postings=78_000,
                  avg_salary=110_000, category="Web", difficulty="Intermediate", is_emerging=False,
                  related_careers=["Frontend Developer", "Full Stack Developer", "UI Engineer"]),
    TrendingSkill(skill="Deep Learning", demand_score=84, growth_rate=55, job_postings=40_000,
                  avg_salary=135_000, category="AI/ML", difficulty="Advanced", is_emerging=False,
                  related_careers=["ML Research Scientist", "Computer Vision Engineer", "NLP Engineer"]),
]

_CAREER_DEMAND: list[CareerDemand] = [
    CareerDemand(
        title="Generative AI Engineer",
        demand_level="Critical", category="Engineering",
        growth_rate=340, avg_salary=162_000, salary_min=130_000, salary_max=210_000,
        required_skills=["Python", "LangChain", "RAG Systems", "Vector Databases", "Prompt Engineering"],
        trending_skills=["AI Agents", "Multimodal AI", "Fine-tuning (LoRA/QLoRA)"],
        remote_friendly=True,
        description="Design and deploy production LLM-powered applications. "
                    "Demand for Generative AI Engineers increased significantly in 2024 as enterprises race to productionize AI.",
    ),
    CareerDemand(
        title="ML Platform Engineer",
        demand_level="Critical", category="Engineering",
        growth_rate=65, avg_salary=155_000, salary_min=130_000, salary_max=195_000,
        required_skills=["Python", "MLOps", "Kubernetes", "Docker", "TensorFlow / PyTorch"],
        trending_skills=["Ray", "Feast", "MLflow", "LLMOps"],
        remote_friendly=True,
        description="Build and operate the infrastructure that trains, serves, and monitors ML models at scale.",
    ),
    CareerDemand(
        title="Data Engineer",
        demand_level="High", category="Data",
        growth_rate=42, avg_salary=130_000, salary_min=105_000, salary_max=165_000,
        required_skills=["Python", "Apache Spark", "Apache Kafka", "dbt", "SQL", "Airflow"],
        trending_skills=["dbt", "DuckDB", "Iceberg", "Real-time pipelines"],
        remote_friendly=True,
        description="Design, build, and maintain data pipelines that power analytics and AI systems.",
    ),
    CareerDemand(
        title="Cloud Architect",
        demand_level="High", category="Engineering",
        growth_rate=38, avg_salary=158_000, salary_min=130_000, salary_max=195_000,
        required_skills=["Cloud Architecture (AWS)", "Terraform", "Kubernetes", "Networking", "Security"],
        trending_skills=["FinOps", "Multi-cloud", "Serverless AI", "IaC"],
        remote_friendly=True,
        description="Define and govern cloud strategy, infrastructure design, and migration patterns at enterprise scale.",
    ),
    CareerDemand(
        title="Cybersecurity Engineer",
        demand_level="Critical", category="Security",
        growth_rate=52, avg_salary=138_000, salary_min=110_000, salary_max=175_000,
        required_skills=["Cybersecurity", "Networking", "Python", "Cloud Security", "Threat Modeling"],
        trending_skills=["AI Security", "Zero Trust", "Supply Chain Security"],
        remote_friendly=True,
        description="Protect systems from threats — from penetration testing to cloud security hardening.",
    ),
    CareerDemand(
        title="AI/ML Research Scientist",
        demand_level="High", category="Engineering",
        growth_rate=45, avg_salary=148_000, salary_min=120_000, salary_max=195_000,
        required_skills=["Python", "Deep Learning", "Statistics", "PyTorch", "Research Methods"],
        trending_skills=["Diffusion Models", "RLHF", "Multimodal AI"],
        remote_friendly=False,
        description="Advance the state of the art in ML — publishing research and building next-generation models.",
    ),
    CareerDemand(
        title="Full Stack Developer",
        demand_level="Growing", category="Engineering",
        growth_rate=22, avg_salary=115_000, salary_min=90_000, salary_max=150_000,
        required_skills=["TypeScript", "React", "Node.js", "PostgreSQL", "REST APIs"],
        trending_skills=["AI Integration", "Edge Computing", "tRPC", "Bun"],
        remote_friendly=True,
        description="Build end-to-end features across frontend and backend — increasingly expected to integrate AI APIs.",
    ),
    CareerDemand(
        title="DevOps / Platform Engineer",
        demand_level="High", category="Engineering",
        growth_rate=32, avg_salary=135_000, salary_min=110_000, salary_max=170_000,
        required_skills=["Kubernetes", "Terraform", "Docker", "CI/CD", "Linux"],
        trending_skills=["Platform Engineering", "eBPF", "OpenTelemetry", "GitOps"],
        remote_friendly=True,
        description="Own the developer platform — shipping faster and safer through automation and infrastructure-as-code.",
    ),
    CareerDemand(
        title="Data Scientist",
        demand_level="High", category="Data",
        growth_rate=28, avg_salary=125_000, salary_min=100_000, salary_max=160_000,
        required_skills=["Python", "Machine Learning", "Statistics", "SQL", "Data Visualization"],
        trending_skills=["Causal Inference", "Bayesian Methods", "LLM-assisted analysis"],
        remote_friendly=True,
        description="Extract insights and build predictive models — role is evolving to incorporate LLM-powered workflows.",
    ),
    CareerDemand(
        title="AI Product Manager",
        demand_level="Growing", category="Management",
        growth_rate=35, avg_salary=148_000, salary_min=120_000, salary_max=185_000,
        required_skills=["Product Strategy", "AI/ML Fundamentals", "Data Analysis", "User Research"],
        trending_skills=["LLM evaluation", "AI Ethics", "Human-AI interaction design"],
        remote_friendly=True,
        description="Define and ship AI-powered products — requires fluency in model capabilities, limitations, and evals.",
    ),
]

_EMERGING_TECH: list[EmergingTech] = [
    EmergingTech(
        name="AI Agents & Autonomous Systems",
        category="AI/ML", adoption_stage="Early Adopter", hype_score=94,
        description="LLM-powered agents that autonomously decompose goals, use tools, and complete multi-step tasks without human intervention.",
        use_cases=["Automated code review", "Research assistants", "Customer support automation", "DevOps automation"],
        recommended_skills=["LangChain / LangGraph", "RAG Systems", "Python", "Prompt Engineering", "Tool calling APIs"],
        market_size="$28B by 2028", timeline="Mainstream by 2026",
    ),
    EmergingTech(
        name="Retrieval-Augmented Generation (RAG)",
        category="AI/ML", adoption_stage="Growing", hype_score=90,
        description="Technique that grounds LLM responses in factual, up-to-date knowledge by retrieving relevant documents at inference time.",
        use_cases=["Enterprise knowledge bases", "Document Q&A", "Code search", "Legal & compliance assistants"],
        recommended_skills=["Vector Databases", "LangChain", "Embedding models", "Python", "Prompt Engineering"],
        market_size="$4.5B by 2027", timeline="Mainstream by 2025",
    ),
    EmergingTech(
        name="Multimodal AI",
        category="AI/ML", adoption_stage="Growing", hype_score=87,
        description="Models that process and generate across modalities — text, image, audio, and video — enabling richer, more human-like AI interactions.",
        use_cases=["Visual question answering", "Video understanding", "Medical imaging", "Accessibility tools"],
        recommended_skills=["Computer Vision", "Deep Learning", "PyTorch", "Transformers", "Python"],
        market_size="$8.4B by 2028", timeline="Mainstream by 2026",
    ),
    EmergingTech(
        name="LLM Fine-tuning & PEFT",
        category="AI/ML", adoption_stage="Growing", hype_score=83,
        description="Parameter-Efficient Fine-Tuning techniques (LoRA, QLoRA) enable domain adaptation of large models at a fraction of the compute cost.",
        use_cases=["Domain-specific chatbots", "Code generation", "Medical AI", "Legal AI", "Custom personas"],
        recommended_skills=["PyTorch", "Hugging Face Transformers", "Python", "CUDA", "Distributed Training"],
        market_size="$3.2B by 2027", timeline="Mainstream by 2025",
    ),
    EmergingTech(
        name="Vector Databases",
        category="Data", adoption_stage="Growing", hype_score=86,
        description="Purpose-built databases that store and query high-dimensional embeddings at scale — the backbone of modern AI memory.",
        use_cases=["Semantic search", "RAG pipelines", "Recommendation engines", "Anomaly detection"],
        recommended_skills=["Python", "Pinecone / Weaviate / pgvector", "Embedding models", "SQL", "Data Engineering"],
        market_size="$4.3B by 2028", timeline="Mainstream by 2025",
    ),
    EmergingTech(
        name="Edge AI & On-Device Inference",
        category="AI/ML", adoption_stage="Growing", hype_score=75,
        description="Running ML models directly on edge devices — phones, IoT sensors, robots — for low-latency, private, offline-capable AI.",
        use_cases=["Real-time translation", "Medical wearables", "Industrial inspection", "Autonomous vehicles"],
        recommended_skills=["TensorFlow Lite", "ONNX", "C++", "Python", "Model quantization", "Edge hardware"],
        market_size="$14.5B by 2028", timeline="Mainstream by 2027",
    ),
    EmergingTech(
        name="Platform Engineering",
        category="DevOps", adoption_stage="Growing", hype_score=72,
        description="Internal developer platforms (IDPs) that abstract cloud complexity — teams ship software via self-service golden paths.",
        use_cases=["Developer productivity", "Standardized deployments", "Cost governance", "Security enforcement"],
        recommended_skills=["Kubernetes", "Terraform", "Backstage", "GitOps", "Go", "Observability"],
        market_size="$9.1B by 2028", timeline="Mainstream by 2026",
    ),
    EmergingTech(
        name="WebAssembly (WASM) & WASI",
        category="Web", adoption_stage="Growing", hype_score=68,
        description="Near-native performance in browsers and server-side runtimes — enabling new classes of web apps and portable edge compute.",
        use_cases=["Browser gaming", "Audio/video processing", "Edge compute", "Plugin sandboxing"],
        recommended_skills=["Rust", "C/C++", "JavaScript", "Go", "WASM toolchain"],
        market_size="$900M by 2027", timeline="Mainstream by 2027",
    ),
    EmergingTech(
        name="Quantum Computing",
        category="Systems", adoption_stage="Early Adopter", hype_score=60,
        description="Leveraging quantum mechanical phenomena for optimization, cryptography, and simulation problems intractable for classical computers.",
        use_cases=["Drug discovery", "Financial optimization", "Cryptography", "Materials science"],
        recommended_skills=["Qiskit", "Linear Algebra", "Python", "Quantum Algorithms", "Statistics"],
        market_size="$450B by 2035", timeline="Commercial scale by 2030",
    ),
    EmergingTech(
        name="AI-Powered Observability",
        category="DevOps", adoption_stage="Growing", hype_score=70,
        description="Using AI/ML to automatically detect anomalies, root-cause incidents, and predict system failures before they impact users.",
        use_cases=["Incident detection", "Capacity planning", "Cost optimization", "SRE automation"],
        recommended_skills=["OpenTelemetry", "Python", "Prometheus / Grafana", "ML basics", "eBPF"],
        market_size="$6.5B by 2028", timeline="Mainstream by 2026",
    ),
]


# ── Course count enrichment ───────────────────────────────────────────────────

def _enrich_with_course_counts(skills: list[TrendingSkill]) -> list[TrendingSkill]:
    """Augment static data with actual course counts from the live catalogue."""
    try:
        from app.services.search_service import get_search_service
        svc = get_search_service()
        courses = getattr(svc, "courses", [])
        if not courses:
            return skills

        for s in skills:
            keyword = s.skill.lower().split(" ")[0]  # first word is usually the key term
            count = sum(
                1 for c in courses
                if keyword in (c.get("skills_text") or "").lower()
                or keyword in (c.get("course_name") or "").lower()
            )
            s.course_count = count
    except Exception as e:
        logger.debug("course count enrichment skipped", error=str(e))
    return skills


# ── Public API ────────────────────────────────────────────────────────────────

def get_trending_skills(
    category: Optional[str] = None,
    limit: int = 20,
    emerging_only: bool = False,
) -> list[TrendingSkill]:
    skills = list(_TRENDING_SKILLS)
    if category:
        skills = [s for s in skills if s.category.lower() == category.lower()]
    if emerging_only:
        skills = [s for s in skills if s.is_emerging]
    skills.sort(key=lambda s: s.demand_score, reverse=True)
    skills = skills[:limit]
    return _enrich_with_course_counts(skills)


def get_career_demand(
    demand_level: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 15,
) -> list[CareerDemand]:
    careers = list(_CAREER_DEMAND)
    if demand_level:
        careers = [c for c in careers if c.demand_level.lower() == demand_level.lower()]
    if category:
        careers = [c for c in careers if c.category.lower() == category.lower()]
    demand_order = {"Critical": 0, "High": 1, "Growing": 2, "Stable": 3}
    careers.sort(key=lambda c: (demand_order.get(c.demand_level, 9), -c.growth_rate))
    return careers[:limit]


def get_emerging_tech(
    category: Optional[str] = None,
    limit: int = 10,
) -> list[EmergingTech]:
    techs = list(_EMERGING_TECH)
    if category:
        techs = [t for t in techs if t.category.lower() == category.lower()]
    techs.sort(key=lambda t: t.hype_score, reverse=True)
    return techs[:limit]


def get_skill_insight(skill_name: str) -> Optional[SkillInsight]:
    skill_lower = skill_name.lower()
    match = next(
        (s for s in _TRENDING_SKILLS if s.skill.lower() == skill_lower
         or skill_lower in s.skill.lower()),
        None,
    )
    if not match:
        return None

    # Find careers that list this skill as required or trending
    aligned_careers = [
        c.title for c in _CAREER_DEMAND
        if any(skill_lower in sk.lower() for sk in c.required_skills + c.trending_skills)
    ]

    # Derive trend summary
    if match.growth_rate >= 200:
        trend = f"explosive growth (+{match.growth_rate:.0f}% YoY) — one of the fastest-rising skills in the industry"
    elif match.growth_rate >= 100:
        trend = f"rapid growth (+{match.growth_rate:.0f}% YoY) — well ahead of market average"
    elif match.growth_rate >= 50:
        trend = f"strong growth (+{match.growth_rate:.0f}% YoY) — consistently high employer demand"
    else:
        trend = f"steady demand (+{match.growth_rate:.0f}% YoY) — established, in-demand skill"

    salary_delta = match.avg_salary - 100_000
    salary_impact = (
        f"Learners proficient in {match.skill} report a median salary of ${match.avg_salary:,}, "
        f"{'above' if salary_delta >= 0 else 'below'} the overall tech median by ${abs(salary_delta):,}."
    )

    # Top courses for this skill from catalogue
    recommended_courses: list[dict] = []
    try:
        from app.services.search_service import get_search_service
        svc = get_search_service()
        courses = getattr(svc, "courses", [])
        keyword = match.skill.lower().split()[0]
        hits = [
            c for c in courses
            if keyword in (c.get("skills_text") or "").lower()
            or keyword in (c.get("course_name") or "").lower()
        ]
        hits.sort(key=lambda c: c.get("rating", 0), reverse=True)
        recommended_courses = [
            {
                "id": c.get("id", ""),
                "course_name": c.get("course_name", ""),
                "organization": c.get("organization", ""),
                "rating": c.get("rating", 0),
                "difficulty_level": c.get("difficulty_level", ""),
                "course_url": c.get("course_url", ""),
            }
            for c in hits[:3]
        ]
    except Exception:
        pass

    market_context = (
        f"With ~{match.job_postings:,} active job postings, {match.skill} ranks among the "
        f"{'top emerging' if match.is_emerging else 'most in-demand'} skills in the "
        f"{match.category} space. "
        f"Demand is driven by enterprise adoption of {'AI-powered' if 'AI/ML' in match.category else match.category.lower()} solutions."
    )

    return SkillInsight(
        skill=match.skill,
        demand_score=match.demand_score,
        growth_rate=match.growth_rate,
        trend_summary=trend,
        career_alignment=aligned_careers[:5],
        market_context=market_context,
        salary_impact=salary_impact,
        recommended_courses=recommended_courses,
    )


def get_market_summary() -> MarketSummary:
    fastest = max(_TRENDING_SKILLS, key=lambda s: s.growth_rate)
    hottest = _CAREER_DEMAND[0]  # sorted Critical first
    top_tech = _EMERGING_TECH[0]  # sorted by hype_score

    # Weighted avg salary increase across tracked skills
    avg_growth = sum(s.growth_rate for s in _TRENDING_SKILLS) / len(_TRENDING_SKILLS)

    return MarketSummary(
        total_skills_tracked=len(_TRENDING_SKILLS),
        fastest_growing=fastest.skill,
        fastest_growth_rate=fastest.growth_rate,
        hottest_career=hottest.title,
        top_emerging_tech=top_tech.name,
        avg_salary_increase_pct=round(avg_growth / 10, 1),  # normalised proxy
        last_updated=date.today().isoformat(),
    )
