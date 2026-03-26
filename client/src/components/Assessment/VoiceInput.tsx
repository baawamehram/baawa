import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import { API_URL } from '../../lib/api'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  onVoiceUnavailable?: () => void
  disabled?: boolean
  onRecordingChange?: (isRecording: boolean) => void
}

export function VoiceInput({ onTranscript, onVoiceUnavailable, disabled = false, onRecordingChange }: VoiceInputProps) {
  const { recorderState, startRecording, stopRecording, audioBlob, error } = useVoiceRecorder()
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)

  // Keep a stable ref to onTranscript so it never causes the effect to re-run
  const onTranscriptRef = useRef(onTranscript)
  useEffect(() => { onTranscriptRef.current = onTranscript })

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
        onTranscriptRef.current(data.transcript)
      } catch {
        setTranscriptionError(null)
        onVoiceUnavailable?.()
      }
    }

    void transcribe()
  }, [audioBlob]) // audioBlob only — onTranscript is accessed via ref

  const handleClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      setTranscriptionError(null)
      startRecording().catch(() => onVoiceUnavailable?.())
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
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
          border: `2px solid ${isRecording ? '#FFB09A' : '#FF6B35'}`,
          background: isRecording ? 'rgba(255,176,154,0.2)' : 'rgba(255,107,53,0.12)',
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
                border: '2px solid #FF6B35',
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
            fill={isRecording ? '#FF6B35' : '#FFB09A'}
          />
          <path
            d="M5 11a7 7 0 0 0 14 0"
            stroke={isRecording ? '#FF6B35' : '#FFB09A'}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="12"
            y1="18"
            x2="12"
            y2="22"
            stroke={isRecording ? '#FF6B35' : '#FFB09A'}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="9"
            y1="22"
            x2="15"
            y2="22"
            stroke={isRecording ? '#FF6B35' : '#FFB09A'}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </motion.button>

      {error && (
        <span style={{ fontSize: 11, color: '#f87171', fontFamily: 'Outfit, sans-serif' }}>
          {error}
        </span>
      )}

      {transcriptionError && (
        <span style={{ fontSize: 11, color: '#f87171', fontFamily: 'Outfit, sans-serif' }}>
          {transcriptionError}
        </span>
      )}

      {isRecording ? (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{ fontSize: 11, color: '#FF6B35', fontFamily: 'Outfit, sans-serif' }}
        >
          Recording… tap to stop
        </motion.span>
      ) : (
        <span style={{ fontSize: 10, color: 'rgba(255,176,154,0.4)', fontFamily: 'Outfit, sans-serif' }}>
          any language
        </span>
      )}
    </div>
  )
}
