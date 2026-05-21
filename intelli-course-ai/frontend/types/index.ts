export interface CourseResult {
  id: string
  course_name: string
  organization: string
  description: string
  skills: string[]
  difficulty_level: string
  rating: number
  matched_skills: string[]
  relevance_score: number
  why_recommended: string
  prerequisites: string[]
  next_course_suggestion?: string
  course_url?: string
  certificate_type?: string
  students_enrolled?: number
}

export interface SearchResponse {
  query: string
  results: CourseResult[]
  total: number
  clarification_needed: boolean
  clarification_question?: string
  processing_time_ms: number
}

export interface RecommendResponse {
  recommendations: CourseResult[]
  rationale: string
  total: number
  processing_time_ms: number
}

export interface LearningPathStep {
  order: number
  phase: string
  course: CourseResult
  skills_gained: string[]
  reason: string
  estimated_duration: string
  prerequisites_met: boolean
}

export interface LearningPathResponse {
  goal: string
  total_steps: number
  estimated_total_duration: string
  path: LearningPathStep[]
  summary: string
  processing_time_ms: number
}

export interface SkillGapItem {
  skill: string
  have: boolean
  importance: 'critical' | 'important' | 'nice-to-have'
  courses_to_fill_gap: CourseResult[]
}

export interface SkillGapResponse {
  target_role: string
  required_skills: string[]
  current_skills: string[]
  missing_skills: string[]
  skill_gaps: SkillGapItem[]
  readiness_score: number
  recommendation: string
  processing_time_ms: number
}

export interface CareerAlignResponse {
  career_goal: string
  alignment_score: number
  aligned_courses: CourseResult[]
  career_roadmap: string
  key_skills_needed: string[]
  processing_time_ms: number
}

export interface CoursesListResponse {
  courses: CourseResult[]
  total: number
  page: number
  page_size: number
}

export interface HealthResponse {
  status: string
  version: string
  mock_mode: boolean
  services: Record<string, string>
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  results?: CourseResult[]
  timestamp: Date
}

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Mixed'
export type Phase = 'beginner' | 'intermediate' | 'advanced'
export type NavItem = { label: string; href: string; icon: string }

// ── Graph / GraphRAG types ─────────────────────────────────────────────────

export interface VizNode {
  id: string
  label: string
  type: 'Course' | 'Skill' | 'Career' | 'Domain' | 'LearningLevel' | string
  properties: Record<string, unknown>
}

export interface VizEdge {
  source: string
  target: string
  type: string
}

export interface GraphStats {
  total_nodes: number
  total_edges: number
  nodes_by_type: Record<string, number>
  edges_by_type: Record<string, number>
  neo4j_active: boolean
}

export interface GraphExploreData {
  nodes: VizNode[]
  edges: VizEdge[]
  stats: Record<string, number>
  processing_time_ms: number
}

export interface GraphCourseResult {
  id: string
  course_name: string
  organization: string
  difficulty_level: string
  rating: number
  skills: string[]
  course_url: string
  relevance_score: number
  graph_score: number
  hybrid_score: number
  why_recommended: string
  students_enrolled: number
}

export interface SkillStep {
  skill: string
  rel_type: string | null
  depth: number
  courses: Array<{
    id: string
    course_name: string
    organization: string
    difficulty_level: string
    rating: number
    course_url: string
  }>
  estimated_weeks: number
}

export interface SkillPathResponse {
  from_skill: string
  to_skill: string
  path_found: boolean
  path: SkillStep[]
  total_steps: number
  estimated_weeks: number
  processing_time_ms: number
}

export interface CareerSkillGap {
  skill: string
  have: boolean
  importance: 'critical' | 'important' | 'nice-to-have'
  courses: Array<{
    id: string
    course_name: string
    organization: string
    difficulty_level: string
    rating: number
  }>
}

export interface CareerPathResponse {
  career_goal: string
  required_skills: string[]
  current_skills: string[]
  missing_skills: string[]
  readiness_score: number
  skill_gaps: CareerSkillGap[]
  recommended_sequence: GraphCourseResult[]
  graph_data: { nodes: VizNode[]; edges: VizEdge[] }
  processing_time_ms: number
}

export interface RelatedSkillsResponse {
  skill: string
  advances_to: string[]
  related_to: string[]
  leads_to: string[]
  required_by_careers: string[]
  taught_by_courses: Array<{
    id: string
    course_name: string
    organization: string
    rating: number
    difficulty_level: string
  }>
}

