import type { ProgressStep } from '../types'

const stepLabels: Record<string, string> = {
  scraping:  'Fetching job posting',
  analyzing: 'Extracting skills & topics',
  technical: 'Generating Technical questions',
  sysdesign: 'Generating System Design questions',
  behavioral: 'Generating Behavioral questions',
  company:   'Researching company insights',
}

const stepOrder = ['scraping', 'analyzing', 'technical', 'sysdesign', 'behavioral', 'company']

interface Props {
  steps: ProgressStep[]
  mode?: 'url' | 'jd'
}

export function ScanProgress({ steps, mode = 'url' }: Props) {
  const completed = new Set(steps.map((s) => s.step))
  const current = steps.at(-1)?.step ?? ''
  const visibleSteps = mode === 'jd' ? stepOrder.filter((s) => s !== 'scraping') : stepOrder

  return (
    <div className="mt-2 w-full max-w-sm z-10">
      {/* Status line */}
      <div className="flex items-center gap-2.5 font-mono text-[12px] text-accent mb-5">
        <div className="dot-bounce flex gap-1">
          <span /><span /><span />
        </div>
        <span>{steps.at(-1)?.message ?? 'Starting analysis...'}</span>
      </div>

      {/* Step checklist */}
      <div className="flex flex-col gap-2.5">
        {visibleSteps.map((step) => {
          const done = completed.has(step) && step !== current
          const active = step === current
          return (
            <div key={step} className="flex items-center gap-2.5 font-mono text-[11px]">
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  done
                    ? 'bg-accent border-accent text-white'
                    : active
                    ? 'border-accent bg-accent/10'
                    : 'border-border bg-surface2'
                }`}
              >
                {done && (
                  <svg width="9" height="9" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3.5 6L6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={
                done
                  ? 'text-muted line-through'
                  : active
                  ? 'text-accent font-medium'
                  : 'text-muted/50'
              }>
                {stepLabels[step] ?? step}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
