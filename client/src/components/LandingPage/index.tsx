import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogoLight, LogoDark } from '../Logo'

const SERVICES = [
  "Strategy", "Execution", "Marketing", "Development",
  "Positioning", "Growth", "Operations", "Scale",
  "Reframing", "Psychological Arbitrage", "Behavioral Design", "Leverage Management",
  "Value Perception", "Pricing Power", "Customer Psychology", "Assumption Challenging"
]

const NAV_SEQUENCES = [
  ...SERVICES.map(s => ({ text: s, prefix: "We do: ", color: "#FF6B35" })),
  { text: "a jack of all trades,", prefix: "WE ARE: ", color: "#6B6460" },
  { text: "is a master of none,", prefix: "WE ARE: ", color: "#6B6460" },
  { text: "but oftentimes better", prefix: "WE ARE: ", color: "#6B6460" },
  { text: "than a master of one.", prefix: "WE ARE: ", color: "#6B6460" }
]

const IDENTITY_ITEMS = [
  { text: "Entrepreneurs", color: "#FF6B35" },
  { text: "Filmmakers", color: "#FF6B35" },
  { text: "Investment Bankers", color: "#FF6B35" },
  { text: "Consultants", color: "#FF6B35" },
  { text: "Agency Owners", color: "#FF6B35" },
  { text: "AI Engineers", color: "#FF6B35" },
  { text: "Brand Strategists", color: "#FF6B35" },
  { text: "Behavioral Architects", color: "#FF6B35" },
  { text: "Geeks who obsess over business", color: "#FF6B35" },
  // The dark grey sequence (4 parts)
  { text: "a jack of all trades,", color: "#6B6460", hidePrefix: true },
  { text: "is a master of none,", color: "#6B6460", hidePrefix: true },
  { text: "but oftentimes better", color: "#6B6460", hidePrefix: true },
  { text: "than a master of one.", color: "#6B6460", hidePrefix: true },
]

function IdentityTypewriter() {
  const [text, setText] = useState('')
  const [index, setIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [speed, setSpeed] = useState(70)

  const currentItem = IDENTITY_ITEMS[index % IDENTITY_ITEMS.length]

  useEffect(() => {
    let timer: number
    const word = currentItem.text
    if (!isDeleting && text === word) {
      timer = window.setTimeout(() => setIsDeleting(true), 1800)
    } else if (isDeleting && text === '') {
      setIsDeleting(false)
      setIndex(prev => prev + 1)
      setSpeed(70)
    } else {
      timer = window.setTimeout(() => {
        setText(word.substring(0, text.length + (isDeleting ? -1 : 1)))
        setSpeed(isDeleting ? 30 : 70)
      }, speed)
    }
    return () => clearTimeout(timer)
  }, [text, isDeleting, index, speed, currentItem.text])

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
      {!currentItem.hidePrefix && (
        <span style={{ 
          fontFamily: "'Cormorant Garamond', serif", 
          fontSize: 'clamp(28px, 5vw, 52px)', 
          fontWeight: 300, 
          color: 'rgba(253,252,250,0.5)', 
          lineHeight: 1.1, 
          whiteSpace: 'nowrap' 
        }}>We are:</span>
      )}
      <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 0 }}>
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(28px, 5vw, 52px)',
          fontWeight: 700,
          fontStyle: 'italic',
          color: currentItem.color,
          minWidth: 4,
          lineHeight: 1.1,
          transition: 'color 0.4s ease-in-out',
        }}>{text}</span>
        <span style={{
          display: 'inline-block',
          width: 3,
          height: 'clamp(28px, 5vw, 50px)',
          background: currentItem.color,
          marginLeft: 4,
          borderRadius: 1,
          animation: 'cursor-blink 0.9s step-end infinite',
          verticalAlign: 'middle',
          flexShrink: 0,
          transition: 'background 0.4s ease-in-out',
        }} />
      </div>
    </div>
  )
}

