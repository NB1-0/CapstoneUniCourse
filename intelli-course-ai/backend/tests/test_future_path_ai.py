"""
Tests for the FuturePath AI module.

Runs entirely in-memory — no external services required.
"""

import pytest

from app.future_path_ai.schemas import StudentProfile, SimulateRequest, WhatIfRequest
from app.future_path_ai.scoring import score_path, match_career, CAREER_PROFILES
from app.future_path_ai.timeline_generator import generate_paths
from app.future_path_ai.what_if import run_what_if, _parse_scenario
from app.future_path_ai.graph_builder import build_timeline_graph
from app.future_path_ai.explanation import build_explanation
from app.future_path_ai import service


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def beginner_profile():
    return StudentProfile(
        user_id="test-user-1",
        current_skills=["Python", "SQL"],
        completed_courses=[],
        target_careers=["Data Scientist", "ML Engineer"],
        weekly_learning_hours=10.0,
        preferred_difficulty="Intermediate",
        learning_pace="Moderate",
        career_priority="balance",
    )


@pytest.fixture
def advanced_profile():
    return StudentProfile(
        user_id="test-user-2",
        current_skills=["Python", "Machine Learning", "Deep Learning", "Statistics", "SQL", "Docker"],
        completed_courses=["Machine Learning Specialization"],
        target_careers=["GenAI Engineer"],
        weekly_learning_hours=20.0,
        preferred_difficulty="Advanced",
        learning_pace="Fast",
        career_priority="speed",
    )


# ── Scoring tests ─────────────────────────────────────────────────────────────

class TestScoring:

    def test_all_careers_scoreable(self, beginner_profile):
        for career_key in CAREER_PROFILES:
            result = score_path(career_key, beginner_profile)
            assert 0 <= result["success_probability"] <= 100
            assert 0 <= result["readiness_score"] <= 100
            assert result["estimated_months"] >= 1
            assert result["difficulty_risk"] in {"Low", "Medium", "High"}
            assert result["timeline_type"] in {
                "Conservative Path", "Balanced Path", "Aggressive Path", "Experimental Path"
            }

    def test_more_skills_higher_probability(self):
        low = StudentProfile(user_id="u", current_skills=[], target_careers=["Data Scientist"])
        high = StudentProfile(
            user_id="u",
            current_skills=["Python", "Statistics", "Machine Learning", "SQL", "Data Visualization"],
            target_careers=["Data Scientist"],
        )
        low_score = score_path("Data Scientist", low)
        high_score = score_path("Data Scientist", high)
        assert high_score["success_probability"] > low_score["success_probability"]

    def test_more_hours_reduces_months(self):
        few = StudentProfile(user_id="u", current_skills=[], weekly_learning_hours=5.0)
        many = StudentProfile(user_id="u", current_skills=[], weekly_learning_hours=30.0)
        few_score = score_path("Data Scientist", few)
        many_score = score_path("Data Scientist", many)
        assert many_score["estimated_months"] <= few_score["estimated_months"]

    def test_missing_skills_list(self, beginner_profile):
        result = score_path("GenAI Engineer", beginner_profile)
        assert "LangChain" in result["missing_skills"] or "RAG" in result["missing_skills"]

    def test_score_breakdown_keys(self, beginner_profile):
        result = score_path("Data Scientist", beginner_profile)
        expected_keys = {
            "prerequisite_score", "skill_match_score", "learning_capacity_score",
            "difficulty_fit_score", "career_alignment_score", "market_relevance_score",
        }
        assert expected_keys == set(result["score_breakdown"].keys())

    def test_weighted_formula_sum(self, beginner_profile):
        # Weighted scores should produce a result ≈ success_probability
        result = score_path("ML Engineer", beginner_profile)
        sb = result["score_breakdown"]
        expected = (
            0.25 * sb["prerequisite_score"]
            + 0.20 * sb["skill_match_score"]
            + 0.15 * sb["learning_capacity_score"]
            + 0.15 * sb["difficulty_fit_score"]
            + 0.15 * sb["career_alignment_score"]
            + 0.10 * sb["market_relevance_score"]
        )
        assert abs(expected - result["success_probability"]) < 1.0


class TestMatchCareer:

    def test_exact_match(self):
        assert match_career("Data Scientist") == "Data Scientist"

    def test_alias_match(self):
        assert match_career("data scientist") == "Data Scientist"
        assert match_career("genai engineer") == "GenAI Engineer"
        assert match_career("ml engineer") == "ML Engineer"

    def test_partial_match(self):
        assert match_career("ai engineer") == "GenAI Engineer"

    def test_unknown_returns_none(self):
        assert match_career("Ninja Rock Star") is None


# ── Timeline generator tests ──────────────────────────────────────────────────

class TestTimelineGenerator:

    def test_generates_paths(self, beginner_profile):
        paths = generate_paths(beginner_profile)
        assert len(paths) >= 2

    def test_paths_sorted_by_probability(self, beginner_profile):
        paths = generate_paths(beginner_profile)
        probs = [p.success_probability for p in paths]
        assert probs == sorted(probs, reverse=True)

    def test_target_career_in_paths(self, beginner_profile):
        paths = generate_paths(beginner_profile)
        career_goals = {p.career_goal for p in paths}
        assert "Data Scientist" in career_goals

    def test_advanced_profile_fewer_missing_skills(self, advanced_profile):
        paths = generate_paths(advanced_profile)
        genai_path = next((p for p in paths if p.career_goal == "GenAI Engineer"), None)
        assert genai_path is not None
        assert len(genai_path.missing_skills) < 6  # has most prereqs

    def test_roadmap_steps_ordered(self, beginner_profile):
        paths = generate_paths(beginner_profile)
        for path in paths:
            steps = path.roadmap_steps
            for i, step in enumerate(steps):
                assert step.step == i + 1

    def test_path_has_explanation(self, beginner_profile):
        paths = generate_paths(beginner_profile)
        for p in paths:
            assert len(p.explanation) > 50

    def test_path_fields_present(self, beginner_profile):
        paths = generate_paths(beginner_profile)
        for p in paths:
            assert p.path_id
            assert p.career_goal
            assert 0 <= p.success_probability <= 100
            assert 0 <= p.readiness_score <= 100
            assert p.estimated_months >= 1
            assert p.difficulty_risk in {"Low", "Medium", "High"}


