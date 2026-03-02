import { useState } from 'react'
import type { Question } from '../types'

const difficultyConfig: Record<Question['difficulty'], { label: string; classes: string }> = {
  Hard:   { label: 'Hard',   classes: 'text-warn border-warn/25 bg-warn/8' },
  Medium: { label: 'Medium', classes: 'text-[#d4621a] border-[#f4a261]/35 bg-[#f4a261]/10' },
  Easy:   { label: 'Easy',   classes: 'text-easy border-easy/30 bg-easy/8' },
}

interface Props {
  question: Question
  index: number
  answer?: string
  onGetAnswer: (questionText: string) => Promise<void>
  isCustom?: boolean
  onDelete?: () => void
}

export function QuestionCard({ question, index, answer, onGetAnswer, isCustom, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAnswer(e: React.MouseEvent) {
    e.stopPropagation()
    setLoading(true)
    try {
      await onGetAnswer(question.text)
    } finally {
      setLoading(false)
    }
  }

  const diff = difficultyConfig[question.difficulty]

  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      className={`bg-surface border-2 rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden ${
        expanded
          ? 'border-accent'
          : isCustom
          ? 'border-dashed border-accent/40 hover:border-accent/60'
          : 'border-border hover:border-accent/30'
      }`}
      style={{
        animationDelay: `${index * 0.07}s`,
        opacity: 0,
        animation: `fadeUp 0.4s ease ${index * 0.07}s forwards`,
        boxShadow: expanded ? '0 4px 24px rgba(255,92,53,0.08)' : undefined,
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-colors"
        style={{ background: expanded ? '#ff5c35' : '#e2ddd5' }}
      />

      <div className="flex items-start gap-3 pl-2">
        {/* Q number badge */}
        <div className="font-mono text-[10px] text-muted bg-surface2 border border-border rounded-md px-1.5 py-0.5 mt-0.5 shrink-0 min-w-[36px] text-center">
          {isCustom ? '✎' : `Q${String(index + 1).padStart(2, '0')}`}
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-[15px] font-semibold leading-relaxed text-text flex-1">{question.text}</p>
            <div className="flex items-center gap-2 shrink-0">
              {isCustom && onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete() }}
                  className="font-mono text-[10px] text-muted hover:text-warn transition-colors"
                >
                  ✕
                </button>
              )}
              <span className={`text-[14px] transition-transform ${expanded ? 'rotate-180 text-accent' : 'text-muted'}`}>
                ▾
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-mono text-[10px] px-2.5 py-0.5 rounded-md border font-medium ${diff.classes}`}>
              {diff.label}
            </span>
            {question.topic && (
              <span className="font-mono text-[10px] text-muted bg-surface2 border border-border px-2 py-0.5 rounded-md">
                {question.topic}
              </span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pl-2 space-y-4 animate-slide-in">
          {/* Hint box */}
          <div className="rounded-xl p-4 border border-[#ffd4c6]"
               style={{ background: 'linear-gradient(135deg, #fff8f5 0%, #fffcf5 100%)' }}>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-accent font-semibold mb-1.5">
              💡 Keywords to cover
            </span>
            <p className="text-[13px] text-[#6b5a52] leading-relaxed">{question.hint}</p>
          </div>

          {/* Answer section */}
          {answer ? (
            <div className="rounded-xl p-4 bg-surface2 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-accent font-semibold">
                  ✦ Ideal Answer
                </span>
                <button
                  onClick={handleAnswer}
                  disabled={loading}
                  className="font-mono text-[10px] text-muted hover:text-text transition-colors disabled:opacity-40"
                >
                  {loading ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
              <p className="text-[13px] text-text leading-relaxed whitespace-pre-wrap">{answer}</p>
            </div>
          ) : (
            <button
              onClick={handleAnswer}
              disabled={loading}
              className="w-full py-2.5 rounded-xl border-2 border-accent/30 text-accent font-mono text-[11px] font-medium hover:bg-accent/8 transition-all disabled:opacity-40 hover:-translate-y-0.5"
            >
              {loading ? 'Generating answer...' : '✦ Get AI Answer'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