function TypewriterText() {
  const [text, setText] = useState('')
  const [index, setIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [typingSpeed, setTypingSpeed] = useState(100)

  const currentItem = NAV_SEQUENCES[index % NAV_SEQUENCES.length]

  useEffect(() => {
    let timer: number
    const word = currentItem.text
    if (!isDeleting && text === word) {
      timer = window.setTimeout(() => setIsDeleting(true), 1500)
    } else if (isDeleting && text === '') {
      setIsDeleting(false)
      setIndex(prev => prev + 1)
      setTypingSpeed(100)
    } else {
      timer = window.setTimeout(() => {
        setText(word.substring(0, text.length + (isDeleting ? -1 : 1)))
        setTypingSpeed(isDeleting ? 40 : 100)
      }, typingSpeed)
    }
    return () => clearTimeout(timer)
  }, [text, isDeleting, index, typingSpeed, currentItem.text])

  return (
    <div style={{ fontSize: '12px', color: currentItem.color, fontWeight: 600, letterSpacing: '0.02em', height: '14px', marginTop: '2px', display: 'flex', alignItems: 'center', transition: 'color 0.4s ease-in-out' }}>
      <span>{currentItem.prefix}{text}</span>
      <span style={{ display: 'inline-block', width: '2px', height: '12px', backgroundColor: currentItem.color, marginLeft: '2px', animation: 'cursor-blink 1s step-end infinite', transition: 'background-color 0.4s ease-in-out' }} />
      <style>{`@keyframes cursor-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
    </div>
  )
}

const HERO_SLIDES = [
  {
    kicker: "Logic vs. Alchemy",
    title1: "A problem solved logically",
    title2: "is often solved boringly.",
    subtitle: "We don't just optimize what's already there. We find the psychological levers that change behavior entirely.",
  },
  {
    kicker: "Perception over Reality",
    title1: "A flower is just a weed",
    title2: "with an advertising budget.",
    subtitle: "If you can't outspend them, outsmart them. We help clients reposition their entire offering without changing the product.",
  },
  {
    kicker: "Logic's Limit",
    title1: "The cost of being reasonable",
    title2: "is a reduction in value.",
    subtitle: "When you only do what's logical, you do what everyone else does. Real breakthroughs live in the territory logic is afraid of.",
  },
  {
    kicker: "Behavioral Design",
    title1: "Don't change the person.",
    title2: "Change the environment.",
    subtitle: "Stop fighting your customers' psychology. We rebuild your strategy around how humans actually make decisions.",
  },
  {
    kicker: "Efficiency is a Trap",
    title1: "The most efficient way",
    title2: "to win is to be different.",
    subtitle: "If everyone is chasing the same metrics, the real prize is the one nobody's measuring. We find the invisible gaps.",
  },
  {
    kicker: "Contextual Alchemy",
    title1: "A £5 bottle of water",
    title2: "is a bargain in a desert.",
    subtitle: "Contextual value outweighs product features. We help you change the context of your business to unlock premium pricing.",
  },
]

function MotionBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let width = canvas.width = window.innerWidth
    let height = canvas.height = window.innerHeight
    const particles: { x: number; y: number; vx: number; vy: number; radius: number }[] = []
    for (let i = 0; i < 60; i++) {
      particles.push({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, radius: Math.random() * 1.5 + 0.5 })
    }
    let animationFrame: number
    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = width; if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height; if (p.y > height) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(60,60,60,0.5)'; ctx.fill()
      })
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(60,60,60,${0.2 - dist / 650})`; ctx.lineWidth = 1; ctx.stroke()
          }
        }
      }
      animationFrame = requestAnimationFrame(draw)
    }
    draw()
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight }
    window.addEventListener('resize', handleResize)
    return () => { cancelAnimationFrame(animationFrame); window.removeEventListener('resize', handleResize) }
  }, [])
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none', opacity: 0.8 }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(253,252,250,0) 0%, rgba(253,252,250,1) 95%)', pointerEvents: 'none' }} />
    </div>
  )
}

