import axios, { AxiosError } from 'axios'
import type {
  SearchResponse, RecommendResponse, LearningPathResponse,
  SkillGapResponse, CareerAlignResponse, CoursesListResponse, HealthResponse,
  GraphStats, GraphExploreData, SkillPathResponse, CareerPathResponse,
  RelatedSkillsResponse, GraphRecommendResponse, MemoryProfile,
  TrendingSkill, CareerDemand, EmergingTech, SkillInsight, MarketSummary,
  SimulationResponse, WhatIfResponse, HistoryResponse, TimelineGraphData,
} from '@/types'

const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : '/api')
  : 'http://localhost:8000/api'

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const msg = (error.response?.data as { detail?: string })?.detail || error.message
    return Promise.reject(new Error(msg))
  },
)

export const api = {
  health: (): Promise<HealthResponse> =>
    client.get('/health').then((r) => r.data),

  getCourses: (params?: {
    page?: number; page_size?: number; difficulty?: string;
    min_rating?: number; search?: string; skill?: string;
  }): Promise<CoursesListResponse> =>
    client.get('/courses', { params }).then((r) => r.data),

  search: (
    query: string,
    filters?: Record<string, unknown>,
    top_k?: number,
    user_id?: string,
  ): Promise<SearchResponse> =>
    client.post('/search', { query, filters: filters || {}, top_k: top_k || 10, user_id: user_id || null }).then((r) => r.data),

  recommend: (
    user_goals: string, current_skills: string[], target_skills: string[],
    difficulty_preference?: string,
  ): Promise<RecommendResponse> =>
    client.post('/recommend', { user_goals, current_skills, target_skills, difficulty_preference: difficulty_preference || 'any' }).then((r) => r.data),

  getLearningPath: (goal: string, current_level: string, max_courses?: number): Promise<LearningPathResponse> =>
    client.post('/learning-path', { goal, current_level, max_courses: max_courses || 8 }).then((r) => r.data),

  getSkillGap: (target_role: string, current_skills: string[]): Promise<SkillGapResponse> =>
    client.post('/skill-gap', { target_role, current_skills }).then((r) => r.data),

  getCareerAlign: (career_goal: string, current_skills: string[]): Promise<CareerAlignResponse> =>
    client.post('/career-align', { career_goal, current_skills }).then((r) => r.data),

  ingest: (source?: string, file_path?: string) =>
    client.post('/ingest', { source: source || 'sample', file_path: file_path || 'data/courses.csv' }).then((r) => r.data),

  // ── Graph / GraphRAG ──────────────────────────────────────────────────────
  graphStats: (): Promise<GraphStats> =>
    client.get('/graph/stats').then((r) => r.data),

  exploreGraph: (params?: {
    node_types?: string
    max_nodes?: number
    focus_skill?: string
  }): Promise<GraphExploreData> =>
    client.get('/graph/explore', { params }).then((r) => r.data),

  skillPath: (from_skill: string, to_skill: string, max_depth?: number): Promise<SkillPathResponse> =>
    client.post('/graph/skill-path', { from_skill, to_skill, max_depth: max_depth || 8 }).then((r) => r.data),

  careerPath: (
    career_goal: string,
    current_skills: string[],
    max_courses_per_skill?: number,
  ): Promise<CareerPathResponse> =>
    client.post('/graph/career-path', {
      career_goal,
      current_skills,
      max_courses_per_skill: max_courses_per_skill || 2,
    }).then((r) => r.data),

  graphRecommendations: (
    query: string,
    current_skills?: string[],
    target_skills?: string[],
    top_k?: number,
  ): Promise<GraphRecommendResponse> =>
    client.post('/graph/recommendations', {
      query,
      current_skills: current_skills || [],
      target_skills: target_skills || [],
      top_k: top_k || 10,
    }).then((r) => r.data),

  relatedSkills: (skill_name: string): Promise<RelatedSkillsResponse> =>
    client.get(`/graph/related/${encodeURIComponent(skill_name)}`).then((r) => r.data),

  listCareers: (): Promise<{
    careers: Array<{ title: string; required_skills_count: number; key_skills: string[] }>
    total: number
  }> =>
    client.get('/graph/careers').then((r) => r.data),

  // ── Memory / Personalization ──────────────────────────────────────────────
  getMemory: (userId: string): Promise<MemoryProfile> =>
    client.get(`/memory/${encodeURIComponent(userId)}`).then((r) => r.data),

  clearMemory: (userId: string): Promise<{ cleared: boolean }> =>
    client.delete(`/memory/${encodeURIComponent(userId)}`).then((r) => r.data),

  removeMemoryEntry: (userId: string, index: number): Promise<{ removed: boolean }> =>
    client.delete(`/memory/${encodeURIComponent(userId)}/entry/${index}`).then((r) => r.data),

  recordInteraction: (
    userId: string,
    courseId: string,
    courseName: string,
    skills: string[],
    action: 'save' | 'view',
  ): Promise<{ recorded: boolean }> =>
    client.post(`/memory/${encodeURIComponent(userId)}/interaction`, {
      course_id: courseId,
      course_name: courseName,
      skills,
      action,
    }).then((r) => r.data),

  recordMemorySkills: (userId: string, skills: string[]): Promise<{ recorded: boolean }> =>
    client.post(`/memory/${encodeURIComponent(userId)}/skills`, { skills }).then((r) => r.data),

  recordMemoryCareer: (userId: string, career: string): Promise<{ recorded: boolean }> =>
    client.post(`/memory/${encodeURIComponent(userId)}/career`, { career }).then((r) => r.data),

  recordMemoryLevel: (userId: string, level: string): Promise<{ recorded: boolean }> =>
    client.post(`/memory/${encodeURIComponent(userId)}/level`, { level }).then((r) => r.data),

  // ── Market Intelligence ───────────────────────────────────────────────────
  marketSummary: (): Promise<MarketSummary> =>
    client.get('/market/summary').then((r) => r.data),

  trendingSkills: (params?: {
    category?: string
    limit?: number
    emerging_only?: boolean
  }): Promise<TrendingSkill[]> =>
    client.get('/market/trending-skills', { params }).then((r) => r.data),

  careerDemand: (params?: {
    demand_level?: string
    category?: string
    limit?: number
  }): Promise<CareerDemand[]> =>
    client.get('/market/career-demand', { params }).then((r) => r.data),

  emergingTech: (params?: {
    category?: string
    limit?: number
  }): Promise<EmergingTech[]> =>
    client.get('/market/emerging-tech', { params }).then((r) => r.data),

  skillInsight: (skillName: string): Promise<SkillInsight> =>
    client.get(`/market/skill-insight/${encodeURIComponent(skillName)}`).then((r) => r.data),

  // ── FuturePath AI ─────────────────────────────────────────────────────────
  simulateFuturePath: (params: {
    user_id: string
    current_skills: string[]
    completed_courses: string[]
    target_careers: string[]
    weekly_learning_hours: number
    preferred_difficulty: string
    learning_pace: string
    career_priority: string
  }): Promise<SimulationResponse> =>
    client.post('/future-path/simulate', params).then((r) => r.data),

  whatIfSimulation: (params: {
    user_id: string
    base_simulation_id: string
    scenario_change: string
  }): Promise<WhatIfResponse> =>
    client.post('/future-path/what-if', params).then((r) => r.data),

  getFuturePathHistory: (userId: string): Promise<HistoryResponse> =>
    client.get(`/future-path/history/${encodeURIComponent(userId)}`).then((r) => r.data),

  getFuturePathGraph: (userId: string, simId: string, pathId: string): Promise<TimelineGraphData> =>
    client.get(`/future-path/graph/${encodeURIComponent(userId)}/${simId}/${pathId}`).then((r) => r.data),
}
