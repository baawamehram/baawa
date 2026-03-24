import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  onRecordingChange?: (isRecording: boolean) => void
}

export function VoiceInput({ onTranscript, disabled = false, onRecordingChange }: VoiceInputProps) {
  const { recorderState, startRecording, stopRecording, audioBlob, error } = useVoiceRecorder()
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)

  const isRecording = recorderState === 'recording'

  // Notify parent when recording state changes
  useEffect(() => {
    onRecordingChange?.(isRecording)
  }, [isRecording, onRecordingChange])

  // When recording stops and we have a blob, transcribe it
  useEffect(() => {
    if (!audioBlob) return

    const transcribe = async () => {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      try {
        const res = await fetch(`${API_URL}/api/voice/transcribe`, {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) throw new Error(`Transcription failed: ${res.status}`)
        const data = (await res.json()) as { transcript: string }
        onTranscript(data.transcript)
      } catch {
        setTranscriptionError('Transcription failed. Please type your answer.')
      }
    }

    void transcribe()
  }, [audioBlob, onTranscript])

  const handleClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      setTranscriptionError(null)
      void startRecording()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <motion.button
        onClick={handleClick}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        style={{
          position: 'relative',
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: `2px solid ${isRecording ? '#06b6d4' : '#6366f1'}`,
          background: isRecording ? 'rgba(6,182,212,0.15)' : 'rgba(99,102,241,0.15)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : 1,
        }}
        aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
      >
        {/* Pulse ring while recording */}
        <AnimatePresence>
          {isRecording && (
            <motion.span
              key="pulse"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid #06b6d4',
                pointerEvents: 'none',
              }}
            />
          )}
        </AnimatePresence>

        {/* Mic SVG icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect
            x="9"
            y="2"
            width="6"
            height="11"
            rx="3"
            fill={isRecording ? '#06b6d4' : '#a5b4fc'}
          />
          <path
            d="M5 11a7 7 0 0 0 14 0"
            stroke={isRecording ? '#06b6d4' : '#a5b4fc'}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="12"
            y1="18"
            x2="12"
            y2="22"
            stroke={isRecording ? '#06b6d4' : '#a5b4fc'}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="9"
            y1="22"
            x2="15"
            y2="22"
            stroke={isRecording ? '#06b6d4' : '#a5b4fc'}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </motion.button>

      {error && (
        <span style={{ fontSize: 11, color: '#f87171', fontFamily: 'Inter, sans-serif' }}>
          {error}
        </span>
      )}

      {transcriptionError && (
        <span style={{ fontSize: 11, color: '#f87171', fontFamily: 'Inter, sans-serif' }}>
          {transcriptionError}
        </span>
      )}

      {isRecording && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{ fontSize: 11, color: '#06b6d4', fontFamily: 'Inter, sans-serif' }}
        >
          Recording… tap to stop
        </motion.span>
      )}
    </div>
  )
}
