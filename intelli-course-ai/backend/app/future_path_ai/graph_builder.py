"""
Builds React Flow compatible timeline graph JSON from a FutureCareerPath.

Graph layout:
  [You Today] → [Step 1] → [Step 2] → ... → [Career Outcome]

Nodes carry display data in `data`; edges are animated.
"""

from __future__ import annotations

from app.future_path_ai.schemas import FutureCareerPath

_PHASE_STYLES = {
    "Foundation":   {"background": "#ede9fe", "color": "#5b21b6", "border": "1px solid #c4b5fd", "borderRadius": "10px", "fontSize": "11px", "fontWeight": "600"},
    "Core Skills":  {"background": "#dbeafe", "color": "#1e40af", "border": "1px solid #93c5fd", "borderRadius": "10px", "fontSize": "11px", "fontWeight": "600"},
    "Advanced":     {"background": "#fef3c7", "color": "#92400e", "border": "1px solid #fcd34d", "borderRadius": "10px", "fontSize": "11px", "fontWeight": "600"},
    "Career Ready": {"background": "#d1fae5", "color": "#065f46", "border": "1px solid #6ee7b7", "borderRadius": "10px", "fontSize": "11px", "fontWeight": "600"},
}


def build_timeline_graph(path: FutureCareerPath) -> dict:
    """Return a {nodes, edges, path_id} dict compatible with React Flow."""
    nodes: list[dict] = []
    edges: list[dict] = []

    # ── Start node ──────────────────────────────────────────────────────────
    nodes.append({
        "id": "start",
        "type": "input",
        "data": {"label": "You Today", "subLabel": f"{len(path.missing_skills)} skills to acquire", "nodeType": "start"},
        "position": {"x": 0, "y": 180},
        "style": {
            "background": "linear-gradient(135deg, #4f46e5, #7c3aed)",
            "color": "#fff",
            "borderRadius": "12px",
            "border": "none",
            "padding": "10px 16px",
            "fontWeight": "700",
            "fontSize": "13px",
            "minWidth": "120px",
            "textAlign": "center",
        },
    })

    x_step = 190
    x = x_step
    prev_id = "start"

    # ── Roadmap step nodes ───────────────────────────────────────────────────
    for i, step in enumerate(path.roadmap_steps):
        node_id = f"step-{step.step}"
        y_offset = 80 if i % 2 == 0 else 280  # staggered rows

        nodes.append({
            "id": node_id,
            "data": {
                "label": step.skill,
                "subLabel": step.course_name[:38] + ("…" if len(step.course_name) > 38 else ""),
                "phase": step.phase,
                "weeks": step.estimated_weeks,
                "nodeType": "step",
            },
            "position": {"x": x, "y": y_offset},
            "style": _PHASE_STYLES.get(step.phase, {"borderRadius": "10px"}),
        })

        edges.append({
            "id": f"e-{prev_id}-{node_id}",
            "source": prev_id,
            "target": node_id,
            "animated": True,
            "style": {"stroke": "#6366f1", "strokeWidth": 2},
        })
        prev_id = node_id
        x += x_step

    # ── Career outcome node ──────────────────────────────────────────────────
    nodes.append({
        "id": "outcome",
        "type": "output",
        "data": {
            "label": path.career_goal,
            "subLabel": f"{path.success_probability:.0f}% · {path.estimated_months}mo",
            "nodeType": "outcome",
        },
        "position": {"x": x, "y": 180},
        "style": {
            "background": "linear-gradient(135deg, #059669, #047857)",
            "color": "#fff",
            "borderRadius": "12px",
            "border": "none",
            "padding": "10px 16px",
            "fontWeight": "700",
            "fontSize": "13px",
            "minWidth": "130px",
            "textAlign": "center",
        },
    })
    edges.append({
        "id": f"e-{prev_id}-outcome",
        "source": prev_id,
        "target": "outcome",
        "animated": True,
        "style": {"stroke": "#059669", "strokeWidth": 2},
    })

    return {
        "path_id": path.path_id,
        "career_goal": path.career_goal,
        "nodes": nodes,
        "edges": edges,
    }
