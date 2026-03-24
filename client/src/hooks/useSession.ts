import { useState, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface SessionState {
  sessionId: string | null
  question: string | null
  questionCount: number
  loading: boolean
  done: boolean
  error: string | null
}

export interface UseSessionReturn {
  state: SessionState
  startSession: () => Promise<void>
  submitAnswer: (answer: string) => Promise<void>
}

export function useSession(): UseSessionReturn {
  const [state, setState] = useState<SessionState>({
    sessionId: null,
    question: null,
    questionCount: 0,
    loading: false,
    done: false,
    error: null,
  })

  const startSession = useCallback(async () => {
    if (state.loading || state.sessionId) return
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch(`${API_URL}/api/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error(`Failed to start session: ${res.status}`)
      const data = (await res.json()) as { sessionId: string; question: string }
      setState((s) => ({
        ...s,
        sessionId: data.sessionId,
        question: data.question,
        questionCount: 1,
        loading: false,
      }))
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }))
    }
  }, [state.loading, state.sessionId])

  const submitAnswer = useCallback(
    async (answer: string) => {
      if (!state.sessionId) return
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const res = await fetch(`${API_URL}/api/sessions/${state.sessionId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer }),
        })
        if (!res.ok) throw new Error(`Failed to submit answer: ${res.status}`)
        const data = (await res.json()) as {
          question: string
          done: boolean
          questionCount: number
        }
        setState((s) => ({
          ...s,
          question: data.done ? null : data.question,
          questionCount: data.questionCount,
          done: data.done,
          loading: false,
        }))
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }))
      }
    },
    [state.sessionId],
  )

  return { state, startSession, submitAnswer }
}
