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
