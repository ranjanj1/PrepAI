import { useEffect, useState } from 'react'
import { getAnalysis, listAnalyses, updateStatus } from '../api'
import type { AnalysisResult, AnalysisSummary, JobStatus } from '../types'

interface Props {
  onBack: () => void
  onLoad: (result: AnalysisResult, url: string, id: number) => void
}

type Filter = 'all' | JobStatus

const STATUSES: { value: JobStatus; label: string }[] = [
  { value: 'not_applied', label: 'Not Applied' },
  { value: 'applied',     label: 'Applied'     },
  { value: 'interview',   label: 'Interview'   },
  { value: 'offer',       label: 'Offer'       },
  { value: 'rejected',    label: 'Rejected'    },
]

const STATUS_STYLE: Record<JobStatus, string> = {
  not_applied: 'text-muted border-border',
  applied:     'text-accent border-accent/40 bg-accent/10',
  interview:   'text-[#d4621a] border-[#f4a261]/40 bg-[#f4a261]/10',
  offer:       'text-blue-500 border-blue-400/40 bg-blue-400/10',
  rejected:    'text-warn border-warn/40 bg-warn/10',
}

export function HistoryScreen({ onBack, onLoad }: Props) {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [openPickerId, setOpenPickerId] = useState<number | null>(null)

  useEffect(() => {
    listAnalyses()
      .then(setAnalyses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function open(id: number) {
    setLoadingId(id)
    try {
      const { result, job_url } = await getAnalysis(id)
      onLoad(result, job_url, id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleStatusChange(e: React.MouseEvent, id: number, status: JobStatus) {
    e.stopPropagation()
    setAnalyses((prev) => prev.map((a) => a.id === id ? { ...a, status } : a))
    setOpenPickerId(null)
    await updateStatus(id, status)
  }

  function togglePicker(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    setOpenPickerId((prev) => prev === id ? null : id)
  }

  const filtered = filter === 'all' ? analyses : analyses.filter((a) => a.status === filter)

  const counts = analyses.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-surface sticky top-0 z-50"
              style={{ boxShadow: '0 1px 8px rgba(26,22,18,0.05)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-muted hover:text-text transition-colors font-mono text-[12px]"
          >
            ← Back
          </button>
          <div className="w-px h-4 bg-border" />
          <span className="font-display text-[17px] font-bold text-text">
            Prep<span className="text-accent">AI</span>
          </span>
        </div>
        <h1 className="font-display text-[18px] font-bold text-text">My History</h1>
        <div className="w-24" />
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-[12px] font-semibold border transition-all ${
              filter === 'all'
                ? 'bg-accent text-white border-accent'
                : 'bg-surface text-muted border-border hover:bg-surface2 hover:text-text'
            }`}
          >
            All <span className="font-mono">{analyses.length}</span>
          </button>
          {STATUSES.map(({ value, label }) => (
            counts[value] ? (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-4 py-2 rounded-xl text-[12px] font-semibold border transition-all ${
                  filter === value
                    ? STATUS_STYLE[value] + ' border-current'
                    : 'bg-surface text-muted border-border hover:bg-surface2 hover:text-text'
                }`}
              >
                {label} <span className="font-mono">{counts[value]}</span>
              </button>
            ) : null
          ))}
        </div>

        {loading && (
          <p className="font-mono text-[12px] text-muted text-center py-12">Loading...</p>
        )}
        {error && (
          <p className="font-mono text-[12px] text-warn text-center py-12">{error}</p>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="font-display text-[22px] font-bold text-text mb-2">No analyses yet</p>
            <p className="font-mono text-[12px] text-muted">
              {filter === 'all' ? 'Paste a job URL to get started.' : 'No jobs with this status.'}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              onClick={() => open(a.id)}
              className="bg-surface border-2 border-border rounded-2xl p-5 cursor-pointer transition-all hover:border-accent/40 hover:-translate-y-0.5"
              style={{ boxShadow: '0 2px 12px rgba(26,22,18,0.06)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-[16px] text-text leading-snug">
                    {a.role || 'Unknown Role'}
                  </p>
                  <p className="font-mono text-[11px] text-accent mt-0.5 font-medium">
                    {a.company || '—'}
                  </p>
                  <p className="font-mono text-[10px] text-muted mt-2 truncate">
                    {a.job_url}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="font-mono text-[10px] text-muted">
                    {new Date(a.created_at).toLocaleDateString()}
                  </p>

                  <div className="relative">
                    <button
                      onClick={(e) => togglePicker(e, a.id)}
                      className={`font-mono text-[10px] px-3 py-1 rounded-lg border transition-all ${STATUS_STYLE[a.status]}`}
                    >
                      {STATUSES.find(s => s.value === a.status)?.label ?? a.status} ▾
                    </button>

                    {openPickerId === a.id && (
                      <div className="absolute right-0 top-full mt-1 bg-surface border-2 border-border rounded-xl overflow-hidden z-20 min-w-[130px] animate-slide-in"
                           style={{ boxShadow: '0 8px 24px rgba(26,22,18,0.12)' }}>
                        {STATUSES.map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={(e) => handleStatusChange(e, a.id, value)}
                            className={`w-full text-left px-3 py-2 font-mono text-[11px] transition-colors hover:bg-surface2 ${
                              a.status === value
                                ? STATUS_STYLE[value] + ' border border-current'
                                : 'text-muted'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {loadingId === a.id && (
                    <p className="font-mono text-[10px] text-accent">Loading...</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
