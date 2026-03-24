import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CosmicJourney } from './components/CosmicJourney'
import { AssessmentShell } from './components/Assessment/AssessmentShell'
import { EmailCapture } from './components/EmailCapture'
import { ThankYou } from './components/ThankYou'
import Dashboard from './components/Dashboard'

type FunnelPhase = 'journey' | 'assessment' | 'email' | 'thankyou'

function FunnelPage() {
  const [phase, setPhase] = useState<FunnelPhase>('journey')
  const [sessionId, setSessionId] = useState<string>('')

  if (phase === 'journey') {
    return (
      <CosmicJourney
        city={null}
        country={null}
        lat={null}
        lon={null}
        onComplete={() => setPhase('assessment')}
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
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FunnelPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
