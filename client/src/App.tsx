import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AssessmentSplash } from './components/Assessment/AssessmentSplash'
import { QuestionShell } from './components/Assessment/QuestionShell'
import { AssessmentComplete } from './components/Assessment/AssessmentComplete'
import { AssessmentSubmitted } from './components/Assessment/AssessmentSubmitted'
import { EmailCapture } from './components/EmailCapture'
import { ThankYou } from './components/ThankYou'
import Dashboard from './components/Dashboard'
import { LandingPage } from './components/LandingPage'
import { PortalLogin } from './components/Portal/Login'
import { PortalResults } from './components/Portal/Results'
import { PortalClientDashboard } from './components/Portal/ClientDashboard'
import { AnimatePresence } from 'framer-motion'

type FunnelPhase = 'splash' | 'assessment' | 'complete' | 'email' | 'submitted' | 'thankyou'

function FunnelPage({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<FunnelPhase>('splash')
  const [sessionId, setSessionId] = useState<string>('')

  const exitButton = phase !== 'thankyou' && phase !== 'complete' && phase !== 'submitted' && (
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

  return (
    <>
      {exitButton}
      <AnimatePresence mode="wait">
        {phase === 'splash' && (
          <AssessmentSplash
            key="splash"
            onStart={() => setPhase('assessment')}
          />
        )}

        {phase === 'assessment' && (
          <QuestionShell
            key="assessment"
            onComplete={(id: string) => {
              setSessionId(id)
              setPhase('complete')
            }}
          />
        )}

        {phase === 'complete' && (
          <AssessmentComplete
            key="complete"
            onContinue={() => setPhase('email')}
          />
        )}

        {phase === 'email' && (
          <EmailCapture
            key="email"
            sessionId={sessionId}
            onComplete={() => setPhase('submitted')}
          />
        )}

        {phase === 'submitted' && (
          <AssessmentSubmitted
            key="submitted"
            onContinue={() => setPhase('thankyou')}
          />
        )}

        {phase === 'thankyou' && (
          <ThankYou key="thankyou" />
        )}
      </AnimatePresence>
    </>
  )
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
        <Route path="/portal/dashboard" element={<PortalClientDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
