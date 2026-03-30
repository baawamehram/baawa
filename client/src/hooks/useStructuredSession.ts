import { useState, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface QuestionData {
  question: string
  questionType?: 'open_text' | 'mcq' | 'slider' | 'ranking'
  options?: string[]
  sliderConfig?: { min: number; max: number; label: string }
}

export interface ScoringResult {
  score: number
  base_score: number
  adjustment: number
  gut_check: string
  founder_type: 'early_stage' | 'building' | 'scaling'
  breakdown: {
    pmf: number
    validation: number
    growth: number
    mindset: number
    revenue: number
  }
}

export function useStructuredSession() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [partialScore, setPartialScore] = useState(0)
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null)

  const startSession = useCallback(async (intakeData?: {
    name?: string
    region?: string
    language?: string
    email?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      console.log('Starting session with intake data:', intakeData)
      const response = await fetch(`${API_URL}/api/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intakeData || {})
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Failed to start session' }))
        throw new Error(errData.error || 'Failed to start session')
      }
      const data = await response.json()
      console.log('Session started:', data)
      setSessionId(data.sessionId)
      setCurrentQuestion({
        question: data.question,
        questionType: data.questionType || 'open_text'
      })
      setQuestionIndex(0)
      setPartialScore(0)
    } catch (err) {
      const msg = (err as Error).message
      console.error('Session start error:', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const submitAnswer = useCallback(
    async (
      questionIndex: number,
      type: 'open_text' | 'mcq' | 'slider' | 'ranking',
      value: string | number | string[],
      displayText: string,
      inputType?: 'voice' | 'text' | 'click' | 'drag'
    ) => {
      if (!sessionId) return
      setLoading(true)
      setError(null)

      try {
        const payload = { type, value }
        const body = {
          questionIndex,
          payload,
          displayText,
          inputType: inputType || 'text',
          clientLatency: 0
        }
        console.log('Submitting answer:', body)
        const response = await fetch(`${API_URL}/api/sessions/${sessionId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('Answer submission failed:', errData)
          throw new Error(errData.error || 'Failed to submit answer')
        }
        const data = await response.json()
        console.log('Answer accepted:', data)

        // Increment partial score by 12.5 (8 questions = 100 points)
        setPartialScore(prev => prev + 12.5)

        if (data.done) {
          setDone(true)
          return
        }

        setCurrentQuestion({
          question: data.question,
          questionType: data.questionType,
          options: data.options,
          sliderConfig: data.sliderConfig
        })
        setQuestionIndex(prev => prev + 1)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [sessionId]
  )

  const completeSession = useCallback(
    async (email: string, phone?: string) => {
      if (!sessionId) return
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${API_URL}/api/sessions/${sessionId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, phone })
        })

        if (!response.ok) throw new Error('Failed to complete session')
        const data = await response.json()
        setScoringResult(data)
        return data
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [sessionId]
  )

  return {
    sessionId,
    currentQuestion,
    questionIndex,
    loading,
    done,
    error,
    partialScore,
    scoringResult,
    startSession,
    submitAnswer,
    completeSession
  }
}
