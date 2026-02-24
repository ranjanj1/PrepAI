import { useCallback, useRef, useState } from 'react'
import type { AnalysisResult, ProgressStep } from '../types'

type State =
  | { status: 'idle' }
  | { status: 'loading'; steps: ProgressStep[]; mode: 'url' | 'jd' }
  | { status: 'done'; result: AnalysisResult; url: string; analysisId: number }
  | { status: 'error'; message: string }

export function useAnalysis() {
  const [state, setState] = useState<State>({ status: 'idle' })
  const wsRef = useRef<WebSocket | null>(null)

  const analyze = useCallback((input: string, mode: 'url' | 'jd') => {
    const tok = localStorage.getItem('token') ?? ''
    const wsUrl = `ws://localhost:8000/ws/analyze?token=${encodeURIComponent(tok)}`

    setState({ status: 'loading', steps: [], mode })

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify(mode === 'url' ? { url: input } : { jd_text: input }))
    }

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      console.log('[WS]', msg.event, msg)
      if (msg.event === 'progress') {
        setState((prev) => {
          if (prev.status !== 'loading') return prev
          return {
            status: 'loading',
            steps: [...prev.steps, { step: msg.step, message: msg.message }],
            mode: prev.mode,
          }
        })
      } else if (msg.event === 'result') {
        setState({ status: 'done', result: msg.data, url: input, analysisId: msg.analysis_id })
        ws.close()
      } else if (msg.event === 'error') {
        setState({ status: 'error', message: msg.message })
        ws.close()
      }
    }

    ws.onerror = () => {
      setState({ status: 'error', message: 'Connection failed' })
    }

    ws.onclose = (e) => {
      if (e.code === 4001) {
        setState({ status: 'error', message: 'Unauthorized — please log in again' })
        return
      }
      setState((prev) => {
        if (prev.status === 'loading') {
          return { status: 'error', message: 'Connection closed before results arrived. Please try again.' }
        }
        return prev
      })
    }
  }, [])

  const reset = useCallback(() => {
    wsRef.current?.close()
    setState({ status: 'idle' })
  }, [])

  return { state, analyze, reset }
}
