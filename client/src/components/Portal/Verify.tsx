import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { API_URL } from '../../lib/api'

export function PortalVerify() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')

    // Remove token from URL immediately (before the POST) to avoid log exposure
    window.history.replaceState({}, '', '/portal/verify')

    if (!token) {
      setError('Invalid link. Please request a new one.')
      return
    }

    const verify = async () => {
      try {
        const res = await fetch(`${API_URL}/api/portal/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError((data as { error?: string }).error ?? 'This link has expired. Request a new one.')
          return
        }
        navigate('/portal/results', { replace: true })
      } catch {
        setError('Network error. Please check your connection.')
      }
    }

    void verify()
  }, []) // intentionally empty — run once on mount only // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      {error ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, color: '#FDFCFA', marginBottom: 20, lineHeight: 1.6 }}>{error}</p>
          <Link to="/portal/login" style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#FF6B35' }}>
            Request a new link →
          </Link>
        </motion.div>
      ) : (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, color: '#FFB09A' }}
        >
          Logging you in…
        </motion.div>
      )}
    </div>
  )
}
