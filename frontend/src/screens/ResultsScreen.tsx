import { useEffect, useState } from 'react'
import { getAnswers, generateAnswer, getCustomQuestions, addCustomQuestion, deleteCustomQuestion } from '../api'
import { QuestionCard } from '../components/QuestionCard'
import { Sidebar } from '../components/Sidebar'
import type { AnalysisResult, CustomQuestion } from '../types'

type Tab = 'technical' | 'sysdesign' | 'behavioral'

const TAB_LABELS: Record<Tab, string> = {
  technical: 'Technical',
  sysdesign: 'System Design',
  behavioral: 'Behavioral',
}

interface Props {
  result: AnalysisResult
  url: string
  analysisId: number
  onNew: () => void
  onHistory: () => void
}

export function ResultsScreen({ result, url, analysisId, onNew, onHistory }: Props) {
  const [tab, setTab] = useState<Tab>('technical')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ text: '', difficulty: 'Medium', topic: '', hint: '' })

  useEffect(() => {
    getAnswers(analysisId).then((list) => {
      const map: Record<string, string> = {}
      list.forEach((a) => { map[a.question_text] = a.answer_text })
      setAnswers(map)
    }).catch(() => {})
    getCustomQuestions(analysisId).then(setCustomQuestions).catch(() => {})
  }, [analysisId])

  async function handleGetAnswer(questionText: string) {
    const a = await generateAnswer(analysisId, questionText)
    setAnswers((prev) => ({ ...prev, [a.question_text]: a.answer_text }))
  }

  async function handleAddQuestion() {
    if (!form.text.trim()) return
    const q = await addCustomQuestion(analysisId, { ...form, category: tab })
    setCustomQuestions((prev) => [...prev, q])
    setForm({ text: '', difficulty: 'Medium', topic: '', hint: '' })
    setShowForm(false)
  }

  async function handleDeleteQuestion(id: number) {
    await deleteCustomQuestion(analysisId, id)
    setCustomQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const questions = result.questions[tab]
  const total =
    result.questions.technical.length +
    result.questions.sysdesign.length +
    result.questions.behavioral.length

  const displayUrl = url.length > 50 ? url.slice(0, 50) + '...' : url

  return (
    <div className="flex flex-col min-h-screen">
      {/* Topbar */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-bg sticky top-0 z-50">
        <div className="flex items-center gap-2 text-[15px] font-bold">
          <div className="w-2 h-2 bg-accent rounded-full" />
          PrepAI
        </div>
        <div className="bg-surface border border-border rounded-full px-3.5 py-1.5 font-mono text-[11px] text-muted max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
          {displayUrl}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onHistory}
            className="border border-border rounded-lg px-3.5 py-2 text-muted font-semibold text-[12px] hover:text-text hover:border-text transition-colors"
          >
            History
          </button>
          <button
            onClick={onNew}
            className="border border-border rounded-lg px-3.5 py-2 text-muted font-semibold text-[12px] hover:text-text hover:border-text transition-colors"
          >
            ← New Job
          </button>
        </div>
      </header>

      {/* Dashboard */}
      <div className="flex flex-1">
        <Sidebar data={result} />

        {/* Main panel */}
        <main className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-extrabold tracking-tight">Interview Questions</h2>
            <span className="font-mono text-[12px] text-muted">{total} questions generated</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
            {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setShowForm(false) }}
                className={`px-4 py-1.5 rounded-[7px] text-[13px] font-semibold transition-all ${
                  tab === t ? 'bg-accent text-bg' : 'text-muted hover:text-text'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Questions */}
          <div className="flex flex-col gap-3">
            {questions.map((q, i) => (
              <QuestionCard
                key={q.text}
                question={q}
                index={i}
                answer={answers[q.text]}
                onGetAnswer={handleGetAnswer}
              />
            ))}
            {customQuestions.filter((q) => q.category === tab).map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={questions.length + i}
                answer={answers[q.text]}
                onGetAnswer={handleGetAnswer}
                isCustom
                onDelete={() => handleDeleteQuestion(q.id)}
              />
            ))}
            {questions.length === 0 && customQuestions.filter((q) => q.category === tab).length === 0 && (
              <p className="font-mono text-[12px] text-muted">No questions in this category.</p>
            )}
          </div>

          {/* Add question form */}
          {showForm ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="border border-dashed border-accent/40 rounded-2xl p-5 flex flex-col gap-3 bg-surface"
            >
              <textarea
                autoFocus
                placeholder="Your question..."
                value={form.text}
                onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
                rows={3}
                className="w-full bg-transparent border border-border rounded-xl px-4 py-3 font-mono text-[13px] text-text placeholder-muted outline-none resize-none focus:border-accent"
              />
              <div className="flex gap-3">
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                  className="bg-bg border border-border rounded-lg px-3 py-2 font-mono text-[12px] text-text outline-none focus:border-accent"
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
                <input
                  placeholder="Topic (optional)"
                  value={form.topic}
                  onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
                  className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 font-mono text-[12px] text-text placeholder-muted outline-none focus:border-accent"
                />
              </div>
              <input
                placeholder="Hint (optional)"
                value={form.hint}
                onChange={(e) => setForm((p) => ({ ...p, hint: e.target.value }))}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 font-mono text-[12px] text-text placeholder-muted outline-none focus:border-accent"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowForm(false); setForm({ text: '', difficulty: 'Medium', topic: '', hint: '' }) }}
                  className="font-mono text-[12px] text-muted hover:text-text px-4 py-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddQuestion}
                  disabled={!form.text.trim()}
                  className="bg-accent text-bg rounded-lg px-4 py-2 font-mono text-[12px] font-semibold disabled:opacity-40 hover:opacity-85 transition-opacity"
                >
                  Add Question
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-border text-muted font-mono text-[12px] hover:border-accent/40 hover:text-accent transition-all"
            >
              + Add your own question
            </button>
          )}

          <p className="font-mono text-[11px] text-muted text-center pt-3 border-t border-border">
            Click any card to reveal hints
          </p>
        </main>
      </div>
    </div>
  )
}
