import { useState } from 'react'
import type { Question } from '../types'

const difficultyClass: Record<Question['difficulty'], string> = {
  Hard: 'text-warn border-warn/30 bg-warn/8',
  Medium: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/8',
  Easy: 'text-accent border-accent/30 bg-accent/10',
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

  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      className={`animate-fade-up bg-surface border rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:-translate-y-px ${
        expanded
          ? 'border-accent'
          : isCustom
          ? 'border-dashed border-accent/40 hover:border-accent/60'
          : 'border-border hover:border-accent/30'
      }`}
      style={{ animationDelay: `${index * 0.07}s`, opacity: 0 }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="font-mono text-[10px] text-muted uppercase tracking-widest">
          {isCustom ? 'Custom' : `Q ${String(index + 1).padStart(2, '0')}`}
        </div>
        {isCustom && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="font-mono text-[10px] text-muted hover:text-warn transition-colors"
          >
            ✕ Remove
          </button>
        )}
      </div>

      <p className="text-[15px] font-semibold leading-relaxed text-text">{question.text}</p>

      <div className="flex items-center gap-2 mt-3">
        <span
          className={`font-mono text-[10px] px-2 py-0.5 rounded border ${difficultyClass[question.difficulty]}`}
        >
          {question.difficulty}
        </span>
        <span className="font-mono text-[10px] text-muted">{question.topic}</span>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          <div className="font-mono text-[12px] text-[#8a9ab0] leading-relaxed">
            <span className="block text-accent font-medium mb-1.5">💡 Hint — Keywords to cover:</span>
            {question.hint}
          </div>

          {answer ? (
            <div className="font-mono text-[12px] text-[#8a9ab0] leading-relaxed">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-accent font-medium">✦ Ideal Answer:</span>
                <button
                  onClick={handleAnswer}
                  disabled={loading}
                  className="text-[10px] text-muted hover:text-text transition-colors disabled:opacity-40"
                >
                  {loading ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
              <p className="whitespace-pre-wrap">{answer}</p>
            </div>
          ) : (
            <button
              onClick={handleAnswer}
              disabled={loading}
              className="w-full py-2 rounded-xl border border-accent/30 text-accent font-mono text-[11px] hover:bg-accent/10 transition-colors disabled:opacity-40"
            >
              {loading ? 'Generating answer...' : '✦ Get AI Answer'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
