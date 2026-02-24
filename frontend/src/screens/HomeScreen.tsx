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
    <div className="min-h-screen flex flex-col items-center justify-center px-5 relative">
      {/* Ambient glow */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-accent/[0.06] blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] pointer-events-none" />

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
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-bg text-base font-bold">✦</div>
        <span className="text-lg font-bold tracking-wide">
          Prep<span className="text-accent">AI</span>
        </span>
      </div>

      {/* Hero */}
      <div className="text-center z-10 max-w-[560px] mb-10">
        <h1 className="text-[clamp(36px,6vw,58px)] font-extrabold leading-[1.05] tracking-tight mb-4">
          {inputMode === 'url' ? (
            <>Paste a job link.<br /><em className="not-italic text-accent">Ace the interview.</em></>
          ) : (
            <>Paste the JD.<br /><em className="not-italic text-accent">Ace the interview.</em></>
          )}
        </h1>
        <p className="font-mono text-[13px] text-muted leading-relaxed">
          {inputMode === 'url'
            ? <>Drop any job posting URL. PrepAI reads the role,<br />extracts what matters, and builds your custom prep kit.</>
            : <>Paste the full job description directly. PrepAI skips<br />the fetch and gets straight to building your prep kit.</>
          }
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-3 z-10">
        {(['url', 'jd'] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            disabled={loading}
            className={`px-5 py-1.5 rounded-[7px] font-mono text-[12px] font-semibold transition-all ${
              inputMode === m ? 'bg-accent text-bg' : 'text-muted hover:text-text'
            }`}
          >
            {m === 'url' ? 'Job URL' : 'Paste JD'}
          </button>
        ))}
      </div>

      {/* Input */}
      {inputMode === 'url' ? (
        <div
          className={`w-full max-w-[560px] bg-surface border rounded-2xl px-5 py-1.5 flex items-center gap-2.5 z-10 transition-all ${
            loading ? 'border-border opacity-60 pointer-events-none' : 'border-border focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(0,229,160,0.08)]'
          }`}
        >
          <input
            type="text"
            placeholder="https://jobs.capitalone.com/job/..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            disabled={loading}
            className="flex-1 bg-transparent border-none outline-none font-mono text-[13px] text-text placeholder-muted"
          />
          <button
            onClick={submit}
            disabled={loading}
            className="bg-accent text-bg border-none rounded-[10px] px-5 py-3 font-sans font-bold text-[13px] whitespace-nowrap transition-opacity hover:opacity-85 active:scale-[0.97] disabled:opacity-50"
          >
            Analyze →
          </button>
        </div>
      ) : (
        <div className={`w-full max-w-[560px] z-10 transition-all ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className={`bg-surface border rounded-2xl transition-all ${
            loading ? 'border-border' : 'border-border focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(0,229,160,0.08)]'
          }`}>
            <textarea
              placeholder="Paste the full job description here..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={loading}
              rows={7}
              className="w-full bg-transparent border-none outline-none font-mono text-[13px] text-text placeholder-muted resize-none px-5 pt-4 pb-3"
            />
            <div className="flex justify-end px-4 pb-3">
              <button
                onClick={submit}
                disabled={loading || !value.trim()}
                className="bg-accent text-bg border-none rounded-[10px] px-5 py-3 font-sans font-bold text-[13px] whitespace-nowrap transition-opacity hover:opacity-85 active:scale-[0.97] disabled:opacity-50"
              >
                Analyze →
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="font-mono text-[11px] text-muted mt-3.5 z-10">
        {inputMode === 'url'
          ? 'Works with LinkedIn, Greenhouse, Lever, Workday, and most job boards.'
          : 'Paste the complete JD for best results.'}
      </p>

      {loading && <ScanProgress steps={steps} mode={activeMode} />}

      {error && (
        <p className="font-mono text-[12px] text-warn mt-4 z-10 text-center max-w-sm">{error}</p>
      )}
    </div>
  )
}