# ── What-If engine tests ──────────────────────────────────────────────────────

class TestWhatIf:

    def test_more_hours_improves_probability(self, beginner_profile):
        base = score_path("Data Scientist", beginner_profile)
        result = run_what_if("increase_weekly_hours_to_25", beginner_profile, "Data Scientist")
        assert result.after_metrics.success_probability >= result.before_metrics.success_probability

    def test_more_hours_reduces_months(self, beginner_profile):
        result = run_what_if("study 30 hours", beginner_profile, "Data Scientist")
        assert result.after_metrics.estimated_months <= result.before_metrics.estimated_months

    def test_skip_skill_reduces_probability(self):
        profile = StudentProfile(
            user_id="u",
            current_skills=["Python", "Statistics", "Machine Learning"],
            target_careers=["ML Engineer"],
            weekly_learning_hours=10.0,
        )
        result = run_what_if("skip Statistics", profile, "ML Engineer")
        assert result.delta_probability <= 0

    def test_add_skill_improves(self, beginner_profile):
        result = run_what_if("already know Machine Learning", beginner_profile, "Data Scientist")
        assert result.delta_probability >= 0

    def test_response_has_all_fields(self, beginner_profile):
        result = run_what_if("accelerated pace", beginner_profile, "ML Engineer")
        assert result.scenario
        assert result.explanation
        assert result.before_metrics
        assert result.after_metrics
        assert result.risk_change in {"Increased", "Decreased", "Unchanged"}
        assert result.recommendation
        assert result.processing_time_ms > 0

    def test_scenario_parsing_hours(self, beginner_profile):
        new_profile, desc = _parse_scenario("increase_weekly_hours_to_20", beginner_profile)
        assert new_profile.weekly_learning_hours == 20.0
        assert "20" in desc

    def test_scenario_parsing_skip(self, beginner_profile):
        new_profile, desc = _parse_scenario("skip sql", beginner_profile)
        assert "SQL" not in new_profile.current_skills
        assert "sql" in desc

    def test_scenario_parsing_choose(self, beginner_profile):
        new_profile, desc = _parse_scenario("choose GenAI Engineer", beginner_profile)
        assert "GenAI Engineer" in new_profile.target_careers


# ── Graph builder tests ───────────────────────────────────────────────────────

class TestGraphBuilder:

    def test_graph_has_start_and_outcome(self, beginner_profile):
        paths = generate_paths(beginner_profile)
        graph = build_timeline_graph(paths[0])
        node_ids = {n["id"] for n in graph["nodes"]}
        assert "start" in node_ids
        assert "outcome" in node_ids

    def test_edges_connect_all_nodes(self, beginner_profile):
        paths = generate_paths(beginner_profile)
        graph = build_timeline_graph(paths[0])
        sources = {e["source"] for e in graph["edges"]}
        targets = {e["target"] for e in graph["edges"]}
        assert "start" in sources
        assert "outcome" in targets

    def test_graph_path_id_matches(self, beginner_profile):
        paths = generate_paths(beginner_profile)
        path = paths[0]
        graph = build_timeline_graph(path)
        assert graph["path_id"] == path.path_id


# ── Service integration tests ─────────────────────────────────────────────────

class TestService:

    def test_simulate_returns_response(self):
        req = SimulateRequest(
            user_id="svc-test-1",
            current_skills=["Python"],
            target_careers=["Data Scientist"],
            weekly_learning_hours=10.0,
        )
        resp = service.simulate(req)
        assert resp.simulation_id
        assert len(resp.paths) >= 2
        assert resp.summary
        assert resp.processing_time_ms > 0

    def test_history_after_simulate(self):
        req = SimulateRequest(
            user_id="history-test-user",
            current_skills=["Python"],
            target_careers=["ML Engineer"],
        )
        service.simulate(req)
        history = service.get_history("history-test-user")
        assert history.total >= 1
        assert history.simulations[0].path_count >= 1

    def test_what_if_without_base_simulation(self):
        req = WhatIfRequest(
            user_id="no-history-user",
            base_simulation_id="nonexistent-id",
            scenario_change="study 15 hours",
        )
        resp = service.what_if(req)
        assert resp.scenario
        assert resp.before_metrics
        assert resp.after_metrics

    def test_get_graph_returns_data(self):
        req = SimulateRequest(
            user_id="graph-test-user",
            current_skills=["Python"],
            target_careers=["Data Scientist"],
        )
        resp = service.simulate(req)
        path = resp.paths[0]
        graph = service.get_graph("graph-test-user", resp.simulation_id, path.path_id)
        assert graph is not None
        assert "nodes" in graph
        assert "edges" in graph

    def test_get_graph_nonexistent_returns_none(self):
        graph = service.get_graph("nobody", "bad-sim", "bad-path")
        assert graph is None
