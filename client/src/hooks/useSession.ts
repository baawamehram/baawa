import { useState, useCallback } from 'react'
import { API_URL } from '../lib/api'

export interface SessionState {
  sessionId: string | null
  question: string | null
  questionCount: number
  loading: boolean
  done: boolean
  error: string | null
  // New intake fields
  name?: string
  region?: string
  country?: string
  language?: string
  email?: string
}

export interface UseSessionReturn {
  state: SessionState
  startSession: () => Promise<void>
  submitAnswer: (answer: string, meta?: { inputType: 'voice' | 'text', latency: number }) => Promise<void>
  // New setters
  setIntakeData: (data: { name?: string; region?: string; country?: string; language?: string }) => void
  setEmail: (email: string) => void
}

export function useSession(): UseSessionReturn {
  const [state, setState] = useState<SessionState>({
    sessionId: null,
    question: null,
    questionCount: 0,
    loading: false,
    done: false,
    error: null,
    // intake defaults are undefined
  })

  const startSession = useCallback(async () => {
    if (state.loading || state.sessionId) return
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch(`${API_URL}/api/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: state.name,
          region: state.region,
          country: state.country,
          language: state.language,
          email: state.email,
        }),
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
  }, [state.loading, state.sessionId, state.name, state.region, state.country, state.language, state.email])

  const submitAnswer = useCallback(
    async (answer: string, meta?: { inputType: 'voice' | 'text', latency: number }) => {
      if (!state.sessionId) return
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const res = await fetch(`${API_URL}/api/sessions/${state.sessionId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            answer,
            inputType: meta?.inputType,
            clientLatency: meta?.latency
          }),
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
          questionCount: data.questionCount || (s.questionCount + 1),
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
    [state.sessionId]
  )

  // New setters for intake data
  const setIntakeData = useCallback((data: { name?: string; region?: string; country?: string; language?: string }) => {
    setState((s) => ({ ...s, ...data }))
  }, [])

  const setEmail = useCallback((email: string) => {
    setState((s) => ({ ...s, email }))
  }, [])

  return { state, startSession, submitAnswer, setIntakeData, setEmail }
}
