"""Evaluation scripts for IntelliCourse AI recommendation quality."""
import asyncio
from typing import Any

import structlog

from app.schemas.response import CourseResult, SearchResponse, LearningPathResponse

logger = structlog.get_logger()

TEST_CASES = [
    {"query": "I want to learn machine learning from scratch", "expected_skills": ["Python", "Machine Learning", "Statistics"], "expected_difficulty": "Beginner"},
    {"query": "career transition to data engineer", "expected_skills": ["SQL", "Python", "Apache Spark", "Data Engineering"]},
    {"query": "deep learning for computer vision", "expected_skills": ["Deep Learning", "TensorFlow", "Computer Vision", "CNNs"]},
    {"query": "natural language processing with transformers", "expected_skills": ["NLP", "Transformers", "Python", "BERT"]},
    {"query": "cloud computing on AWS", "expected_skills": ["AWS", "Cloud Computing"]},
    {"query": "full stack web development React Node", "expected_skills": ["React", "Node.js", "JavaScript"]},
    {"query": "data visualization Tableau dashboards", "expected_skills": ["Tableau", "Data Visualization"]},
    {"query": "MLOps machine learning deployment", "expected_skills": ["MLOps", "Docker", "Kubernetes"]},
]


def compute_skill_overlap(result_skills: list[str], expected_skills: list[str]) -> float:
    if not expected_skills:
        return 1.0
    result_lower = {s.lower() for s in result_skills}
    matched = sum(1 for e in expected_skills if any(e.lower() in r for r in result_lower))
    return round(matched / len(expected_skills), 3)


async def evaluate_search_relevance(query: str, results: list[CourseResult]) -> dict[str, Any]:
    if not results:
        return {"relevance_score": 0.0, "diversity_score": 0.0, "avg_rating": 0.0, "result_count": 0}

    avg_relevance = sum(r.relevance_score for r in results) / len(results)

    all_skills: set[str] = set()
    for r in results:
        all_skills.update(r.skills)
    diversity_score = min(1.0, len(all_skills) / (len(results) * 3)) if results else 0.0

    avg_rating = sum(r.rating for r in results) / len(results)

    return {
        "relevance_score": round(avg_relevance, 3),
        "diversity_score": round(diversity_score, 3),
        "avg_rating": round(avg_rating, 3),
        "result_count": len(results),
    }


async def evaluate_recommendation_quality(results: list[CourseResult], user_goals: str, expected_skills: list[str] | None = None) -> dict[str, Any]:
    if not results:
        return {"skill_coverage": 0.0, "prerequisite_validity": 1.0, "avg_relevance": 0.0}

    all_skills = []
    for r in results:
        all_skills.extend(r.skills)
    all_skills_set = {s.lower() for s in all_skills}

    skill_coverage = compute_skill_overlap(list(all_skills_set), expected_skills or [])

    from app.services.search_service import get_search_service
    svc = get_search_service()
    indexed_names_lower = {c.course_name.lower() for c in svc.courses}
    prereq_valid = 0
    prereq_total = 0
    for r in results:
        for prereq in r.prerequisites:
            prereq_total += 1
            if any(prereq.lower() in name for name in indexed_names_lower):
                prereq_valid += 1
    prereq_validity = (prereq_valid / prereq_total) if prereq_total > 0 else 1.0

    avg_relevance = sum(r.relevance_score for r in results) / len(results)

    return {
        "skill_coverage": round(skill_coverage, 3),
        "prerequisite_validity": round(prereq_validity, 3),
        "avg_relevance": round(avg_relevance, 3),
    }


async def run_evaluation_suite(test_cases: list[dict] | None = None) -> dict[str, Any]:
    cases = test_cases or TEST_CASES
    from app.agents.course_retrieval_agent import CourseRetrievalAgent
    agent = CourseRetrievalAgent()

    results_summary = []
    total_relevance = 0.0
    total_skill_coverage = 0.0

    for case in cases:
        query = case["query"]
        expected_skills = case.get("expected_skills", [])
        try:
            agent_result = await agent.execute({"query": query, "filters": {}, "top_k": 10})
            results: list[CourseResult] = agent_result.get("results", [])
            search_eval = await evaluate_search_relevance(query, results)
            rec_eval = await evaluate_recommendation_quality(results, query, expected_skills)

            case_result = {
                "query": query,
                **search_eval,
                **rec_eval,
                "pass": search_eval["result_count"] > 0 and search_eval["relevance_score"] > 0.3,
            }
            results_summary.append(case_result)
            total_relevance += search_eval["relevance_score"]
            total_skill_coverage += rec_eval["skill_coverage"]
        except Exception as e:
            results_summary.append({"query": query, "error": str(e), "pass": False})

    passing = sum(1 for r in results_summary if r.get("pass", False))
    report = {
        "total_cases": len(cases),
        "passing": passing,
        "pass_rate": round(passing / len(cases), 3) if cases else 0.0,
        "avg_relevance_score": round(total_relevance / len(cases), 3) if cases else 0.0,
        "avg_skill_coverage": round(total_skill_coverage / len(cases), 3) if cases else 0.0,
        "case_results": results_summary,
    }
    logger.info("Evaluation complete", **{k: v for k, v in report.items() if k != "case_results"})
    return report


if __name__ == "__main__":
    async def main():
        from app.ingestion.ingest import load_sample_data
        await load_sample_data()
        report = await run_evaluation_suite()
        import json
        print(json.dumps(report, indent=2))

    asyncio.run(main())
