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
  const [isTranscribing, setIsTranscribing] = useState(false)

  const onTranscriptRef = useRef(onTranscript)
  useEffect(() => { onTranscriptRef.current = onTranscript })

  const wakeLockRef = useRef<any>(null)

  const isRecording = recorderState === 'recording'

  useEffect(() => {
    onRecordingChange?.(isRecording)

    // Handle Screen Wake Lock to prevent screen from turning black
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        } catch (err) {
          console.error('Wake Lock request failed:', err)
        }
      }
    }

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release()
          wakeLockRef.current = null
        } catch (err) {
          console.error('Wake Lock release failed:', err)
        }
      }
    }

    if (isRecording) {
      void requestWakeLock()
    } else {
      void releaseWakeLock()
    }

    return () => {
      void releaseWakeLock()
    }
  }, [isRecording, onRecordingChange])

  useEffect(() => {
    if (!audioBlob) return

    const transcribe = async () => {
      setIsTranscribing(true)
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
        setTranscriptionError(err instanceof Error ? err.message : 'Transcription failed. Please try again.')
        onVoiceUnavailable?.()
      } finally {
        setIsTranscribing(false)
      }
    }

    void transcribe()
  }, [audioBlob])

  const handleStart = () => {
    setTranscriptionError(null)
    startRecording().catch(() => onVoiceUnavailable?.())
  }

  const handleStop = () => {
    stopRecording()
  }

  // Bar heights randomized once per render for each bar's animation keyframes
  const barAnimations = Array.from({ length: 18 }, (_, i) => ({
    heights: [6, 20 + (i % 3) * 12, 10 + (i % 5) * 8, 28 + (i % 4) * 6, 6] as number[],
    duration: 0.45 + (i % 5) * 0.08,
    delay: i * 0.04,
  }))

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <AnimatePresence mode="popLayout">

        {/* TRANSCRIBING STATE */}
        {isTranscribing && (
          <motion.div
            key="transcribing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              width: '100%',
              padding: '28px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{
                width: 36, height: 36,
                border: '2px solid rgba(52,211,153,0.2)',
                borderTop: '2px solid #064E3B',
                borderRadius: '50%',
              }}
            />
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{ fontSize: 12, color: '#064E3B', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.2em', textTransform: 'uppercase' }}
            >
              PROCESSING AUDIO...
            </motion.span>
          </motion.div>
        )}

        {/* RECORDING STATE */}
        {!isTranscribing && isRecording && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}
          >
            {/* Waveform */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 72, width: '100%' }}>
                {barAnimations.map((bar, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: bar.heights }}
                    transition={{ duration: bar.duration, repeat: Infinity, ease: 'easeInOut', delay: bar.delay }}
                    style={{ width: 5, background: 'linear-gradient(180deg, #064E3B, #ff9a6c)', borderRadius: 3, minHeight: 6 }}
                  />
                ))}
              </div>
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{ fontSize: 11, color: '#064E3B', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}
              >
                ● NODE ACTIVELY LISTENING
              </motion.span>
            </div>

            {/* Giant Submit Button */}
            <motion.button
              onClick={handleStop}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%',
                padding: '22px 24px',
                background: '#064E3B',
                border: 'none',
                color: '#000',
                fontFamily: 'Outfit, sans-serif',
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '0.12em',
                cursor: 'pointer',
                textTransform: 'uppercase',
                borderRadius: 4,
                touchAction: 'manipulation',
              }}
            >
              TAP TO SUBMIT ANSWER
            </motion.button>
          </motion.div>
        )}

        {/* IDLE STATE */}
        {!isTranscribing && !isRecording && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {/* Giant Mic Button */}
            <motion.button
              onClick={handleStart}
              disabled={disabled}
              whileTap={{ scale: disabled ? 1 : 0.97 }}
              style={{
                width: '100%',
                padding: '22px 24px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.25)',
                color: disabled ? '#444' : '#FFFFFF',
                fontFamily: 'Outfit, sans-serif',
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: '0.1em',
                cursor: disabled ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                touchAction: 'manipulation',
                opacity: disabled ? 0.4 : 1,
              }}
              aria-label="Start voice recording"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor" />
                <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="9" y1="22" x2="15" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              TAP TO SPEAK YOUR ANSWER
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>

      {(error || transcriptionError) && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ fontSize: 12, color: '#f87171', fontFamily: 'Outfit, sans-serif', textAlign: 'center', padding: '4px 0' }}
        >
          {error || transcriptionError}
        </motion.span>
      )}
    </div>
  )
}