export interface GraphRecommendResponse {
  query: string
  results: GraphCourseResult[]
  total: number
  graph_enhanced: boolean
  processing_time_ms: number
}

export interface MemoryEntry {
  type: 'search' | 'save' | 'view' | 'skill' | 'career' | 'level'
  content: string
  timestamp: string
  meta: Record<string, unknown>
}

export interface MemoryProfile {
  user_id: string
  inferred_skills: string[]
  inferred_career: string | null
  inferred_level: string | null
  top_topics: string[]
  recent_searches: string[]
  recent_saves: string[]
  total_interactions: number
  last_active: string
  created_at: string
  entries: MemoryEntry[]
}

// ── Market Intelligence ───────────────────────────────────────────────────────

export interface TrendingSkill {
  skill: string
  demand_score: number
  growth_rate: number
  job_postings: number
  avg_salary: number
  category: string
  difficulty: string
  is_emerging: boolean
  related_careers: string[]
  course_count: number
}

export interface CareerDemand {
  title: string
  demand_level: 'Critical' | 'High' | 'Growing' | 'Stable'
  category: string
  growth_rate: number
  avg_salary: number
  salary_min: number
  salary_max: number
  required_skills: string[]
  trending_skills: string[]
  remote_friendly: boolean
  description: string
}

export interface EmergingTech {
  name: string
  category: string
  adoption_stage: 'Early Adopter' | 'Growing' | 'Mainstream'
  hype_score: number
  description: string
  use_cases: string[]
  recommended_skills: string[]
  market_size: string
  timeline: string
}

export interface SkillInsight {
  skill: string
  demand_score: number
  growth_rate: number
  trend_summary: string
  career_alignment: string[]
  market_context: string
  salary_impact: string
  recommended_courses: Array<{
    id: string
    course_name: string
    organization: string
    rating: number
    difficulty_level: string
    course_url: string
  }>
}

export interface MarketSummary {
  total_skills_tracked: number
  fastest_growing: string
  fastest_growth_rate: number
  hottest_career: string
  top_emerging_tech: string
  avg_salary_increase_pct: number
  last_updated: string
}

// ── FuturePath AI ─────────────────────────────────────────────────────────────

export interface RoadmapStep {
  step: number
  phase: string
  skill: string
  course_name: string
  course_id: string
  estimated_weeks: number
  description: string
}

export interface FutureCareerPath {
  path_id: string
  path_name: string
  career_goal: string
  timeline_type: string
  estimated_months: number
  success_probability: number
  readiness_score: number
  difficulty_risk: 'Low' | 'Medium' | 'High'
  career_alignment_score: number
  missing_skills: string[]
  recommended_courses: Array<{
    id: string
    course_name: string
    organization: string
    difficulty_level: string
    rating: number
    course_url?: string
    skills?: string[]
  }>
  roadmap_steps: RoadmapStep[]
  explanation: string
  score_breakdown: {
    prerequisite_score: number
    skill_match_score: number
    learning_capacity_score: number
    difficulty_fit_score: number
    career_alignment_score: number
    market_relevance_score: number
  }
}

export interface SimulationResponse {
  simulation_id: string
  user_id: string
  created_at: string
  paths: FutureCareerPath[]
  summary: string
  processing_time_ms: number
}

export interface PathMetrics {
  success_probability: number
  estimated_months: number
  difficulty_risk: string
  timeline_type: string
  career_alignment_score: number
}

export interface WhatIfResponse {
  scenario: string
  explanation: string
  before_metrics: PathMetrics
  after_metrics: PathMetrics
  delta_probability: number
  delta_months: number
  risk_change: 'Increased' | 'Decreased' | 'Unchanged'
  recommendation: string
  processing_time_ms: number
}

export interface SimulationHistoryItem {
  simulation_id: string
  created_at: string
  target_careers: string[]
  path_count: number
  top_probability: number
}

export interface HistoryResponse {
  user_id: string
  simulations: SimulationHistoryItem[]
  total: number
}

export interface TimelineGraphData {
  path_id: string
  career_goal: string
  nodes: Array<{
    id: string
    type?: string
    data: Record<string, unknown>
    position: { x: number; y: number }
    style?: Record<string, unknown>
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    animated?: boolean
    style?: Record<string, unknown>
  }>
}

