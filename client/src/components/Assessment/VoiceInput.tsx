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
      } catch (err) {
        setTranscriptionError(err instanceof Error ? err.message : 'Transcription failed. Is backend running?')
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, width: '100%' }}>
      <AnimatePresence mode="popLayout">
        {!isRecording ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
          >
            <motion.button
              onClick={handleClick}
              disabled={disabled}
              whileHover={{ scale: disabled ? 1 : 1.05 }}
              whileTap={{ scale: disabled ? 1 : 0.95 }}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: disabled ? 0.4 : 1,
              }}
              aria-label="Start voice input"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="9" y="2" width="6" height="11" rx="3" fill="rgba(255,255,255,0.8)" />
                <path d="M5 11a7 7 0 0 0 14 0" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="18" x2="12" y2="22" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
                <line x1="9" y1="22" x2="15" y2="22" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </motion.button>
            <span style={{ fontSize: 9, color: '#444', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              STRATEGY INGESTION READY
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="recording"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 32,
              padding: '24px 0',
            }}
          >
            {/* Highly Active Audio Visualizer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 64 }}>
                {[...Array(15)].map((_, i) => {
                  const randomHeightBase = Math.random() * 30 + 10;
                  return (
                    <motion.div
                      key={i}
                      animate={{
                        height: [12, randomHeightBase + 24, randomHeightBase, randomHeightBase + 30, 12],
                      }}
                      transition={{
                        duration: 0.5 + Math.random() * 0.3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.05
                      }}
                      style={{
                        width: 4,
                        background: '#ff6b35',
                        borderRadius: 2
                      }}
                    />
                  );
                })}
              </div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{ fontSize: 12, color: '#ff6b35', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}
              >
                NODE ACTIVELY LISTENING...
              </motion.span>
            </div>

            {/* Explicit Submit Button */}
            <motion.button
              onClick={handleClick}
              whileHover={{ backgroundColor: '#ff6b35', color: '#000' }}
              style={{
                background: 'transparent',
                border: '1px solid #ff6b35',
                color: '#ff6b35',
                padding: '16px 40px',
                borderRadius: '4px',
                fontFamily: 'Outfit, sans-serif',
                fontSize: 14,
                fontWeight: 'bold',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.2s',
              }}
            >
              SUBMIT ANSWER
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {(error || transcriptionError) && (
        <span style={{ fontSize: 11, color: '#f87171', fontFamily: 'Outfit, sans-serif', marginTop: 8 }}>
          {error || transcriptionError}
        </span>
      )}
    </div>
  )
}