function DynamicHeroText() {
  const [slide, setSlide] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setSlide(prev => (prev + 1) % HERO_SLIDES.length), 4000)
    return () => clearInterval(timer)
  }, [])
  return (
    <div style={{ position: 'relative', minHeight: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: '40px' }}>
      <AnimatePresence mode="wait">
        <motion.div key={slide} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.6, ease: 'easeInOut' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: '20px' }}>{HERO_SLIDES[slide].kicker}</div>
          <h1 style={{ margin: '0 0 20px', lineHeight: 1.1 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(36px, 6.5vw, 80px)', fontWeight: 400, color: '#0A0A0A', display: 'block' }}>{HERO_SLIDES[slide].title1}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(36px, 6.5vw, 80px)', fontWeight: 700, fontStyle: 'italic', color: '#FF6B35', display: 'block' }}>{HERO_SLIDES[slide].title2}</div>
          </h1>
          <p style={{ fontSize: '17px', color: '#6B6460', lineHeight: 1.7, maxWidth: '560px', margin: '0 auto' }}>{HERO_SLIDES[slide].subtitle}</p>
        </motion.div>
      </AnimatePresence>
      {/* Slide dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
        {HERO_SLIDES.map((_, i) => (
          <button key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? 20 : 6, height: 6, borderRadius: 3, background: i === slide ? '#FF6B35' : 'rgba(107,100,96,0.3)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.3s' }} />
        ))}
      </div>
    </div>
  )
}

// ─── The Gap Carousel ────────────────────────────────────────────────────────

const GAP_TABS = [
  {
    id: 'problem',
    label: 'The Problem',
    heading: 'Most clients guess what\'s broken.',
    sub: 'You waste months talking to biased agencies and expensive consultants. We cut through the noise instantly.',
    items: [
      { num: '01', title: 'Biased Discoveries', body: "Human consultants sell what they know. Our AI engine diagnoses what you actually need — without an agenda or a retainer fee." },
      { num: '02', title: 'Invisible Blind Spots', body: "You can't fix what you can't see. We cross-reference your business against the mental models of the world's top consulting firms." },
      { num: '03', title: 'Misaligned Execution', body: "Choosing the wrong path is fatal. We assess the gap, then our expert panel matches you to the precise expertise to execute it." },
    ]
  },
  {
    id: 'solution',
    label: 'The Solution',
    heading: 'World-class diagnostic intelligence.',
    sub: 'Zero cost to start. No retainers. No sales calls masquerading as discovery.',
    items: [
      { num: '→', title: 'Deep-Dive Diagnostic', body: "A 15-minute immersive assessment that extracts the absolute truth of your business, trained on top-tier global consulting frameworks. Completely free." },
      { num: '→', title: 'Expert Synthesis', body: "Your answers aren't just scored — they're analyzed. Our team reviews the AI output to identify the precise strategic leverage points you're missing." },
      { num: '→', title: 'The Guided Path', body: "Once we understand your blockages, our expert panel provides the exact roadmap and vetted connections to convert your goals into reality." },
    ]
  },
  {
    id: 'capabilities',
    label: 'What We Do',
    heading: 'We diagnose, then we orchestrate.',
    sub: 'Match perfectly with the right path, powered by unmatched data and expert human judgment.',
    items: [
      { num: '🧠', title: 'AI-Powered Clarity', body: "Instantly uncover the strategic gaps in your positioning and execution that traditional discovery calls miss entirely." },
      { num: '🗺️', title: 'Expert Translation', body: "Our seasoned panel turns the diagnostic data into a concrete, immediately actionable business reality." },
      { num: '⚡', title: 'Vetted Matching', body: "Need execution? We bypass the noise and match you with pre-vetted experts perfectly suited for your immediate hurdles." },
      { num: '📈', title: 'Client Accountability', body: "We don't hand you an automated PDF. We ensure the execution actually happens and converts to revenue." },
    ]
  }
]

function GapCarousel() {
  const [activeTab, setActiveTab] = useState(0)
  const [direction, setDirection] = useState(1)

  const switchTab = (i: number) => {
    setDirection(i > activeTab ? 1 : -1)
    setActiveTab(i)
  }

  const tab = GAP_TABS[activeTab]

  return (
    <div style={{ width: '100%' }}>
      {/* Tab Pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 40, flexWrap: 'wrap' }}>
        {GAP_TABS.map((t, i) => (
          <button
            key={t.id}
            onClick={() => switchTab(i)}
            style={{
              padding: '10px 20px',
              borderRadius: 100,
              border: i === activeTab ? '1px solid #FF6B35' : '1px solid rgba(255,255,255,0.12)',
              background: i === activeTab ? 'rgba(255,107,53,0.12)' : 'transparent',
              color: i === activeTab ? '#FF6B35' : 'rgba(255,255,255,0.5)',
              fontFamily: 'Outfit, sans-serif',
              fontSize: 13,
              fontWeight: i === activeTab ? 600 : 400,
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'all 0.25s',
              touchAction: 'manipulation',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={activeTab}
          custom={direction}
          initial={{ opacity: 0, x: direction * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -40 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 700, color: '#FDFCFA', margin: '0 0 12px', lineHeight: 1.15 }}>{tab.heading}</h2>
            <p style={{ fontSize: 16, color: 'rgba(253,252,250,0.55)', margin: 0, lineHeight: 1.65, maxWidth: 560 }}>{tab.sub}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
            {tab.items.map(({ num, title, body }) => (
              <div key={title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '24px 20px' }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 900, color: '#FF6B35', lineHeight: 1, marginBottom: 12 }}>{num}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#FDFCFA', marginBottom: 8, fontFamily: 'Outfit, sans-serif' }}>{title}</div>
                <div style={{ fontSize: 14, color: 'rgba(253,252,250,0.5)', lineHeight: 1.7 }}>{body}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

interface Props {
  onStart: () => void
}

function LoginMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="px-2.5 py-1.5 md:px-4 md:py-2 rounded-md border border-black/10 text-[#6B6460] text-[10px] md:text-[13px] font-medium font-['Outfit'] hover:bg-black/5 transition-colors flex items-center gap-1.5"
      >
        Login {open ? '▲' : '▼'}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 8,
              background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12,
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 100, minWidth: 180,
              padding: 8, overflow: 'hidden',
            }}
          >
            <button
              onClick={() => { navigate('/portal/login'); setOpen(false) }}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.2s',
                display: 'flex', flexDirection: 'column', gap: 2,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,107,53,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: 'Outfit' }}>Client Access</span>
              <span style={{ fontSize: 10, color: '#6B6460', fontFamily: 'Outfit' }}>View your diagnostics portal</span>
            </button>
            <div style={{ height: 1, background: 'rgba(0,0,0,0.04)', margin: '4px 8px' }} />
            <button
              onClick={() => { navigate('/dashboard'); setOpen(false) }}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.2s',
                display: 'flex', flexDirection: 'column', gap: 2,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: 'Outfit' }}>Staff Access</span>
              <span style={{ fontSize: 10, color: '#6B6460', fontFamily: 'Outfit' }}>CRM & Consultant Dashboard</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function LandingPage({ onStart }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ fontFamily: 'Outfit, sans-serif', background: '#FDFCFA', color: '#0A0A0A' }}>

      {/* About Us Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#0A0A0A', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: '64px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <LogoDark height={28} />
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FDFCFA', display: 'flex', alignItems: 'center', padding: 8 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div style={{ maxWidth: '680px', margin: '0 auto', padding: '56px 24px 80px', width: '100%' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: '20px' }}>About Baawa</div>
              {[
                { title: 'Mission', body: 'To be the first call clients make when they need things to move — delivering truth, clarity, and momentum through psychology-driven strategy.' },
                { title: 'Vision', body: 'A world where every client has access to an advisor who tells them what they need to hear, not what they want to hear — and gets them unstuck.' },
              ].map(({ title, body }) => (
                <div key={title} style={{ marginBottom: '44px' }}>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, color: '#FDFCFA', margin: '0 0 12px' }}>{title}</h2>
                  <p style={{ fontSize: '16px', color: 'rgba(253,252,250,0.65)', lineHeight: 1.75, margin: 0 }}>{body}</p>
                </div>
              ))}
              <div style={{ marginBottom: '44px', background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.15)', borderRadius: '10px', padding: '28px 24px' }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 700, color: '#FF6B35', margin: '0 0 12px' }}>Core Belief</h2>
                <p style={{ fontSize: '15px', color: 'rgba(253,252,250,0.7)', lineHeight: 1.75, margin: 0 }}>Clients deserve truth, not reassurance. The agency model is broken. Psychology beats tactics. We diagnose before we prescribe.</p>
              </div>
              <div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, color: '#FDFCFA', margin: '0 0 24px' }}>Values</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {[
                    { title: 'Truth over comfort', body: "We say what others won't." },
                    { title: 'Momentum over perfection', body: 'Done beats perfect.' },
                    { title: 'Psychology over tactics', body: 'Understand why, then act.' },
                    { title: 'Selectivity over volume', body: "We can't help everyone, and we don't pretend to." },
                  ].map(({ title, body }) => (
                    <div key={title} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#FF6B35', fontWeight: 700, flexShrink: 0 }}>—</span>
                      <div>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '14px', fontWeight: 700, color: '#FDFCFA', marginBottom: '3px' }}>{title}</div>
                        <div style={{ fontSize: '13px', color: 'rgba(253,252,250,0.45)', lineHeight: 1.6 }}>{body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FDFCFA]/90 backdrop-blur-[12px] border-b border-black/5 flex items-center justify-between px-3 md:px-12 h-[64px]">
        <div className="flex flex-col justify-center">
          <LogoLight height={26} />
          <TypewriterText />
        </div>
        <div className="flex items-center gap-1.5 md:gap-3">
          <LoginMenu />
          <button onClick={onStart} className="px-3 py-1.5 md:px-5 md:py-2.5 rounded-md bg-[#FF6B35] text-[#FAFAFA] font-['Outfit'] font-semibold text-[11px] md:text-[14px] whitespace-nowrap" style={{ touchAction: 'manipulation' }}>
            <span className="sm:hidden">Start →</span>
            <span className="hidden sm:inline">Start Assessment</span>
          </button>
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="p-2 text-[20px] text-[#0A0A0A]">☰</button>
        </div>
      </nav>

      {/* ── SECTION 1: HERO ── */}
      <section style={{ position: 'relative', minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 64, background: '#FDFCFA', overflow: 'hidden' }}>
        <MotionBackground />
        <div style={{ textAlign: 'center', maxWidth: '800px', padding: '24px 24px 48px', position: 'relative', zIndex: 10 }}>
          <DynamicHeroText />
          <button
            onClick={onStart}
            style={{ background: '#FF6B35', color: '#FAFAFA', border: 'none', cursor: 'pointer', padding: '16px 36px', borderRadius: 10, fontSize: 15, fontFamily: 'Outfit, sans-serif', fontWeight: 600, marginBottom: 12, touchAction: 'manipulation', display: 'block', margin: '0 auto 12px' }}
          >
            Start Assessment →
          </button>
          <div style={{ fontSize: '12px', color: 'rgba(107,100,96,0.6)', fontFamily: 'Outfit, sans-serif' }}>
            Selective intake · Assessment required · £0 to start
          </div>
        </div>
      </section>

      {/* ── SECTION 2: PROOF BAR ── */}
      <section style={{ background: '#1C1E26', padding: '40px 24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 'clamp(24px, 6vw, 80px)', flexWrap: 'wrap' }}
        >
          {[
            { num: '£0', label: 'upfront cost to start' },
            { num: '500+', label: 'global firm strategies embedded' },
            { num: '15m', label: 'to absolute diagnostic clarity' },
            { num: '100%', label: 'matched to the right expertise' },
          ].map(({ num, label }) => (
            <div key={num} style={{ textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(36px, 6vw, 52px)', fontWeight: 700, color: '#FDFCFA', marginBottom: 6, lineHeight: 1 }}>{num}</div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(253,252,250,0.4)', fontFamily: 'Outfit, sans-serif' }}>{label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── SECTION 2b: WHO WE ARE ── */}
      <section style={{ background: '#111318', padding: 'clamp(40px, 6vw, 64px) clamp(20px, 5vw, 80px)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          style={{ maxWidth: 900, margin: '0 auto' }}
        >
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,107,53,0.7)', fontFamily: 'Outfit, sans-serif', marginBottom: 12 }}>Who We Are</div>
          <IdentityTypewriter />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
            {[
              '250 years of collective experience',
              'Every industry on the planet',
              'Ahead of the AI game',
              'Obsessed with business'
            ].map(tag => (
              <span key={tag} style={{ fontSize: 13, color: 'rgba(253,252,250,0.35)', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#FF6B35', opacity: 0.5 }}>◆</span> {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── SECTION 3: THE GAP (Merged carousel: Problem + Solution + Capabilities) ── */}
      <section style={{ background: '#0A0A0A', padding: 'clamp(44px, 6vw, 72px) clamp(20px, 5vw, 80px)' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          style={{ maxWidth: 1000, margin: '0 auto' }}
        >
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: 12 }}>Our Intelligence</div>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 400, color: 'rgba(253,252,250,0.6)', margin: '0 0 48px', lineHeight: 1.3, maxWidth: 520 }}>
            The gap between where you are and where you should be<span style={{ color: '#FF6B35', fontStyle: 'italic' }}> is our operating space.</span>
          </p>
          <GapCarousel />
        </motion.div>
      </section>

      {/* ── SECTION 4: HOW IT WORKS + WHO IT'S FOR (merged) ── */}
      <section style={{ background: '#F5F0EE', padding: 'clamp(44px, 6vw, 72px) clamp(20px, 5vw, 80px)', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle grid BG */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04 }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="gridbg" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#FF6B35" strokeWidth="1" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#gridbg)" />
          </svg>
        </div>
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.12 } } }}
          style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} style={{ marginBottom: 48 }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 700, color: '#0A0A0A', margin: 0, lineHeight: 1.15 }}>
              Three steps to momentum.
            </h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 24, marginBottom: 56 }}>
            {[
              { num: '1', title: 'You Take The Assessment', body: 'Engage with our AI engine for 15 minutes. It actively challenges your fundamental assumptions in real time.' },
              { num: '2', title: 'The Engine Scores You', body: 'The system instantly identifies your weak points across strategy, marketing, and execution — compiling a deeply accurate intelligence brief.' },
              { num: '3', title: 'The Panel Takes Over', body: 'We build your precise roadmap and pair you with the exact talent needed to get it done.' },
            ].map(({ num, title, body }) => (
              <motion.div key={num} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
                style={{ background: 'white', border: '1px solid #EEDDD8', borderRadius: 12, padding: '28px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
              >
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 52, fontWeight: 900, color: '#FF6B35', lineHeight: 1, marginBottom: 16 }}>{num}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', marginBottom: 8, fontFamily: 'Outfit, sans-serif' }}>{title}</div>
                <div style={{ fontSize: 14, color: '#6B6460', lineHeight: 1.7 }}>{body}</div>
              </motion.div>
            ))}
          </div>

          {/* Who It's For strip */}
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 32, alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: 12 }}>Who This Is For</div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, color: '#0A0A0A', margin: '0 0 20px', lineHeight: 1.2 }}>Clients ready to bypass the consulting bloat.</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    "Tired of paying retainers for long 'discovery' phases",
                    "Need world-class intelligence applied instantly",
                    "Want an execution path, not just a PDF report",
                    "Ready to hear the absolute truth about your business",
                  ].map((item) => (
                    <li key={item} style={{ display: 'flex', gap: 12, fontSize: 15, color: '#3A3530', lineHeight: 1.5 }}>
                      <span style={{ color: '#FF6B35', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <blockquote style={{ background: '#0A0A0A', borderRadius: 16, padding: '32px 28px', margin: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(20px, 2.5vw, 26px)', fontStyle: 'italic', color: '#FFB09A', lineHeight: 1.45, margin: '0 0 16px' }}>
                  "The engine asked me three questions in twenty minutes that none of my expensive advisors had asked in six months."
                </p>
                <div style={{ fontSize: 12, color: '#6B6460', fontFamily: 'Outfit, sans-serif' }}>— An early Baawa network client</div>
              </blockquote>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── SECTION 5: FINAL CTA ── */}
      <section style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)', padding: 'clamp(56px, 8vw, 88px) 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.03, backgroundImage: 'radial-gradient(#FFF 2px, transparent 2px)', backgroundSize: '30px 30px' }} />
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}
        >
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(32px, 6vw, 64px)', fontWeight: 700, color: '#FDFCFA', lineHeight: 1.1, margin: '0 0 16px' }}>
            Ready to let our intelligence<br />
            <span style={{ fontStyle: 'italic', color: '#FF6B35' }}>diagnose your business?</span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(253,252,250,0.55)', lineHeight: 1.7, margin: '0 auto 32px', maxWidth: 460 }}>
            Take the assessment. Zero cost. Zero sales pressure. Pure, actionable insight.
          </p>
          <button
            onClick={onStart}
            style={{ background: '#FF6B35', color: 'white', border: 'none', cursor: 'pointer', padding: '18px 44px', borderRadius: 10, fontSize: 16, fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: 16, display: 'block', margin: '0 auto 16px', touchAction: 'manipulation', boxShadow: '0 8px 32px rgba(255,107,53,0.25)' }}
          >
            Begin the Assessment →
          </button>
          <div style={{ fontSize: 11, color: 'rgba(253,252,250,0.3)', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>
            Completely Free to start · World Class rigor
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0A0A0A', borderTop: '1px solid #1A1A1A', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <LogoDark height={24} />
        <span style={{ fontSize: '12px', color: '#4A4540', fontFamily: 'Outfit, sans-serif' }}>© 2026 Baawa. All rights reserved.</span>
      </footer>

    </div>
  )
}
