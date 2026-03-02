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
    <aside className="border-r border-border p-7 flex flex-col gap-7 w-[280px] shrink-0 bg-surface overflow-y-auto">
      {/* Role */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2.5">Role</p>
        <div className="rounded-xl p-4 border border-[#ffd4c6]"
             style={{ background: 'linear-gradient(135deg, #fff7f5 0%, #fff3e8 100%)' }}>
          <p className="font-display text-[15px] font-bold leading-snug text-text">{data.role}</p>
          <p className="font-mono text-[11px] text-accent mt-1 font-medium">
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
              className={`font-mono text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                s.primary
                  ? 'bg-accent/10 text-accent border-accent/25 hover:bg-accent/15'
                  : 'bg-surface2 text-muted border-border'
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
        <div className="flex flex-col gap-3.5">
          {data.topics.map((t) => (
            <div key={t.name}>
              <div className="flex justify-between text-[12px] mb-1.5">
                <span className="font-medium text-text">{t.name}</span>
                <span className="font-mono text-muted">{label(t.weight)}</span>
              </div>
              <div className="h-1.5 bg-surface2 rounded-full overflow-hidden border border-border">
                <div
                  className="h-full rounded-full animate-grow-bar"
                  style={{
                    width: `${t.weight}%`,
                    background: 'linear-gradient(90deg, #ff5c35, #ffb830)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
