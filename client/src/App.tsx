import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AssessmentShell } from './components/Assessment/AssessmentShell'
import { EmailCapture } from './components/EmailCapture'
import { ThankYou } from './components/ThankYou'
import Dashboard from './components/Dashboard'
import { LandingPage } from './components/LandingPage'
import { PortalLogin } from './components/Portal/Login'
import { PortalResults } from './components/Portal/Results'

type FunnelPhase = 'assessment' | 'email' | 'thankyou'

function FunnelPage({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<FunnelPhase>('assessment')
  const [sessionId, setSessionId] = useState<string>('')

  const exitButton = phase !== 'thankyou' && (
    <button
      onClick={onExit}
      style={{
        position: 'fixed', top: 'calc(20px + env(safe-area-inset-top))', left: 'calc(20px + env(safe-area-inset-left))', zIndex: 1000,
        background: 'rgba(52,211,153,0.12)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(52,211,153,0.35)', color: '#fff',
        padding: '8px 16px', borderRadius: '6px', cursor: 'pointer',
        fontSize: '13px', fontFamily: 'Outfit, sans-serif',
        display: 'flex', alignItems: 'center', gap: '6px'
      }}
    >
      ← Exit
    </button>
  )

  if (phase === 'assessment') {
    return (
      <>
        {exitButton}
        <AssessmentShell
          intakeData={null}
          onComplete={(id: string) => {
            setSessionId(id)
            setPhase('email')
          }}
        />
      </>
    )
  }

  if (phase === 'email') {
    return (
      <>
        {exitButton}
        <EmailCapture
          sessionId={sessionId}
          onComplete={() => setPhase('thankyou')}
        />
      </>
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
              ? <FunnelPage onExit={() => setShowFunnel(false)} />
              : <LandingPage onStart={() => setShowFunnel(true)} />
          }
        />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/portal" element={<Navigate to="/portal/login" replace />} />
        <Route path="/portal/login" element={<PortalLogin />} />
        <Route path="/portal/results" element={<PortalResults />} />
      </Routes>
    </BrowserRouter>
  )
}
