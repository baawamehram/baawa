import { motion } from 'framer-motion'

export type GenieState = 'idle' | 'thinking' | 'listening' | 'impressed'

interface GenieCharacterProps {
  state: GenieState
}

export function GenieCharacter({ state }: GenieCharacterProps) {
  const glowColor =
    state === 'thinking'
      ? '#8b5cf6'
      : state === 'listening'
        ? '#06b6d4'
        : state === 'impressed'
          ? '#f59e0b'
          : '#6366f1'

  const pulseScale = state === 'listening' ? [1, 1.06, 1] : [1, 1.02, 1]
  const pulseDuration = state === 'listening' ? 0.8 : 3

  return (
    <motion.div
      animate={{ scale: pulseScale }}
      transition={{ duration: pulseDuration, repeat: Infinity, ease: 'easeInOut' }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`Genie is ${state}`}
      >
        {/* Outer glow ring */}
        <motion.circle
          cx="40"
          cy="40"
          r="36"
          stroke={glowColor}
          strokeWidth="1"
          strokeOpacity={state === 'thinking' ? 0.8 : 0.4}
          fill="none"
          animate={{ strokeOpacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Body / vessel shape */}
        <ellipse cx="40" cy="52" rx="14" ry="10" fill={glowColor} fillOpacity="0.15" />
        <ellipse cx="40" cy="52" rx="14" ry="10" stroke={glowColor} strokeWidth="1" strokeOpacity="0.5" />

        {/* Wispy tail */}
        <path
          d="M 33 58 Q 30 68 40 72 Q 50 68 47 58"
          stroke={glowColor}
          strokeWidth="1.5"
          strokeOpacity="0.4"
          fill="none"
          strokeLinecap="round"
        />

        {/* Core orb (head) */}
        <motion.circle
          cx="40"
          cy="34"
          r="14"
          fill={glowColor}
          fillOpacity="0.2"
          animate={{ fillOpacity: state === 'thinking' ? [0.15, 0.35, 0.15] : 0.2 }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <circle cx="40" cy="34" r="14" stroke={glowColor} strokeWidth="1.5" strokeOpacity="0.7" fill="none" />

        {/* Face: eyes */}
        <motion.circle
          cx="35"
          cy="33"
          r="2"
          fill={glowColor}
          animate={{ r: state === 'impressed' ? [2, 2.8, 2] : 2 }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
        <motion.circle
          cx="45"
          cy="33"
          r="2"
          fill={glowColor}
          animate={{ r: state === 'impressed' ? [2, 2.8, 2] : 2 }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />

        {/* Face: mouth */}
        {state === 'impressed' ? (
          <path d="M 36 39 Q 40 43 44 39" stroke={glowColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        ) : state === 'thinking' ? (
          <path d="M 37 39 Q 40 38 43 39" stroke={glowColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M 37 39 Q 40 41 43 39" stroke={glowColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        )}

        {/* Crown / turban accent */}
        <path
          d="M 30 26 Q 40 18 50 26"
          stroke={glowColor}
          strokeWidth="1.5"
          strokeOpacity="0.6"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="40" cy="19" r="2.5" fill={glowColor} fillOpacity="0.7" />

        {/* Thinking dots */}
        {state === 'thinking' && (
          <>
            <motion.circle
              cx="57"
              cy="28"
              r="2"
              fill={glowColor}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <motion.circle
              cx="63"
              cy="24"
              r="2"
              fill={glowColor}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
            />
            <motion.circle
              cx="69"
              cy="20"
              r="2"
              fill={glowColor}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
            />
          </>
        )}
      </svg>
    </motion.div>
  )
}
