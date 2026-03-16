export interface Skill {
  name: string
  primary: boolean
}

export interface Topic {
  name: string
  weight: number // 0–100
}

export interface Question {
  text: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  topic: string
  hint: string
}

export interface CompanyOverview {
  description: string
  culture: string[]
  interview_focus: string[]
  research_tips: string[]
}

export interface AnalysisResult {
  role: string
  company: string
  location: string
  skills: Skill[]
  topics: Topic[]
  questions: {
    technical: Question[]
    sysdesign: Question[]
    behavioral: Question[]
  }
  company_overview?: CompanyOverview
}

export type JobStatus = 'not_applied' | 'applied' | 'interview' | 'offer' | 'rejected'

export interface AnalysisSummary {
  id: number
  job_url: string
  role: string
  company: string
  status: JobStatus
  created_at: string
}

export interface CustomQuestion {
  id: number
  category: 'technical' | 'sysdesign' | 'behavioral'
  text: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  topic: string
  hint: string
}

export interface Answer {
  question_text: string
  answer_text: string
}

export type Screen = 'auth' | 'home' | 'results' | 'history'

export type ProgressStep = {
  step: string
  message: string
}
