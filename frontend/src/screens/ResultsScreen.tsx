import { useEffect, useState } from 'react'
import { getAnswers, generateAnswer, getCustomQuestions, addCustomQuestion, deleteCustomQuestion } from '../api'
import { QuestionCard } from '../components/QuestionCard'
import { Sidebar } from '../components/Sidebar'
import type { AnalysisResult, CompanyOverview, CustomQuestion } from '../types'

function CompanyOverviewPanel({ data }: { data?: CompanyOverview }) {
  if (!data || !data.description) {
    return (
      <p className="font-mono text-[12px] text-muted">
        Company overview not available. Re-run the analysis to generate it.
      </p>
    )
  }

  const sections: { label: string; items: string[] }[] = [
    { label: 'Culture Signals', items: data.culture },
    { label: 'What They Prioritize', items: data.interview_focus },
    { label: 'Research Before the Interview', items: data.research_tips },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-surface border-2 border-border rounded-2xl p-6"
           style={{ boxShadow: '0 2px 16px rgba(26,22,18,0.06)' }}>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">About</p>
        <p className="text-[14px] text-text leading-relaxed">{data.description}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {sections.map(({ label, items }) => (
          <div key={label} className="bg-surface border-2 border-border rounded-2xl p-5 flex flex-col gap-3"
               style={{ boxShadow: '0 2px 16px rgba(26,22,18,0.06)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
            <ul className="flex flex-col gap-2">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-text">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

type Tab = 'technical' | 'sysdesign' | 'behavioral' | 'company'

const TAB_LABELS: Record<Tab, string> = {
  technical: 'Technical',
  sysdesign: 'System Design',
  behavioral: 'Behavioral',
  company: 'Company',
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

  const questions = tab !== 'company' ? result.questions[tab] : []
  const total =
    result.questions.technical.length +
    result.questions.sysdesign.length +
    result.questions.behavioral.length

  const displayUrl = url.length > 55 ? url.slice(0, 55) + '…' : url

  const tabCounts: Record<Tab, number> = {
    technical: result.questions.technical.length + customQuestions.filter(q => q.category === 'technical').length,
    sysdesign: result.questions.sysdesign.length + customQuestions.filter(q => q.category === 'sysdesign').length,
    behavioral: result.questions.behavioral.length + customQuestions.filter(q => q.category === 'behavioral').length,
    company: 0,
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-3.5 border-b border-border bg-surface sticky top-0 z-50"
              style={{ boxShadow: '0 1px 8px rgba(26,22,18,0.05)' }}>
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-accent"
                style={{ boxShadow: '0 0 0 3px rgba(255,92,53,0.2)' }} />
          <span className="font-display text-[17px] font-bold text-text">
            Prep<span className="text-accent">AI</span>
          </span>
        </div>

        <div className="font-mono text-[11px] text-muted bg-surface2 border border-border rounded-full px-4 py-1.5 max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap hidden md:block">
          {displayUrl}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onHistory}
            className="text-[12px] font-semibold text-muted border border-border rounded-xl px-4 py-2 hover:bg-surface2 hover:text-text transition-all"
          >
            📋 History
          </button>
          <button
            onClick={onNew}
            className="text-[12px] font-semibold text-muted border border-border rounded-xl px-4 py-2 hover:bg-surface2 hover:text-text transition-all"
          >
            ← New
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar data={result} />

        {/* Main content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3.5 mb-7">
            <div className="bg-surface border-2 border-border rounded-2xl p-5 transition-all hover:border-accent/40 hover:-translate-y-0.5"
                 style={{ boxShadow: '0 2px 16px rgba(26,22,18,0.06)' }}>
              <p className="font-display text-[34px] font-bold text-accent leading-none mb-1">{total}</p>
              <p className="text-[12px] text-muted font-medium">Total Questions</p>
            </div>
            <div className="bg-surface border-2 border-border rounded-2xl p-5 transition-all hover:border-accent/40 hover:-translate-y-0.5">
              <p className="font-display text-[34px] font-bold text-text leading-none mb-1">
                {result.questions.technical.length}
              </p>
              <p className="text-[12px] text-muted font-medium">Technical</p>
            </div>
            <div className="bg-surface border-2 border-border rounded-2xl p-5 transition-all hover:border-accent/40 hover:-translate-y-0.5">
              <p className="font-display text-[34px] font-bold text-text leading-none mb-1">
                {result.questions.behavioral.length}
              </p>
              <p className="text-[12px] text-muted font-medium">Behavioral</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 mb-7 bg-surface border border-border rounded-xl p-1.5 w-fit">
            {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                  tab === t
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-text hover:bg-surface2'
                }`}
                style={tab === t ? { boxShadow: '0 3px 12px rgba(255,92,53,0.3)' } : undefined}
              >
                {TAB_LABELS[t]}
                {t !== 'company' && (
                  <span className={`font-mono text-[11px] rounded-full px-1.5 py-0 ${
                    tab === t ? 'bg-white/25 text-white' : 'bg-surface2 text-muted'
                  }`}>
                    {tabCounts[t]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === 'company' ? (
            <CompanyOverviewPanel data={result.company_overview} />
          ) : (
            <>
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
                  className="mt-3 border-2 border-dashed border-accent/40 rounded-2xl p-5 flex flex-col gap-3 bg-surface animate-slide-in"
                >
                  <textarea
                    autoFocus
                    placeholder="Your question..."
                    value={form.text}
                    onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
                    rows={3}
                    className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-[13px] text-text placeholder-muted outline-none resize-none focus:border-accent focus:bg-white transition-all"
                  />
                  <div className="flex gap-3">
                    <select
                      value={form.difficulty}
                      onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                      className="bg-surface2 border border-border rounded-xl px-3 py-2 font-mono text-[12px] text-text outline-none focus:border-accent transition-all"
                    >
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                    <input
                      placeholder="Topic (optional)"
                      value={form.topic}
                      onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
                      className="flex-1 bg-surface2 border border-border rounded-xl px-3 py-2 font-mono text-[12px] text-text placeholder-muted outline-none focus:border-accent focus:bg-white transition-all"
                    />
                  </div>
                  <input
                    placeholder="Hint (optional)"
                    value={form.hint}
                    onChange={(e) => setForm((p) => ({ ...p, hint: e.target.value }))}
                    className="bg-surface2 border border-border rounded-xl px-3 py-2 font-mono text-[12px] text-text placeholder-muted outline-none focus:border-accent focus:bg-white transition-all"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 rounded-xl font-mono text-[12px] text-muted border border-border hover:bg-surface2 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddQuestion}
                      className="px-5 py-2 rounded-xl bg-accent text-white font-mono text-[12px] font-semibold transition-all hover:-translate-y-0.5"
                      style={{ boxShadow: '0 3px 10px rgba(255,92,53,0.3)' }}
                    >
                      Add Question
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-3 w-full flex items-center gap-3 border-2 border-dashed border-border rounded-2xl px-6 py-4 text-[14px] font-semibold text-muted hover:border-accent hover:text-accent hover:bg-accent/[0.03] transition-all"
                >
                  <span className="w-7 h-7 bg-surface2 rounded-lg flex items-center justify-center text-lg leading-none border border-border">+</span>
                  Add a custom question
                </button>
              )}
            </>
          )}

          <p className="font-mono text-[11px] text-muted text-center mt-8 pt-5 border-t border-border">
            Click any card to reveal hints · Questions tailored to this role
          </p>
        </main>
      </div>
    </div>
  )
}
