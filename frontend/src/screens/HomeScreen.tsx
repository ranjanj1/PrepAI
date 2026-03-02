import { useState } from 'react'
import { ScanProgress } from '../components/ScanProgress'
import type { ProgressStep } from '../types'

interface Props {
  loading: boolean
  steps: ProgressStep[]
  mode: 'url' | 'jd'
  error: string
  onAnalyze: (input: string, mode: 'url' | 'jd') => void
  onHistory: () => void
  onLogout: () => void
}

export function HomeScreen({ loading, steps, mode: activeMode, error, onAnalyze, onHistory, onLogout }: Props) {
  const [inputMode, setInputMode] = useState<'url' | 'jd'>('url')
  const [value, setValue] = useState('')

  function submit() {
    if (!value.trim() || loading) return
    onAnalyze(value.trim(), inputMode)
  }

  function switchMode(m: 'url' | 'jd') {
    setInputMode(m)
    setValue('')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(255,184,48,0.22) 0%, transparent 65%)', top: '-100px', right: '-100px' }} />
      <div className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(255,92,53,0.15) 0%, transparent 65%)', bottom: '-80px', left: '-80px' }} />

      {/* Top-right nav */}
      <div className="absolute top-5 right-6 flex items-center gap-3 z-10">
        <button onClick={onHistory} className="font-mono text-[11px] text-muted hover:text-text transition-colors">
          My History
        </button>
        <button onClick={onLogout} className="font-mono text-[11px] text-muted hover:text-warn transition-colors">
          Log out
        </button>
      </div>

      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-14 z-10">
        <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center text-white text-base font-bold"
             style={{ boxShadow: '0 4px 12px rgba(255,92,53,0.35)' }}>
          ✦
        </div>
        <span className="font-display text-xl font-bold tracking-wide text-text">
          Prep<span className="text-accent">AI</span>
        </span>
      </div>

      {/* Hero */}
      <div className="text-center z-10 max-w-[560px] mb-10">
        <h1 className="font-display text-[clamp(38px,6vw,64px)] font-black leading-[1.05] tracking-tight mb-5 text-text">
          {inputMode === 'url' ? (
            <>Paste a job link.<br /><em className="text-accent">Ace the interview.</em></>
          ) : (
            <>Paste the JD.<br /><em className="text-accent">Ace the interview.</em></>
          )}
        </h1>
        <p className="text-[16px] text-muted leading-relaxed">
          Drop any job posting URL and get a personalized prep kit in seconds.
        </p>
      </div>

      {/* Input card */}
      {loading ? (
        <div className="z-10 w-full max-w-md">
          <ScanProgress steps={steps} mode={activeMode} />
        </div>
      ) : (
        <div className="z-10 w-full max-w-[520px] bg-surface rounded-2xl p-7 border-2 border-border"
             style={{ boxShadow: '0 8px 40px rgba(26,22,18,0.1)' }}>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-5 bg-surface2 rounded-xl p-1">
            <button
              onClick={() => switchMode('url')}
              className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                inputMode === 'url'
                  ? 'bg-white text-text shadow-sm border border-border'
                  : 'text-muted hover:text-text'
              }`}
            >
              🔗 Job URL
            </button>
            <button
              onClick={() => switchMode('jd')}
              className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                inputMode === 'jd'
                  ? 'bg-white text-text shadow-sm border border-border'
                  : 'text-muted hover:text-text'
              }`}
            >
              📄 Paste JD
            </button>
          </div>

          {inputMode === 'url' ? (
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://jobs.lever.co/company/role..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className="flex-1 bg-surface2 border border-border rounded-xl px-4 py-3 font-mono text-[13px] text-text placeholder-muted outline-none transition-all focus:border-accent focus:bg-white"
              />
              <button
                onClick={submit}
                disabled={!value.trim()}
                className="bg-accent text-white rounded-xl px-5 py-3 text-[14px] font-semibold disabled:opacity-40 transition-all hover:-translate-y-0.5"
                style={{ boxShadow: '0 4px 14px rgba(255,92,53,0.3)' }}
              >
                Analyze →
              </button>
            </div>
          ) : (
            <>
              <textarea
                placeholder="Paste the full job description here..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={5}
                className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-[13px] text-text placeholder-muted outline-none resize-none transition-all focus:border-accent focus:bg-white mb-3"
              />
              <button
                onClick={submit}
                disabled={!value.trim()}
                className="w-full bg-accent text-white rounded-xl py-3 text-[14px] font-semibold disabled:opacity-40 transition-all hover:-translate-y-0.5"
                style={{ boxShadow: '0 4px 14px rgba(255,92,53,0.3)' }}
              >
                Generate Prep Kit →
              </button>
            </>
          )}

          {error && (
            <p className="mt-3 font-mono text-[12px] text-warn text-center">{error}</p>
          )}
        </div>
      )}

      {/* Feature chips */}
      {!loading && (
        <div className="flex gap-2 flex-wrap justify-center mt-7 z-10">
          {[
            { dot: 'bg-easy', label: 'Behavioral' },
            { dot: 'bg-medium', label: 'System Design' },
            { dot: 'bg-warn', label: 'Technical' },
            { dot: null, label: '✨ AI-tailored hints' },
            { dot: null, label: '⚡ Under 30 seconds' },
          ].map(({ dot, label }) => (
            <div key={label} className="flex items-center gap-1.5 bg-surface border border-border rounded-full px-3.5 py-1.5 text-[12px] font-medium text-muted">
              {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
