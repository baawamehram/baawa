import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CosmicJourney } from './components/CosmicJourney'
import { AssessmentShell } from './components/Assessment/AssessmentShell'
import { EmailCapture } from './components/EmailCapture'
import { ThankYou } from './components/ThankYou'
import Dashboard from './components/Dashboard'
import { LandingPage } from './components/LandingPage'
import { API_URL } from './lib/api'

type FunnelPhase = 'journey' | 'assessment' | 'email' | 'thankyou'

interface GeoData {
  city: string | null
  country: string | null
  lat: number | null
  lon: number | null
}

function FunnelPage() {
  const [phase, setPhase] = useState<FunnelPhase>('journey')
  const [sessionId, setSessionId] = useState<string>('')
  const [geo, setGeo] = useState<GeoData>({ city: null, country: null, lat: null, lon: null })

  useEffect(() => {
    fetch(`${API_URL}/api/geo`)
      .then((res) => res.json())
      .then((data: GeoData) => setGeo(data))
      .catch(() => {
        // geo is non-critical, fall back to nulls
      })
  }, [])

  const handleJourneyComplete = useCallback(() => setPhase('assessment'), [])

  if (phase === 'journey') {
    return (
      <CosmicJourney
        city={geo.city}
        country={geo.country}
        lat={geo.lat}
        lon={geo.lon}
        onComplete={handleJourneyComplete}
      />
    )
  }

  if (phase === 'assessment') {
    return (
      <AssessmentShell
        onComplete={(id: string) => {
          setSessionId(id)
          setPhase('email')
        }}
      />
    )
  }

  if (phase === 'email') {
    return (
      <EmailCapture
        sessionId={sessionId}
        onComplete={() => setPhase('thankyou')}
      />
    )
  }

  // 'thankyou'
  return <ThankYou />
}

export default function App() {
  const [showFunnel, setShowFunnel] = useState(false)

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            showFunnel
              ? <FunnelPage />
              : <LandingPage onStart={() => setShowFunnel(true)} />
          }
        />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
