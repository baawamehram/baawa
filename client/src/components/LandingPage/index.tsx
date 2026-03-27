import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogoLight, LogoDark } from '../Logo'

const SERVICES = [
  "Strategy",
  "Execution",
  "Marketing",
  "Development",
  "Positioning",
  "Growth",
  "Operations",
  "Scale",
  "Brand Identity",
  "Team Building",
  "Product Design",
  "Fundraising",
]

function TypewriterText() {
  const [text, setText] = useState('')
  const [index, setIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [typingSpeed, setTypingSpeed] = useState(100)

  useEffect(() => {
    let timer: number;
    const currentWord = SERVICES[index % SERVICES.length]
    
    if (!isDeleting && text === currentWord) {
      // Pause at the end of word
      timer = window.setTimeout(() => setIsDeleting(true), 1500)
    } else if (isDeleting && text === '') {
      // Move to next word
      setIsDeleting(false)
      setIndex(prev => prev + 1)
      setTypingSpeed(100)
    } else {
      // Typing or Deleting
      timer = window.setTimeout(() => {
        setText(currentWord.substring(0, text.length + (isDeleting ? -1 : 1)))
        setTypingSpeed(isDeleting ? 40 : 100)
      }, typingSpeed)
    }
    return () => clearTimeout(timer)
  }, [text, isDeleting, index, typingSpeed])

  return (
    <div style={{ fontSize: '12px', color: '#FF6B35', fontWeight: 600, letterSpacing: '0.02em', height: '14px', marginTop: '2px', display: 'flex', alignItems: 'center' }}>
      <span>We do: {text}</span>
      <span style={{ 
        display: 'inline-block', 
        width: '2px', 
        height: '12px', 
        backgroundColor: '#FF6B35', 
        marginLeft: '2px',
        animation: 'cursor-blink 1s step-end infinite' 
      }} />
      <style>{`
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
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
    subtitle: "If you can't outspend them, outsmart them. We help founders reposition their entire offering without changing the product.",
  },
  {
    kicker: "The Power of Context",
    title1: "The opposite of a good idea",
    title2: "can be another good idea.",
    subtitle: "We challenge the defaults. Sometimes the best solutions look completely irrational to your competitors.",
  },
  {
    kicker: "Behavioral Design",
    title1: "Don't change the person.",
    title2: "Change the environment.",
    subtitle: "Stop fighting your customers' psychology. We rebuild your strategy around how humans actually make decisions.",
  },
  {
    kicker: "Advisor · Consultant · Coach",
    title1: "Everyone has that one person",
    title2: "they call first.",
    subtitle: "Strategy, agencies, mindset, momentum — whatever's blocking you, we clear it.",
  }
];

import { useRef } from 'react'

function MotionBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = canvas.width = window.innerWidth
    let height = canvas.height = window.innerHeight

    const particles: any[] = []
    const particleCount = 70

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2 + 0.5
      })
    }

    let animationFrame: number

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy

        // Wrap around edges
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(60, 60, 60, 0.6)'
        ctx.fill()
      })

      // Connect close particles with lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 150) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            // Closer = more opaque
            ctx.strokeStyle = `rgba(60, 60, 60, ${0.25 - dist / 600})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      animationFrame = requestAnimationFrame(draw)
    }
    
    draw()

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none', opacity: 0.8 }}>
      <canvas 
        ref={canvasRef} 
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(253,252,250,0) 0%, rgba(253,252,250,1) 95%)',
        pointerEvents: 'none'
      }} />
    </div>
  )
}

