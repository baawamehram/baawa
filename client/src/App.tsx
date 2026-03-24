import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CosmicJourney } from './components/CosmicJourney'
import { AssessmentShell } from './components/Assessment/AssessmentShell'

type FunnelPhase = 'journey' | 'assessment' | 'done'

function FunnelPage() {
  const [phase, setPhase] = useState<FunnelPhase>('journey')

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
      <AssessmentShell onComplete={() => setPhase('done')} />
    )
  }

  // 'done' — email capture placeholder (Task 10)
  return (
    <div style={{ background: '#0a0a0f', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24 }}>Email capture (Task 10)</div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FunnelPage />} />
        <Route path="/dashboard" element={<div style={{color:'#fff',padding:32}}>Dashboard (Task 11)</div>} />
      </Routes>
    </BrowserRouter>
  )
}
