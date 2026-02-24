import type { AnalysisResult, AnalysisSummary, Answer, CustomQuestion, JobStatus } from './types'

const BASE = ''

function token() {
  return localStorage.getItem('token') ?? ''
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }
}

export async function register(email: string, password: string): Promise<string> {
  const r = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.detail ?? 'Registration failed')
  return data.token
}

export async function login(email: string, password: string): Promise<string> {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.detail ?? 'Login failed')
  return data.token
}

export async function listAnalyses(): Promise<AnalysisSummary[]> {
  const r = await fetch(`${BASE}/analyses`, { headers: authHeaders() })
  if (!r.ok) throw new Error('Failed to load history')
  return r.json()
}

export async function getAnalysis(id: number): Promise<{ result: AnalysisResult; job_url: string }> {
  const r = await fetch(`${BASE}/analyses/${id}`, { headers: authHeaders() })
  if (!r.ok) throw new Error('Failed to load analysis')
  return r.json()
}

export async function getAnswers(analysisId: number): Promise<Answer[]> {
  const r = await fetch(`${BASE}/analyses/${analysisId}/answers`, { headers: authHeaders() })
  if (!r.ok) throw new Error('Failed to load answers')
  return r.json()
}

export async function updateStatus(id: number, status: JobStatus): Promise<void> {
  await fetch(`/analyses/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  })
}

export async function getCustomQuestions(analysisId: number): Promise<CustomQuestion[]> {
  const r = await fetch(`${BASE}/analyses/${analysisId}/custom-questions`, { headers: authHeaders() })
  if (!r.ok) throw new Error('Failed to load custom questions')
  return r.json()
}

export async function addCustomQuestion(
  analysisId: number,
  payload: { category: string; text: string; difficulty: string; topic: string; hint: string }
): Promise<CustomQuestion> {
  const r = await fetch(`${BASE}/analyses/${analysisId}/custom-questions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error('Failed to add question')
  return r.json()
}

export async function deleteCustomQuestion(analysisId: number, questionId: number): Promise<void> {
  await fetch(`${BASE}/analyses/${analysisId}/custom-questions/${questionId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}

export async function generateAnswer(analysisId: number, questionText: string): Promise<Answer> {
  const r = await fetch(`${BASE}/analyses/${analysisId}/answers`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ question_text: questionText }),
  })
  if (!r.ok) throw new Error('Failed to generate answer')
  return r.json()
}
