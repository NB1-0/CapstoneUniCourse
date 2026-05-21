"""
In-memory knowledge graph — production fallback when Neo4j is unavailable.
Implements BFS pathfinding, neighbour traversal, and recommendation queries
using plain Python data structures (no external dependencies).
"""

from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any

import structlog

logger = structlog.get_logger()


@dataclass
class GraphNode:
    id: str
    type: str
    properties: dict[str, Any] = field(default_factory=dict)

    def label(self) -> str:
        return (
            self.properties.get("name")
            or self.properties.get("title")
            or self.id
        )


@dataclass
class GraphEdge:
    source: str
    target: str
    rel_type: str
    properties: dict[str, Any] = field(default_factory=dict)


class InMemoryGraph:
    """
    Directed property graph with efficient adjacency-list storage.
    Supports BFS shortest path, neighbour expansion, and skill-coverage scoring.
    """

    def __init__(self):
        self._nodes: dict[str, GraphNode] = {}
        self._edges: list[GraphEdge] = []
        # adjacency: node_id → list of (target_id, rel_type)
        self._out: dict[str, list[tuple[str, str]]] = defaultdict(list)
        # reverse adjacency: node_id → list of (source_id, rel_type)
        self._in: dict[str, list[tuple[str, str]]] = defaultdict(list)

    # ------------------------------------------------------------------ #
    # Mutation                                                             #
    # ------------------------------------------------------------------ #

    def add_node(self, node_id: str, node_type: str, properties: dict) -> None:
        if node_id not in self._nodes:
            self._nodes[node_id] = GraphNode(id=node_id, type=node_type, properties=properties)

    def add_edge(
        self, source_id: str, target_id: str, rel_type: str, properties: dict | None = None
    ) -> None:
        edge = GraphEdge(source_id, target_id, rel_type, properties or {})
        self._edges.append(edge)
        self._out[source_id].append((target_id, rel_type))
        self._in[target_id].append((source_id, rel_type))

    def clear(self) -> None:
        self._nodes.clear()
        self._edges.clear()
        self._out.clear()
        self._in.clear()

    # ------------------------------------------------------------------ #
    # Queries                                                              #
    # ------------------------------------------------------------------ #

    def node(self, node_id: str) -> GraphNode | None:
        return self._nodes.get(node_id)

    def nodes_by_type(self, node_type: str) -> list[GraphNode]:
        return [n for n in self._nodes.values() if n.type == node_type]

    def out_neighbours(
        self, node_id: str, rel_types: list[str] | None = None
    ) -> list[tuple[GraphNode, str]]:
        """Return (neighbour_node, rel_type) pairs reachable from node_id."""
        result = []
        for target_id, rel_type in self._out.get(node_id, []):
            if rel_types is None or rel_type in rel_types:
                node = self._nodes.get(target_id)
                if node:
                    result.append((node, rel_type))
        return result

    def in_neighbours(
        self, node_id: str, rel_types: list[str] | None = None
    ) -> list[tuple[GraphNode, str]]:
        """Return (neighbour_node, rel_type) pairs that point INTO node_id."""
        result = []
        for source_id, rel_type in self._in.get(node_id, []):
            if rel_types is None or rel_type in rel_types:
                node = self._nodes.get(source_id)
                if node:
                    result.append((node, rel_type))
        return result

    def bfs_path(
        self,
        start_id: str,
        end_id: str,
        rel_types: list[str] | None = None,
        max_depth: int = 8,
    ) -> list[tuple[GraphNode, str | None]]:
        """
        BFS shortest path from start to end following directed edges.
        Returns list of (node, incoming_rel_type) pairs.  First element has rel=None.
        """
        if start_id not in self._nodes or end_id not in self._nodes:
            return []
        if start_id == end_id:
            return [(self._nodes[start_id], None)]

        visited = {start_id}
        # queue entries: list of (node_id, rel_used_to_arrive)
        queue: deque[list[tuple[str, str | None]]] = deque()
        queue.append([(start_id, None)])

        while queue:
            path = queue.popleft()
            if len(path) > max_depth:
                break
            current_id, _ = path[-1]

            for target_id, rel_type in self._out.get(current_id, []):
                if rel_types and rel_type not in rel_types:
                    continue
                if target_id in visited:
                    continue
                new_path = path + [(target_id, rel_type)]
                if target_id == end_id:
                    return [
                        (self._nodes[nid], rt)
                        for nid, rt in new_path
                        if nid in self._nodes
                    ]
                visited.add(target_id)
                queue.append(new_path)

        return []

    def reachable_skills(
        self, start_skill_id: str, max_depth: int = 4
    ) -> list[tuple[GraphNode, int]]:
        """
        Return all skills reachable from start via ADVANCES_TO / LEADS_TO edges,
        with their BFS depth (a proxy for learning distance).
        """
        TRAVERSE_RELS = {"ADVANCES_TO", "LEADS_TO"}
        visited: dict[str, int] = {start_skill_id: 0}
        queue: deque[tuple[str, int]] = deque([(start_skill_id, 0)])
        result: list[tuple[GraphNode, int]] = []

        while queue:
            current_id, depth = queue.popleft()
            if depth >= max_depth:
                continue
            for target_id, rel_type in self._out.get(current_id, []):
                if rel_type not in TRAVERSE_RELS:
                    continue
                if target_id in visited:
                    continue
                visited[target_id] = depth + 1
                node = self._nodes.get(target_id)
                if node and node.type == "Skill":
                    result.append((node, depth + 1))
                    queue.append((target_id, depth + 1))

        return result

    def courses_teaching_skill(self, skill_name: str) -> list[GraphNode]:
        """Return all Course nodes that TEACH a given skill name."""
        skill_id = f"skill:{skill_name.lower()}"
        courses: list[GraphNode] = []
        for source_id, rel_type in self._in.get(skill_id, []):
            if rel_type == "TEACHES":
                node = self._nodes.get(source_id)
                if node and node.type == "Course":
                    courses.append(node)
        return sorted(courses, key=lambda n: n.properties.get("rating", 0), reverse=True)

    def skills_for_career(self, career_title: str) -> list[str]:
        """Return skill names required by a career node."""
        career_id = f"career:{career_title.lower().replace(' ', '_')}"
        skills: list[str] = []
        for target_id, rel_type in self._out.get(career_id, []):
            if rel_type == "REQUIRES":
                node = self._nodes.get(target_id)
                if node:
                    skills.append(node.properties.get("name", ""))
        return skills

    def graph_distance(self, skill_a: str, skill_b: str) -> int:
        """Return BFS distance between two skills (INT_MAX if unreachable)."""
        path = self.bfs_path(
            f"skill:{skill_a.lower()}",
            f"skill:{skill_b.lower()}",
            rel_types=["ADVANCES_TO", "LEADS_TO", "RELATED_TO"],
            max_depth=6,
        )
        return len(path) - 1 if path else 999

    def score_course_for_skills(
        self, course_id: str, target_skills: list[str]
    ) -> float:
        """
        Compute a graph-based relevance score for a course given target skills.
        Score = fraction of target skills the course teaches + teaches adjacent skills.
        """
        course_node = self._nodes.get(f"course:{course_id}")
        if not course_node:
            return 0.0

        taught_skills: set[str] = set()
        for target_id, rel_type in self._out.get(f"course:{course_id}", []):
            if rel_type == "TEACHES":
                node = self._nodes.get(target_id)
                if node:
                    taught_skills.add(node.properties["name"].lower())

        target_lower = {s.lower() for s in target_skills}
        direct_hits = len(taught_skills & target_lower)
        # Each adjacent skill (depth-1 reachable) adds a half-point bonus
        adjacent_hits = sum(
            0.5
            for ts in target_lower
            if any(
                self.graph_distance(s, ts) == 1
                for s in taught_skills
            )
        )
        total = len(target_lower) or 1
        return min(1.0, (direct_hits + adjacent_hits) / total)

    # ------------------------------------------------------------------ #
    # Serialisation (for API responses)                                    #
    # ------------------------------------------------------------------ #

    def to_viz_data(
        self,
        max_nodes: int = 300,
        node_types: list[str] | None = None,
    ) -> dict:
        """Return JSON-serialisable {nodes, edges} for the frontend graph visualiser."""
        selected_nodes = [
            n for n in self._nodes.values()
            if node_types is None or n.type in node_types
        ][:max_nodes]
        node_ids = {n.id for n in selected_nodes}

        selected_edges = [
            e for e in self._edges
            if e.source in node_ids and e.target in node_ids
        ]

        return {
            "nodes": [
                {
                    "id": n.id,
                    "label": n.label(),
                    "type": n.type,
                    "properties": n.properties,
                }
                for n in selected_nodes
            ],
            "edges": [
                {
                    "source": e.source,
                    "target": e.target,
                    "type": e.rel_type,
                }
                for e in selected_edges
            ],
            "stats": {
                "total_nodes": len(self._nodes),
                "total_edges": len(self._edges),
                "returned_nodes": len(selected_nodes),
                "returned_edges": len(selected_edges),
            },
        }

    def stats(self) -> dict:
        type_counts: dict[str, int] = defaultdict(int)
        for n in self._nodes.values():
            type_counts[n.type] += 1
        rel_counts: dict[str, int] = defaultdict(int)
        for e in self._edges:
            rel_counts[e.rel_type] += 1
        return {
            "total_nodes": len(self._nodes),
            "total_edges": len(self._edges),
            "nodes_by_type": dict(type_counts),
            "edges_by_type": dict(rel_counts),
        }
