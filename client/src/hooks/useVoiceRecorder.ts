import { useState, useRef, useCallback } from 'react'

export type RecorderState = 'idle' | 'recording' | 'stopped'

export interface UseVoiceRecorderReturn {
  recorderState: RecorderState
  startRecording: () => Promise<void>
  stopRecording: () => void
  audioBlob: Blob | null
  error: string | null
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [recorderState, setRecorderState] = useState<RecorderState>('idle')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    setError(null)
    setAudioBlob(null)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach((t) => t.stop())
        setRecorderState('stopped')
      }

      mediaRecorder.start()
      setRecorderState('recording')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied')
      setRecorderState('idle')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recorderState === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [recorderState])

  return { recorderState, startRecording, stopRecording, audioBlob, error }
}
