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
  interview:   'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  offer:       'text-blue-400 border-blue-400/40 bg-blue-400/10',
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
  }, {} as Record<JobStatus, number>)

  return (
    <div className="min-h-screen flex flex-col" onClick={() => setOpenPickerId(null)}>
      {/* Topbar */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-bg sticky top-0 z-50">
        <div className="flex items-center gap-2 text-[15px] font-bold">
          <div className="w-2 h-2 bg-accent rounded-full" />
          PrepAI
        </div>
        <button
          onClick={onBack}
          className="border border-border rounded-lg px-3.5 py-2 text-muted font-semibold text-[12px] hover:text-text hover:border-text transition-colors"
        >
          ← Back
        </button>
      </header>

      <main className="max-w-2xl mx-auto w-full px-6 py-10">
        <h2 className="text-[22px] font-extrabold tracking-tight mb-1">My Prep Kits</h2>
        <p className="font-mono text-[12px] text-muted mb-6">{analyses.length} jobs tracked</p>

        {/* Filter bar */}
        <div className="flex gap-1.5 flex-wrap mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] border transition-all ${
              filter === 'all'
                ? 'bg-accent text-bg border-accent'
                : 'text-muted border-border hover:border-accent/40 hover:text-text'
            }`}
          >
            All ({analyses.length})
          </button>
          {STATUSES.map(({ value, label }) => (
            counts[value] ? (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3 py-1 rounded-lg font-mono text-[11px] border transition-all ${
                  filter === value
                    ? STATUS_STYLE[value] + ' border-current'
                    : 'text-muted border-border hover:border-accent/40 hover:text-text'
                }`}
              >
                {label} ({counts[value]})
              </button>
            ) : null
          ))}
        </div>

        {loading && <p className="font-mono text-[12px] text-muted">Loading...</p>}
        {error && <p className="font-mono text-[12px] text-warn">{error}</p>}

        {!loading && filtered.length === 0 && (
          <div className="bg-surface border border-border rounded-xl p-6 text-center">
            <p className="font-mono text-[13px] text-muted">
              {filter === 'all' ? 'No analyses yet. Paste a job URL to get started.' : `No jobs with status "${filter}".`}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              onClick={() => open(a.id)}
              className="relative bg-surface border border-border rounded-xl p-5 cursor-pointer hover:border-accent/40 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold group-hover:text-accent transition-colors truncate">
                    {a.role || 'Unknown Role'}
                  </p>
                  <p className="font-mono text-[11px] text-accent mt-0.5">{a.company}</p>
                  <p className="font-mono text-[10px] text-muted mt-1.5 truncate max-w-xs">{a.job_url}</p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                  <p className="font-mono text-[10px] text-muted">
                    {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>

                  {/* Status badge — click to open picker */}
                  <div className="relative">
                    <button
                      onClick={(e) => togglePicker(e, a.id)}
                      className={`font-mono text-[10px] px-2.5 py-1 rounded border uppercase tracking-wide transition-all hover:opacity-80 ${STATUS_STYLE[a.status]}`}
                    >
                      {STATUSES.find((s) => s.value === a.status)?.label ?? a.status}
                    </button>

                    {/* Inline picker */}
                    {openPickerId === a.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1.5 z-20 bg-bg border border-border rounded-xl p-2 flex flex-col gap-1 shadow-lg min-w-[130px]"
                      >
                        {STATUSES.map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={(e) => handleStatusChange(e, a.id, value)}
                            className={`text-left font-mono text-[11px] px-3 py-1.5 rounded-lg transition-colors ${
                              a.status === value
                                ? STATUS_STYLE[value] + ' border border-current'
                                : 'text-muted hover:text-text hover:bg-surface'
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
