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
          border: `1px solid ${isRecording ? '#FFFFFF' : 'rgba(255,255,255,0.2)'}`,
          background: isRecording ? 'rgba(255,255,255,0.1)' : 'transparent',
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
                border: '1px solid fade-out(#FFF, 0.5)',
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
            fill={isRecording ? '#FFFFFF' : 'rgba(255,255,255,0.8)'}
          />
          <path
            d="M5 11a7 7 0 0 0 14 0"
            stroke={isRecording ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="12"
            y1="18"
            x2="12"
            y2="22"
            stroke={isRecording ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="9"
            y1="22"
            x2="15"
            y2="22"
            stroke={isRecording ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {/* Simulated Waveform */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 20 }}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div
                key={i}
                animate={{
                  height: [8, 20, 12, 18, 10],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: 'easeInOut'
                }}
                style={{
                  width: 2,
                  background: '#FFFFFF',
                  borderRadius: 1
                }}
              />
            ))}
          </div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ fontSize: 10, color: '#FFFFFF', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}
          >
            NODE LISTENING... TAP TO INGEST
          </motion.span>
        </div>
      ) : (
        <span style={{ fontSize: 9, color: '#444', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          STRATEGY INGESTION READY
        </span>
      )}
    </div>
  )
}
