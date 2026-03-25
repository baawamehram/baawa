import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { motion } from 'framer-motion'

const WELCOME_MESSAGES = [
  "Let's get you to great heights.",
  "Something great starts right here.",
  "This is where things start moving.",
  "Your breakthrough begins now.",
  "Time to find out what you're truly capable of.",
]

interface Props {
  city: string
  country: string
  lat: number
  lon: number
  onComplete: () => void
}

export function LocationReveal({ city, country, lat, lon, onComplete }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [message] = useState(() => WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)])

  useEffect(() => {
    const container = mapRef.current
    if (!container) return

    const map = L.map(container, {
      center: [lat, lon],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
    })

    // Dark tile layer (CartoDB dark matter — free, no API key)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map)

    // Pulsing marker
    const pulseIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:20px;height:20px;
        background:#FF6B35;border-radius:50%;
        box-shadow:0 0 0 0 rgba(255,107,53,0.7);
        animation:pulse 1.5s infinite;
      "></div>
      <style>
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255,107,53,0.7); }
          70% { box-shadow: 0 0 0 15px rgba(255,107,53,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,107,53,0); }
        }
      </style>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })
    L.marker([lat, lon], { icon: pulseIcon }).addTo(map)

    const timer = setTimeout(onComplete, 4000)

    return () => {
      clearTimeout(timer)
      map.remove()
    }
  }, [lat, lon, onComplete])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{
          position: 'absolute', bottom: 80, left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10,10,10,0.9)',
          border: '1px solid rgba(255,107,53,0.4)',
          borderRadius: 16, padding: '20px 32px',
          textAlign: 'center', backdropFilter: 'blur(10px)',
          color: '#fff',
          fontFamily: 'Outfit, sans-serif',
        }}
      >
        <div style={{ fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: 8 }}>
          {city}{country ? `, ${country}` : ''}
        </div>
        <div style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: '#fff', lineHeight: 1.2, marginBottom: 8 }}>
          {message}
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,176,154,0.6)', fontFamily: 'Outfit, sans-serif' }}>
          Your assessment is ready.
        </div>
      </motion.div>
    </div>
  )
}