function DynamicHeroText() {
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide(prev => (prev + 1) % HERO_SLIDES.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div style={{ position: 'relative', minHeight: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: '40px' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          <div style={{
            fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: '24px'
          }}>{HERO_SLIDES[slide].kicker}</div>
          <h1 style={{ margin: '0 0 24px', lineHeight: 1.1 }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(40px, 7vw, 84px)',
              fontWeight: 400, color: '#0A0A0A', display: 'block'
            }}>{HERO_SLIDES[slide].title1}</div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(40px, 7vw, 84px)',
              fontWeight: 700, fontStyle: 'italic', color: '#FF6B35', display: 'block'
            }}>{HERO_SLIDES[slide].title2}</div>
          </h1>
          <p style={{ fontSize: '18px', color: '#6B6460', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto' }}>
            {HERO_SLIDES[slide].subtitle}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

interface Props {
  onStart: () => void
}

export function LandingPage({ onStart }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div style={{ fontFamily: 'Outfit, sans-serif', background: '#FDFCFA', color: '#0A0A0A' }}>

      {/* About Us overlay */}
      {menuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: '#0A0A0A', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Overlay nav */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 48px', height: '64px', flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <LogoDark height={32} />
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40, padding: 0,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#FDFCFA' }}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* About Us content */}
          <div style={{ maxWidth: '720px', margin: '0 auto', padding: '72px 32px 96px', width: '100%' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF6B35', fontFamily: 'Outfit, sans-serif', marginBottom: '24px' }}>About Baawa</div>

            {/* Mission */}
            <div style={{ marginBottom: '56px' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: '#FDFCFA', margin: '0 0 16px' }}>Mission</h2>
              <p style={{ fontSize: '17px', color: 'rgba(253,252,250,0.7)', lineHeight: 1.75, margin: 0 }}>
                To be the first call founders make when they need things to move — delivering truth, clarity, and momentum through psychology-driven strategy.
              </p>
            </div>

            {/* Vision */}
            <div style={{ marginBottom: '56px' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: '#FDFCFA', margin: '0 0 16px' }}>Vision</h2>
              <p style={{ fontSize: '17px', color: 'rgba(253,252,250,0.7)', lineHeight: 1.75, margin: 0 }}>
                A world where every founder has access to an advisor who tells them what they need to hear, not what they want to hear — and gets them unstuck.
              </p>
            </div>

            {/* Core Belief */}
            <div style={{ marginBottom: '56px', background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.15)', borderRadius: '12px', padding: '32px' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, color: '#FF6B35', margin: '0 0 16px' }}>Core Belief</h2>
              <p style={{ fontSize: '16px', color: 'rgba(253,252,250,0.75)', lineHeight: 1.75, margin: 0 }}>
                Founders deserve truth, not reassurance. The agency model is broken. Psychology beats tactics. We diagnose before we prescribe.
              </p>
            </div>

            {/* Values */}
            <div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: '#FDFCFA', margin: '0 0 32px' }}>Values</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {[
                  { title: 'Truth over comfort', body: 'We say what others won\'t.' },
                  { title: 'Momentum over perfection', body: 'Done beats perfect.' },
                  { title: 'Psychology over tactics', body: 'Understand why, then act.' },
                  { title: 'Selectivity over volume', body: 'We can\'t help everyone, and we don\'t pretend to.' },
                ].map(({ title, body }) => (
                  <div key={title} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#FF6B35', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>—</span>
                    <div>
                      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '15px', fontWeight: 700, color: '#FDFCFA', marginBottom: '4px' }}>{title}</div>
                      <div style={{ fontSize: '14px', color: 'rgba(253,252,250,0.5)', lineHeight: 1.6 }}>{body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 1 — Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FDFCFA]/90 backdrop-blur-[12px] border-b border-black/5 flex items-center justify-between px-3 md:px-12 h-[72px]">
        <div className="flex flex-col justify-center">
          <LogoLight height={28} />
          <div><TypewriterText /></div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-3">
          <button onClick={() => navigate('/portal/login')} className="px-2.5 py-1.5 md:px-4 md:py-2 rounded-md border border-black/10 text-[#6B6460] text-[10px] md:text-[13px] font-medium font-['Outfit'] hover:bg-black/5 transition-colors">
            Login
          </button>
          <button onClick={onStart} className="px-3 py-1.5 md:px-5 md:py-2.5 rounded-md bg-[#FF6B35] text-[#FAFAFA] font-['Outfit'] font-semibold text-[11px] md:text-[14px] whitespace-nowrap">
            <span className="sm:hidden">Start →</span>
            <span className="hidden sm:inline">Start Assessment</span>
          </button>
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="p-1 pl-1 text-[20px] md:text-[22px] text-[#0A0A0A]">
            ☰
          </button>
        </div>
      </nav>

      {/* Section 2 — Hero */}
      <section className="relative min-h-[100vh] flex items-center justify-center pt-16 bg-[#FDFCFA] overflow-hidden md:sticky md:top-0 md:h-screen z-[10] shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
        <MotionBackground />
        
        <div style={{ textAlign: 'center', maxWidth: '800px', padding: '0 24px', position: 'relative', zIndex: 10 }}>
          <DynamicHeroText />
          <button onClick={onStart} className="bg-[#FF6B35] hover:bg-[#e65c2b] transition-colors text-[#FAFAFA] border-none cursor-pointer px-6 py-3 md:px-9 md:py-4 rounded-lg text-[14px] md:text-[16px] font-['Outfit'] font-semibold mb-4 mx-auto block">
            Start Assessment →
          </button>
          <div style={{ fontSize: '12px', color: 'rgba(107,100,96,0.7)', fontFamily: 'Outfit, sans-serif' }}>
            Selective intake · Assessment required
          </div>
        </div>
      </section>

      {/* Section 3 — Proof Bar */}
      <section className="bg-[#1C1E26] py-16 px-6 md:py-0 md:px-12 md:sticky md:top-0 md:min-h-screen md:flex md:flex-col md:justify-center z-[20] shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="max-w-[1200px] mx-auto flex justify-center gap-10 md:gap-20 flex-wrap"
        >
          {[
            { num: '£0', label: 'upfront cost to start' },
            { num: '500+', label: 'global firm strategies embedded' },
            { num: '15m', label: 'to absolute diagnostic clarity' },
            { num: '100%', label: 'matched to the right expertise' },
          ].map(({ num, label }) => (
            <div key={num} className="text-center">
              <div className="font-['Cormorant_Garamond'] text-[40px] md:text-[52px] font-bold text-[#FDFCFA] mb-2 leading-none">{num}</div>
              <div className="text-[10px] md:text-[11px] uppercase tracking-[0.12em] text-[#FDFCFA]/50 font-['Outfit']">{label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Section 4 — The Problem */}
      <section className="bg-[#F5F0EE] py-20 px-6 md:py-0 md:px-12 relative md:sticky md:top-0 md:min-h-screen md:flex md:flex-col md:justify-center z-[30] shadow-[0_10px_30px_rgba(0,0,0,0.15)] overflow-hidden">
        
        {/* Abstract Pattern Graphic */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-0">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="grid4" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#FF6B35" strokeWidth="1" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid4)" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-b from-[#F5F0EE] via-transparent to-[#F5F0EE]"></div>
        </div>

        <motion.div 
          initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } }}
          className="max-w-[1200px] mx-auto"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}>
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#FF6B35] font-['Outfit'] mb-4">The Problem</div>
            <h2 className="font-['Cormorant_Garamond'] text-[32px] md:text-[48px] font-bold text-[#0A0A0A] mb-4 leading-[1.1]">Most founders guess what's broken.<br/>Our intelligence engine knows.</h2>
            <p className="text-[16px] md:text-[18px] text-[#6B6460] mb-12 max-w-[620px]">You waste months talking to biased agencies and expensive consultants. We cut through the noise instantly.</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: '01', title: 'Biased Discoveries', body: "Human consultants sell what they know. Our AI engine diagnoses what you actually need, without an agenda or a retainer fee." },
              { num: '02', title: 'Invisible Blind Spots', body: "You can't fix what you can't see. We cross-reference your business against the mental models of the world's top consulting firms." },
              { num: '03', title: "Misaligned Execution", body: "Choosing the wrong path is fatal. We assess the gap, then our expert panel matches you to the precise expertise to execute it." },
            ].map(({ num, title, body }) => (
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }} key={num} className="bg-white border border-[#EEDDD8] rounded-xl p-8 md:p-10 shadow-sm">
                <div className="font-['Cormorant_Garamond'] text-[44px] md:text-[52px] font-black text-[#FF6B35] leading-none mb-4">{num}</div>
                <div className="text-[18px] md:text-[20px] font-bold text-[#0A0A0A] mb-3 font-['Outfit']">{title}</div>
                <div className="text-[14px] md:text-[15px] text-[#6B6460] leading-[1.7]">{body}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Section 5 — The Solution */}
      <section className="bg-[#FDFCFA] py-20 px-6 md:py-0 md:px-12 relative md:sticky md:top-0 md:min-h-screen md:flex md:flex-col md:justify-center z-[40] shadow-[0_10px_30px_rgba(0,0,0,0.1)] overflow-hidden">
        
        {/* Abstract Pattern Graphic */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="grid5" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="#0A0A0A"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid5)" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-transparent to-white/80"></div>
        </div>

        <motion.div 
          initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } }}
          className="max-w-[1200px] mx-auto"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}>
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#FF6B35] font-['Outfit'] mb-4">The Solution</div>
            <h2 className="font-['Cormorant_Garamond'] text-[32px] md:text-[48px] font-bold text-[#0A0A0A] mb-12 leading-[1.1]">World-class diagnostic intelligence.<br/>Zero cost to start.</h2>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }} className="bg-white border border-[#EEDDD8] rounded-xl p-8 md:p-10 shadow-sm">
              <div className="text-[10px] tracking-[0.15em] uppercase text-[#FF6B35] font-['Outfit'] mb-4">The Engine</div>
              <div className="font-['Cormorant_Garamond'] text-[24px] font-bold text-[#0A0A0A] mb-4">Deep-Dive Diagnostic</div>
              <div className="text-[14px] md:text-[15px] text-[#6B6460] leading-[1.7]">A 15-minute immersive assessment that pulls the absolute truth out of your business, trained on top-tier global consulting frameworks. Completely free.</div>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }} className="bg-white border border-[#EEDDD8] rounded-xl p-8 md:p-10 shadow-sm">
              <div className="text-[10px] tracking-[0.15em] uppercase text-[#FF6B35] font-['Outfit'] mb-4">The Analysis</div>
              <div className="font-['Cormorant_Garamond'] text-[24px] font-bold text-[#0A0A0A] mb-4">Expert Synthesis</div>
              <div className="text-[14px] md:text-[15px] text-[#6B6460] leading-[1.7]">Your answers aren't just scored—they're analyzed. Our team reviews the AI output to identify the precise strategic leverage points you are currently missing.</div>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }} className="bg-white border border-[#EEDDD8] rounded-xl p-8 md:p-10 shadow-sm">
              <div className="text-[10px] tracking-[0.15em] uppercase text-[#FF6B35] font-['Outfit'] mb-4">The Execution</div>
              <div className="font-['Cormorant_Garamond'] text-[24px] font-bold text-[#0A0A0A] mb-4">The Guided Path</div>
              <div className="text-[14px] md:text-[15px] text-[#6B6460] leading-[1.7]">Once we understand your blockages, our expert panel provides the exact roadmap and vetted connections to convert your goals directly into reality.</div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* MID-PAGE CTA - The Calculator */}
      <section className="bg-[#FF6B35] py-16 px-6 md:px-12 relative md:sticky md:top-0 md:h-[60vh] md:flex md:flex-col md:justify-center items-center text-center z-[50] shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')]"></div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6 }}
          className="max-w-[700px] mx-auto z-10"
        >
          <h2 className="font-['Cormorant_Garamond'] text-[32px] md:text-[52px] font-bold text-white mb-4 leading-none">The cost of waiting.</h2>
          <p className="text-[16px] md:text-[18px] text-white/90 mb-8 font-['Outfit'] font-medium">Poor execution drains capital daily. Calculate the true compounding cost of your agency bloat and strategic misalignment.</p>
          <button className="bg-white hover:bg-gray-100 transition-colors text-[#FF6B35] border-none cursor-pointer px-6 py-3 md:px-8 md:py-3.5 rounded-lg text-[14px] md:text-[15px] font-['Outfit'] font-bold shadow-lg">
            Open the Calculator
          </button>
        </motion.div>
      </section>

      {/* Section 6 — What We Do */}
      <section className="bg-white py-20 px-6 md:py-0 md:px-12 relative md:sticky md:top-0 md:min-h-screen md:flex md:flex-col md:justify-center z-[60] shadow-[0_10px_30px_rgba(0,0,0,0.15)] overflow-hidden">
        
        {/* Abstract Pattern Graphic */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="grid6" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="#000" strokeWidth="1" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid6)" />
          </svg>
        </div>

        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } }}
          className="max-w-[1200px] mx-auto"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}>
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#FF6B35] font-['Outfit'] mb-4">Our Operations</div>
            <h2 className="font-['Cormorant_Garamond'] text-[32px] md:text-[48px] font-bold text-[#0A0A0A] mb-4">We diagnose, then we orchestrate.</h2>
            <p className="text-[16px] md:text-[18px] text-[#6B6460] mb-12">Match perfectly with the right path, powered by unmatched data.</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: '🧠', title: 'AI-Powered Clarity', body: "Instantly uncover the strategic gaps in your positioning and execution that traditional discovery calls miss." },
              { icon: '🗺️', title: 'Expert Translation', body: "Our seasoned panel turns the diagnostic data into a concrete, immediately actionable business reality." },
              { icon: '⚡', title: 'Vetted Agency Matching', body: "Need execution? We bypass the noise and match you with pre-vetted agencies perfectly suited for your immediate hurdles." },
              { icon: '📈', title: 'Founder Accountability', body: "We don't just hand you an automated PDF report. We ensure the execution actually happens and converts to revenue." },
            ].map(({ icon, title, body }) => (
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }} key={title} className="bg-white border border-[#EEDDD8] rounded-xl p-8 md:p-10 shadow-sm flex gap-6 items-start">
                <div className="text-[32px] md:text-[40px] leading-none shrink-0">{icon}</div>
                <div>
                  <div className="text-[18px] md:text-[20px] font-bold text-[#0A0A0A] mb-2 font-['Outfit']">{title}</div>
                  <div className="text-[14px] md:text-[15px] text-[#6B6460] leading-[1.7]">{body}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Section 7 — How It Works */}
      <section className="bg-[#0A0A0A] py-20 px-6 md:py-0 md:px-12 text-white relative md:sticky md:top-0 md:min-h-screen md:flex md:flex-col md:justify-center z-[70] shadow-[0_10px_40px_rgba(0,0,0,0.6)] overflow-hidden">
        
        {/* Subtle Dark Mode Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-0">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="grid7" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#FFFFFF" strokeWidth="1" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid7)" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/50 via-transparent to-[#0A0A0A]"></div>
        </div>

        <motion.div 
          initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } }}
          className="max-w-[800px] mx-auto"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}>
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#FF6B35] font-['Outfit'] mb-4">How It Works</div>
            <h2 className="font-['Cormorant_Garamond'] text-[32px] md:text-[48px] font-bold mb-16">Three steps to momentum.</h2>
          </motion.div>
          
          <div className="flex flex-col">
            {[
              { num: '1', title: 'You Take The Assessment', body: 'Engage with our AI engine for 15 minutes. It actively challenges your fundamental assumptions in real time.' },
              { num: '2', title: 'The Engine Scores You', body: 'The system instantly identifies your weak points across strategy, marketing, and execution, compiling a deeply accurate intelligence brief.' },
              { num: '3', title: 'The Panel Takes Over', body: 'We build the precise roadmap based on your brief and pair you with the exact talent and path needed to get it done.' },
            ].map(({ num, title, body }, i) => (
              <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { duration: 0.6 } } }} key={num} className={`flex gap-6 md:gap-10 items-start ${i === 0 ? 'pb-10' : i === 2 ? 'pt-10' : 'py-10 border-b border-[#1A1A1A]'}`}>
                <div className="font-['Cormorant_Garamond'] text-[48px] md:text-[64px] font-black text-[#FF6B35] leading-[0.85] shrink-0 w-[40px] md:w-[60px]">{num}</div>
                <div className="pt-2">
                  <div className="text-[18px] md:text-[22px] font-bold mb-2 font-['Outfit']">{title}</div>
                  <div className="text-[14px] md:text-[15px] text-[#A09894] leading-[1.7]">{body}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Section 8 — Who This Is For */}
      <section className="bg-[#FDFCFA] py-20 px-6 md:py-0 md:px-12 relative md:sticky md:top-0 md:min-h-screen md:flex md:flex-col md:justify-center z-[80] shadow-[0_10px_30px_rgba(0,0,0,0.15)] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 bg-[radial-gradient(#0A0A0A_1px,transparent_1px)] bg-[size:16px_16px]"></div>
        <motion.div 
          initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } }}
          className="max-w-[1200px] mx-auto"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}>
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#FF6B35] font-['Outfit'] mb-4">Who This Is For</div>
            <h2 className="font-['Cormorant_Garamond'] text-[32px] md:text-[48px] font-bold text-[#0A0A0A] mb-12">Founders ready to bypass the consulting bloat.</h2>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-start">
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}>
              <ul className="list-none p-0 m-0 mb-8 space-y-4">
                {[
                  "You're tired of paying retainers for long 'discovery' phases",
                  "You want world-class intelligence applied to your business instantly",
                  "You need an execution path, not just a PDF report",
                  "You want someone who'll tell you the absolute truth, not reassure you",
                ].map((item) => (
                  <li key={item} className="flex gap-4 text-[15px] md:text-[16px] text-[#3A3530] leading-[1.5]">
                    <span className="text-[#FF6B35] font-bold shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1, transition: { duration: 0.6 } } }} className="bg-[#0A0A0A] rounded-2xl p-10 md:p-12 shadow-xl">
              <p className="font-['Cormorant_Garamond'] text-[24px] md:text-[28px] italic text-[#FFB09A] leading-[1.4] mb-6">
                "The engine asked me three questions in twenty minutes that none of my expensive advisors had asked in six months."
              </p>
              <div className="text-[12px] md:text-[13px] text-[#A09894] font-['Outfit']">— An early Baawa network founder</div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Section 9 — Final CTA */}
      <section className="bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] py-24 px-6 md:py-0 md:px-12 text-center text-white relative md:sticky md:top-0 md:min-h-screen md:flex md:flex-col md:justify-center z-[90] shadow-[0_-10px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 bg-[radial-gradient(#FFF_2px,transparent_2px)] bg-[size:30px_30px]"></div>
        <motion.div 
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8 }}
          className="max-w-[700px] mx-auto"
        >
          <h2 className="font-['Cormorant_Garamond'] text-[36px] md:text-[64px] font-bold leading-[1.1] mb-6">
            <span className="block">Ready to let our intelligence</span>
            <span className="block italic text-[#FF6B35]">diagnose your business?</span>
          </h2>
          <p className="text-[16px] md:text-[18px] text-[#A09894] leading-[1.7] mb-10 max-w-[500px] mx-auto">
            Take the assessment. Zero cost. Zero sales pressure. Pure, actionable insight.
          </p>
          <button onClick={onStart} className="bg-[#FF6B35] hover:bg-[#e65c2b] transition-colors text-white border-none cursor-pointer px-8 py-4 rounded-lg text-[15px] md:text-[16px] font-['Outfit'] font-bold mb-6 mx-auto block shadow-lg shadow-[#FF6B35]/20">
            Begin the Assessment →
          </button>
          <div className="text-[10px] md:text-[11px] text-[#807874] tracking-[0.18em] uppercase font-['Outfit']">
            Completely Free to start · World Class rigor
          </div>
        </motion.div>
      </section>

      {/* Section 10 — Footer */}
      <footer className="bg-[#0A0A0A] border-t border-[#1A1A1A] py-8 px-6 md:px-12 flex items-center justify-between relative z-[100]">
        <LogoDark height={28} />
        <span style={{ fontSize: '12px', color: '#4A4540', fontFamily: 'Outfit, sans-serif' }}>© 2026 Baawa. All rights reserved.</span>
      </footer>

    </div>
  )
}
