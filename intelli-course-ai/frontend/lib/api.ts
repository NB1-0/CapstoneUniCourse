import axios, { AxiosError } from 'axios'
import type {
  SearchResponse, RecommendResponse, LearningPathResponse,
  SkillGapResponse, CareerAlignResponse, CoursesListResponse, HealthResponse,
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

  search: (query: string, filters?: Record<string, unknown>, top_k?: number): Promise<SearchResponse> =>
    client.post('/search', { query, filters: filters || {}, top_k: top_k || 10 }).then((r) => r.data),

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
}
