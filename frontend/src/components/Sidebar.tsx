import type { AnalysisResult } from '../types'

interface Props {
  data: AnalysisResult
}

function label(weight: number): string {
  if (weight >= 70) return 'High'
  if (weight >= 40) return 'Medium'
  return 'Low'
}

export function Sidebar({ data }: Props) {
  return (
    <aside className="border-r border-border p-7 flex flex-col gap-7 w-[260px] shrink-0">
      {/* Role */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2.5">Role</p>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-[15px] font-bold leading-snug">{data.role}</p>
          <p className="font-mono text-[11px] text-accent mt-1">
            {data.company}
            {data.location ? ` · ${data.location}` : ''}
          </p>
        </div>
      </div>

      {/* Skills */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2.5">
          Key Skills Detected
        </p>
        <div className="flex flex-wrap gap-1.5">
          {data.skills.map((s) => (
            <span
              key={s.name}
              className={`font-mono text-[11px] px-2.5 py-1 rounded-md border ${
                s.primary
                  ? 'bg-accent/10 text-accent border-accent/20'
                  : 'bg-white/[0.04] text-muted border-border'
              }`}
            >
              {s.name}
            </span>
          ))}
        </div>
      </div>

      {/* Topics */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2.5">
          Topic Breakdown
        </p>
        <div className="flex flex-col gap-3">
          {data.topics.map((t) => (
            <div key={t.name}>
              <div className="flex justify-between font-mono text-[11px] text-muted mb-1.5">
                <span>{t.name}</span>
                <span className="text-text font-medium">{label(t.weight)}</span>
              </div>
              <div className="h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full animate-grow-bar"
                  style={{ width: `${t.weight}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
