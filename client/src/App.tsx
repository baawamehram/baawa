import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CosmicJourney } from './components/CosmicJourney'

function FunnelPage() {
  const [showJourney, setShowJourney] = useState(true)

  if (showJourney) {
    return (
      <CosmicJourney
        city={null}
        country={null}
        lat={null}
        lon={null}
        onComplete={() => setShowJourney(false)}
      />
    )
  }

  return (
    <div style={{ background: '#0a0a0f', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24 }}>Assessment starts here (Task 9)</div>
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
