import { useState, useEffect } from 'react'
import { useReducedMotion } from 'framer-motion'
import { SolarSystem } from './SolarSystem'
import { EarthZoom } from './EarthZoom'
import { LocationReveal } from './LocationReveal'

type Phase = 'solar' | 'earth' | 'location' | 'done'

interface CosmicJourneyProps {
  city: string | null
  country: string | null
  lat: number | null
  lon: number | null
  onComplete: () => void
}

const STATIC_STARS = [
  { top: '8%', left: '15%' }, { top: '12%', left: '72%' }, { top: '23%', left: '38%' },
  { top: '31%', left: '88%' }, { top: '45%', left: '5%' },  { top: '55%', left: '62%' },
  { top: '67%', left: '28%' }, { top: '74%', left: '91%' }, { top: '82%', left: '47%' },
  { top: '90%', left: '18%' }, { top: '18%', left: '54%' }, { top: '39%', left: '76%' },
  { top: '61%', left: '11%' }, { top: '78%', left: '65%' }, { top: '5%',  left: '44%' },
]

export function CosmicJourney({ city, country, lat, lon, onComplete }: CosmicJourneyProps) {
  const [phase, setPhase] = useState<Phase>('solar')
  const reducedMotion = useReducedMotion()

  // Reduced-motion: skip Three.js phases, call onComplete after 1500ms
  useEffect(() => {
    if (!reducedMotion) return
    const timer = setTimeout(() => {
      onComplete()
    }, 1500)
    return () => clearTimeout(timer)
  }, [reducedMotion, onComplete])

  const advance = () => {
    setPhase((p) => {
      if (p === 'solar') return 'earth'
      if (p === 'earth') return 'location'
      onComplete()
      return 'done'
    })
  }

  const skipButton = (
    <button
      onClick={onComplete}
      style={{
        position: 'absolute', top: 16, right: 16,
        background: 'rgba(99,102,241,0.2)', border: '1px solid #6366f1',
        color: '#a5b4fc', padding: '8px 16px', borderRadius: 8,
        cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 14,
        zIndex: 100,
      }}
    >
      Skip →
    </button>
  )

  return (
    <div style={{ background: '#0a0a0f', width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {reducedMotion ? (
        <>
          {STATIC_STARS.map((s, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                top: s.top,
                left: s.left,
                width: i % 3 === 0 ? 3 : 2,
                height: i % 3 === 0 ? 3 : 2,
                borderRadius: '50%',
                background: '#ffffff',
                opacity: 0.6 + (i % 4) * 0.1,
              }}
            />
          ))}
        </>
      ) : (
        <>
          {phase === 'solar' && <SolarSystem onComplete={advance} />}
          {phase === 'earth' && <EarthZoom onComplete={advance} />}
          {phase === 'location' && (
            <LocationReveal
              city={city ?? 'Your City'}
              country={country ?? ''}
              lat={lat ?? 51.5}
              lon={lon ?? -0.1}
              onComplete={advance}
            />
          )}
        </>
      )}

      {skipButton}
    </div>
  )
}
