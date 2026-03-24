import { useState } from 'react'
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

export function CosmicJourney({ city, country, lat, lon, onComplete }: CosmicJourneyProps) {
  const [phase, setPhase] = useState<Phase>('solar')

  const advance = () => {
    setPhase((p) => {
      if (p === 'solar') return 'earth'
      if (p === 'earth') return 'location'
      onComplete()
      return 'done'
    })
  }

  return (
    <div style={{ background: '#0a0a0f', width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
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
    </div>
  )
}
