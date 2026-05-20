"""API integration tests for IntelliCourse AI backend (mock mode)."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def load_sample_data_sync():
    """Load sample data before tests run."""
    import asyncio
    from app.ingestion.ingest import load_sample_data
    asyncio.get_event_loop().run_until_complete(load_sample_data())


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "services" in data


def test_list_courses():
    response = client.get("/api/courses")
    assert response.status_code == 200
    data = response.json()
    assert "courses" in data
    assert "total" in data
    assert data["total"] > 0


def test_list_courses_with_filters():
    response = client.get("/api/courses?difficulty=Beginner&page=1&page_size=5")
    assert response.status_code == 200
    data = response.json()
    for course in data["courses"]:
        assert course["difficulty_level"] == "Beginner"


def test_search_courses():
    response = client.post("/api/search", json={"query": "machine learning Python", "top_k": 5})
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 0
    assert "processing_time_ms" in data


def test_search_empty_query():
    response = client.post("/api/search", json={"query": ""})
    assert response.status_code == 422


def test_recommend_courses():
    response = client.post("/api/recommend", json={
        "user_goals": "Become a data scientist",
        "current_skills": ["Python", "SQL"],
        "target_skills": ["Machine Learning", "Deep Learning"],
    })
    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data
    assert "total" in data


def test_learning_path():
    response = client.post("/api/learning-path", json={
        "goal": "Become a machine learning engineer",
        "current_level": "beginner",
        "max_courses": 5,
    })
    assert response.status_code == 200
    data = response.json()
    assert "path" in data
    assert "total_steps" in data
    assert data["total_steps"] >= 0


def test_skill_gap():
    response = client.post("/api/skill-gap", json={
        "target_role": "Data Scientist",
        "current_skills": ["Python", "SQL"],
    })
    assert response.status_code == 200
    data = response.json()
    assert "skill_gaps" in data
    assert "readiness_score" in data
    assert 0 <= data["readiness_score"] <= 100


def test_career_align():
    response = client.post("/api/career-align", json={
        "career_goal": "Machine Learning Engineer",
        "current_skills": ["Python", "TensorFlow"],
    })
    assert response.status_code == 200
    data = response.json()
    assert "career_goal" in data
    assert "alignment_score" in data
    assert "aligned_courses" in data


def test_ingest_sample():
    response = client.post("/api/ingest", json={"source": "sample"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["courses_ingested"] > 0
