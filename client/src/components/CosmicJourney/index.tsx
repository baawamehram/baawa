import { useRef, useEffect, useState, useCallback } from 'react'
import { useReducedMotion } from 'framer-motion'

// Props kept for API compatibility with App.tsx
interface CosmicJourneyProps {
  city: string | null
  country: string | null
  lat: number | null
  lon: number | null
  onComplete: () => void
}

interface OrbNode {
  id: string
  label: string
  val: string
  change: string
  col: string
  ring: number
  angle: number
  opacity: number
  target: number
}

const RING_CFG = [
  { rFrac: 0.22, speed: 2 * Math.PI / 65000 },
  { rFrac: 0.37, speed: 2 * Math.PI / 130000 },
  { rFrac: 0.52, speed: 2 * Math.PI / 220000 },
]

const INITIAL_NODES: OrbNode[] = [
  { id: 'btc',    label: 'Bitcoin',        val: 'loading', change: '',       col: '#FBBF24', ring: 0, angle: 0.0,  opacity: 0, target: 1 },
  { id: 'eurusd', label: 'EUR / USD',      val: '—',       change: 'live',   col: '#4ADE80', ring: 0, angle: 1.57, opacity: 0, target: 1 },
  { id: 'usdinr', label: 'USD / INR',      val: '—',       change: 'live',   col: '#4ADE80', ring: 0, angle: 3.14, opacity: 0, target: 1 },
  { id: 'usdaed', label: 'USD / AED',      val: '—',       change: 'live',   col: '#FBBF24', ring: 0, angle: 4.71, opacity: 0, target: 1 },
  { id: 'usgdp',  label: 'US GDP YoY',    val: '2.8%',    change: 'Q4 24',  col: '#4ADE80', ring: 1, angle: 0.78, opacity: 0, target: 1 },
  { id: 'ingdp',  label: 'India GDP',     val: '8.4%',    change: 'YoY',    col: '#4ADE80', ring: 1, angle: 2.35, opacity: 0, target: 1 },
  { id: 'fed',    label: 'Fed Rate',      val: '4.33%',   change: 'HOLD',   col: '#FBBF24', ring: 1, angle: 3.93, opacity: 0, target: 1 },
  { id: 'cpi',    label: 'US Inflation',  val: '2.8%',    change: 'YoY',    col: '#F87171', ring: 1, angle: 5.50, opacity: 0, target: 1 },
  { id: 'adtam',  label: 'Digital Ad TAM',val: '$740B',   change: '2024',   col: '#A78BFA', ring: 2, angle: 0.4,  opacity: 0, target: 1 },
  { id: 'newbiz', label: 'New Biz / Day', val: '500K',    change: 'Global', col: '#A78BFA', ring: 2, angle: 2.1,  opacity: 0, target: 1 },
  { id: 'agfail', label: 'Agency Fail',   val: '68%',     change: '3yr',    col: '#F87171', ring: 2, angle: 3.8,  opacity: 0, target: 1 },
  { id: 'aisec',  label: 'AI Sector',     val: '+34%',    change: 'YoY',    col: '#34D399', ring: 2, angle: 5.5,  opacity: 0, target: 1 },
]

const BOOT_STEPS = [
  { delay: 600,  txt: 'Loading founder archetypes...' },
  { delay: 1500, txt: 'Warming voice recognition...' },
  { delay: 2400, txt: 'Streaming live market data...' },
  { delay: 3200, txt: 'Calibrating question sequence...' },
  { delay: 4100, txt: 'All systems ready.' },
]

const MSGS = [
  'Hello.',
  'Hello.\n\nSpeak your answers out loud — I would prefer that.',
  'Hello.\n\nSpeak your answers out loud — I would prefer that.\n\nSpeak from the heart.',
  'Hello.\n\nSpeak your answers out loud — I would prefer that.\n\nSpeak from the heart.\n\nThis assessment gives us a critical, foundational understanding of whether we can genuinely help you.',
  'Hello.\n\nSpeak your answers out loud — I would prefer that.\n\nSpeak from the heart.\n\nThis assessment gives us a critical, foundational understanding of whether we can genuinely help you.\n\nHonest answers serve you — you will leave with a detailed score and real insight about yourself.',
  'Hello.\n\nSpeak your answers out loud — I would prefer that.\n\nSpeak from the heart.\n\nThis assessment gives us a critical, foundational understanding of whether we can genuinely help you.\n\nHonest answers serve you — you will leave with a detailed score and real insight about yourself.\n\nWe might not be the right fit. That is okay. You will know more about your own business than when you arrived.\n\nShall we begin?',
]

function fmtPct(p: number) { return (p >= 0 ? '+' : '') + p.toFixed(2) + '%' }
function colFor(p: number) { return p >= 0 ? '#4ADE80' : '#F87171' }

// Polyfill for roundRect on older browsers
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export function CosmicJourney({ onComplete }: CosmicJourneyProps) {
  const reducedMotion = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const lastTRef = useRef(0)
  const fadingRef = useRef(false)
  const fadeAtRef = useRef(0)

  // Nodes and dust are mutable canvas state — kept in refs, not state
  const nodesRef = useRef<OrbNode[]>(INITIAL_NODES.map(n => ({ ...n })))
  const dustRef = useRef(
    Array.from({ length: 45 }, () => ({
      x: Math.random() * 2000,
      y: Math.random() * 1200,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 0.9 + 0.2,
      o: Math.random() * 0.15 + 0.04,
    }))
  )

  // UI phase
  const [showOrbital, setShowOrbital] = useState(true)
  const [showTypewriter, setShowTypewriter] = useState(false)

  // Orb double-tap
  const [, setOrbSub] = useState('Analysing global signals')
  const tapsRef = useRef(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Boot strip
  const [bootLines, setBootLines] = useState<string[]>([])
  const [bootCurrent, setBootCurrent] = useState('Calibrating founder context...')
  const [bootDone, setBootDone] = useState(false)

  // Live ticker values
  const [btcText, setBtcText] = useState('loading...')
  const [btcUp, setBtcUp] = useState<boolean | null>(null)
  const [eurusd, setEurusd] = useState('—')
  const [usdinr, setUsdinr] = useState('—')
  const [usdaed, setUsdaed] = useState('—')

  // News
  const [newsItems, setNewsItems] = useState<string[]>([])

  // Typewriter
  const [twText, setTwText] = useState('')
  const [micVisible, setMicVisible] = useState(false)
  const [micTapped, setMicTapped] = useState(false)
  const twTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textScrollRef = useRef<HTMLDivElement>(null)
  const [msgs, setMsgs] = useState<string[]>(MSGS)

  // Fetch live intro messages from API (falls back to hardcoded MSGS on any failure)
  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    fetch('/api/journey/intro', { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { messages?: string[] }) => {
        if (Array.isArray(data.messages) && data.messages.length >= 2) {
          setMsgs(data.messages)
        }
      })
      .catch(() => {
        // Silently fall back to hardcoded MSGS
      })
      .finally(() => clearTimeout(timeoutId))

    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [])

  // Reduced motion: skip straight to assessment
  useEffect(() => {
    if (!reducedMotion) return
    const t = setTimeout(onComplete, 800)
    return () => clearTimeout(t)
  }, [reducedMotion, onComplete])

  // Stagger node fade-in
  useEffect(() => {
    nodesRef.current.forEach((n, i) => {
      n.opacity = 0
      n.target = 0
      setTimeout(() => { n.target = 1 }, 400 + i * 120)
    })
  }, [])

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function loop(now: number) {
      rafRef.current = requestAnimationFrame(loop)
      const wrap = canvas!.parentElement
      if (!wrap || !ctx) return

      const W = (canvas!.width = wrap.offsetWidth)
      const H = (canvas!.height = wrap.offsetHeight)
      const CX = W / 2
      const CY = H / 2
      const dt = Math.min(now - (lastTRef.current || now), 50)
      lastTRef.current = now
      ctx.clearRect(0, 0, W, H)

      const minD = Math.min(W, H)
      const globalA = fadingRef.current
        ? Math.max(0, 1 - (now - fadeAtRef.current) / 1000)
        : 1

      // Background radial glow
      const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, minD * 0.5)
      bg.addColorStop(0, 'rgba(255,107,53,0.04)')
      bg.addColorStop(1, 'rgba(4,4,14,0)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Orbit rings
      RING_CFG.forEach(r => {
        const rad = r.rFrac * minD
        ctx.beginPath()
        ctx.arc(CX, CY, rad, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(99,102,241,${0.09 * globalA})`
        ctx.lineWidth = 0.8
        ctx.setLineDash([2, 12])
        ctx.stroke()
        ctx.setLineDash([])
      })

      // Dust particles
      dustRef.current.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        const dc = Math.hypot(p.x - CX, p.y - CY)
        if (dc < minD * 0.55) {
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(CX, CY)
          ctx.strokeStyle = `rgba(255,107,53,${0.025 * (1 - dc / (minD * 0.55)) * globalA})`
          ctx.lineWidth = 0.4
          ctx.stroke()
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99,102,241,${p.o * globalA})`
        ctx.fill()
      })

      // Orbital nodes
      nodesRef.current.forEach(n => {
        const ring = RING_CFG[n.ring]
        n.angle += ring.speed * dt
        n.opacity += (n.target - n.opacity) * 0.035
        const a = n.opacity * globalA
        if (a < 0.02) return

        const rad = ring.rFrac * minD
        const x = CX + Math.cos(n.angle) * rad
        const y = CY + Math.sin(n.angle) * rad

        // Spoke line to centre
        ctx.beginPath()
        ctx.moveTo(CX, CY)
        ctx.lineTo(x, y)
        ctx.strokeStyle = `rgba(255,107,53,${0.06 * a})`
        ctx.lineWidth = 0.7
        ctx.stroke()

        // Node glow + dot
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 9)
        glow.addColorStop(0, n.col + 'CC')
        glow.addColorStop(0.5, n.col + '44')
        glow.addColorStop(1, n.col + '00')
        ctx.globalAlpha = a
        ctx.beginPath()
        ctx.arc(x, y, 9, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x, y, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = n.col
        ctx.fill()
        ctx.globalAlpha = 1

        // Pill label
        ctx.save()
        ctx.globalAlpha = a
        const isRight = x >= CX
        const PAD = 12, PH = 44, PW = 132
        const px = isRight ? x + 14 : x - 14 - PW
        const py = y - PH / 2

        ctx.shadowColor = 'rgba(0,0,0,0.6)'
        ctx.shadowBlur = 12
        ctx.fillStyle = 'rgba(6,6,18,0.92)'
        roundRect(ctx, px, py, PW, PH, 7)
        ctx.fill()
        ctx.shadowBlur = 0

        ctx.strokeStyle = n.col + '30'
        ctx.lineWidth = 0.8
        roundRect(ctx, px, py, PW, PH, 7)
        ctx.stroke()

        ctx.fillStyle = n.col
        roundRect(ctx, px, py + 6, 2.5, PH - 12, 2)
        ctx.fill()

        ctx.fillStyle = 'rgba(253,252,250,0.38)'
        ctx.font = '10px "Courier New"'
        ctx.textAlign = 'left'
        ctx.fillText(n.label, px + PAD, py + 16)

        ctx.fillStyle = n.col
        ctx.font = 'bold 15px "Courier New"'
        ctx.fillText(n.val, px + PAD, py + 34)

        ctx.fillStyle = 'rgba(253,252,250,0.28)'
        ctx.font = '9px "Courier New"'
        ctx.fillText(n.change, px + PAD + ctx.measureText(n.val).width + 8, py + 34)

        ctx.restore()
      })
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Boot sequence
  useEffect(() => {
    let prev = 'Calibrating founder context...'
    const timers: ReturnType<typeof setTimeout>[] = []

    BOOT_STEPS.forEach(({ delay, txt }, i) => {
      timers.push(setTimeout(() => {
        const captured = prev
        setBootLines(lines => [...lines, captured])
        prev = txt
        setBootCurrent(txt)
        if (i === BOOT_STEPS.length - 1) {
          setBootDone(true)
          setOrbSub('Double-tap to begin')
        }
      }, delay))
    })

    return () => timers.forEach(clearTimeout)
  }, [])

  // BTC price (CoinGecko — free, CORS ok)
  useEffect(() => {
    async function fetch_btc() {
      try {
        const r = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
          { cache: 'no-store' },
        )
        const d = await r.json() as { bitcoin: { usd: number; usd_24h_change: number } }
        const p   = d.bitcoin.usd
        const chg = d.bitcoin.usd_24h_change
        const fmt = '$' + Math.round(p).toLocaleString('en')
        setBtcText(fmt + ' ' + fmtPct(chg))
        setBtcUp(chg >= 0)
        const n = nodesRef.current.find(x => x.id === 'btc')
        if (n) { n.val = fmt; n.change = fmtPct(chg); n.col = colFor(chg) }
      } catch { /* silent */ }
    }
    void fetch_btc()
    const id = setInterval(() => void fetch_btc(), 60000)
    return () => clearInterval(id)
  }, [])

  // Forex (Frankfurter — free, CORS ok)
  useEffect(() => {
    async function fetch_forex() {
      try {
        const r = await fetch(
          'https://api.frankfurter.app/latest?from=EUR&to=USD,INR,AED',
          { cache: 'no-store' },
        )
        const d = await r.json() as { rates: { USD: number; INR: number; AED: number } }
        const eu = d.rates.USD
        const ir = d.rates.INR / eu
        const ae = d.rates.AED / eu
        setEurusd(eu.toFixed(4))
        setUsdinr(ir.toFixed(2))
        setUsdaed(ae.toFixed(4))
        const nEu = nodesRef.current.find(x => x.id === 'eurusd')
        const nIr = nodesRef.current.find(x => x.id === 'usdinr')
        const nAe = nodesRef.current.find(x => x.id === 'usdaed')
        if (nEu) nEu.val = eu.toFixed(4)
        if (nIr) nIr.val = ir.toFixed(2)
        if (nAe) nAe.val = ae.toFixed(4)
      } catch { /* silent */ }
    }
    void fetch_forex()
    const id = setInterval(() => void fetch_forex(), 60000)
    return () => clearInterval(id)
  }, [])

  // Hacker News top stories (free, CORS ok)
  useEffect(() => {
    async function fetch_hn() {
      try {
        const r    = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', { cache: 'no-store' })
        const ids  = await r.json() as number[]
        const rows = await Promise.allSettled(
          ids.slice(0, 12).map(id =>
            fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(x => x.json())
          )
        )
        const titles = rows
          .filter((s): s is PromiseFulfilledResult<{ title: string }> =>
            s.status === 'fulfilled' && Boolean(s.value?.title))
          .map(s => s.value.title)
          .slice(0, 5)
        setNewsItems(titles)
      } catch { /* silent */ }
    }
    void fetch_hn()
    const id = setInterval(() => void fetch_hn(), 600_000)
    return () => clearInterval(id)
  }, [])

  // Typewriter engine
  const startTypewriter = useCallback(() => {
    if (twTimerRef.current) clearTimeout(twTimerRef.current)
    setTwText('')
    setMicVisible(false)

    let msgIdx = 0
    let text = ''

    function typeNext() {
      if (msgIdx >= msgs.length) {
        twTimerRef.current = setTimeout(() => setMicVisible(true), 400)
        return
      }
      const full = msgs[msgIdx]
      const toAdd = full.slice(text.length)
      let i = 0

      function tick() {
        if (i < toAdd.length) {
          text += toAdd[i]
          setTwText(text)
          i++
          twTimerRef.current = setTimeout(tick, toAdd[i - 1] === '\n' ? 85 : 52)
        } else {
          msgIdx++
          twTimerRef.current = setTimeout(typeNext, 1100)
        }
      }
      tick()
    }

    typeNext()
  }, [])

  // Cleanup typewriter timers on unmount
  useEffect(() => () => { if (twTimerRef.current) clearTimeout(twTimerRef.current) }, [])

  // Auto-scroll text to bottom while typing
  useEffect(() => {
    if (!textScrollRef.current || micVisible) return
    textScrollRef.current.scrollTop = textScrollRef.current.scrollHeight
  }, [twText, micVisible])

  // Scroll to top when message finishes, so user reads from the start
  useEffect(() => {
    if (!micVisible || !textScrollRef.current) return
    textScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
  }, [micVisible])

  // Orb tap handler
  const handleOrbTap = useCallback(() => {
    tapsRef.current += 1
    const taps = tapsRef.current

    if (taps === 1) {
      setOrbSub('Tap once more...')
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
      tapTimerRef.current = setTimeout(() => {
        tapsRef.current = 0
        setOrbSub('Double-tap to begin')
      }, 2000)
    }
    if (taps >= 2) {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
      fadingRef.current = true
      fadeAtRef.current = performance.now()
      setShowOrbital(false)
      setTimeout(() => {
        setShowTypewriter(true)
        startTypewriter()
      }, 1100)
    }
  }, [startTypewriter])

  // Mic tap → fade out typewriter screen → then transition
  const handleMicTap = useCallback(() => {
    if (micTapped) return
    setMicTapped(true)
    // Fade the screen out first, then hand off
    setTimeout(() => setShowTypewriter(false), 200)
    setTimeout(onComplete, 1100)
  }, [micTapped, onComplete])

  if (reducedMotion) return null

  const btcCls = btcUp === null ? '#FBBF24' : btcUp ? '#4ADE80' : '#F87171'

  const tickerSpans = (
    <>
      <TickSpan label="BTC / USD" value={btcText} col={btcCls} />
      <TickSpan label="EUR / USD" value={eurusd} col="#FBBF24" />
      <TickSpan label="USD / INR" value={usdinr} col="#FBBF24" />
      <TickSpan label="USD / AED" value={usdaed} col="#FBBF24" />
      <TickSpan label="S&P 500"   value="5,842 +1.2%"  col="#4ADE80" />
      <TickSpan label="NASDAQ"    value="18,440 +0.8%" col="#4ADE80" />
      <TickSpan label="SENSEX"    value="73,220 +0.9%" col="#4ADE80" />
      <TickSpan label="GOLD"      value="$3,020 +0.4%" col="#4ADE80" />
      <TickSpan label="CRUDE"     value="$69.40 -1.1%" col="#F87171" />
      <TickSpan label="FED RATE"  value="4.33%"        col="#FBBF24" />
      <TickSpan label="US CPI"    value="2.8% YoY"     col="#FBBF24" />
      <TickSpan label="INDIA GDP" value="8.4% YoY"     col="#4ADE80" />
    </>
  )

  const fadeStyle = (visible: boolean): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transition: 'opacity 1s ease',
    pointerEvents: visible ? 'auto' : 'none',
  })

  return (
    <div style={{ background: '#04040E', width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes scr      { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes opulse   {
          0%,100%{box-shadow:0 0 0 2px rgba(255,107,53,0.2),0 0 60px rgba(255,107,53,0.7),0 0 120px rgba(255,107,53,0.3),0 0 240px rgba(255,107,53,0.12);transform:scale(1);}
          50%    {box-shadow:0 0 0 3px rgba(255,107,53,0.35),0 0 90px rgba(255,107,53,1),  0 0 180px rgba(255,107,53,0.5),0 0 360px rgba(255,107,53,0.18);transform:scale(1.06);}
        }
        @keyframes opulse2  {
          0%,100%{box-shadow:0 0 60px rgba(255,107,53,0.7),0 0 140px rgba(255,107,53,0.3);}
          50%    {box-shadow:0 0 90px rgba(255,107,53,0.9),0 0 200px rgba(255,107,53,0.45);}
        }
        @keyframes orbRadiate {
          0%   {transform:scale(1);   opacity:0.55;}
          100% {transform:scale(3.2); opacity:0;}
        }
        @keyframes blink    { 50%{opacity:0} }
        @keyframes liveBlink{ 50%{opacity:0.3} }
        @keyframes micPulse {
          0%  {transform:scale(1);  opacity:.5;}
          100%{transform:scale(2.2);opacity:0;}
        }
        @keyframes tapBlink {
          0%,100%{opacity:1;transform:scale(1);}
          50%    {opacity:0.5;transform:scale(0.88);}
        }
      `}</style>

      {/* ── TICKER ── */}
      <div style={{
        ...fadeStyle(showOrbital),
        height: 30, zIndex: 20, position: 'relative',
        background: 'rgba(4,4,14,0.95)',
        borderBottom: '1px solid rgba(255,107,53,0.2)',
        overflow: 'hidden', whiteSpace: 'nowrap',
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{ display: 'inline-block', animation: 'scr 42s linear infinite' }}>
          {tickerSpans}{tickerSpans}
        </div>
      </div>

      {/* ── MAIN CANVAS AREA ── */}
      <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 30px)' }}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}
        />

        {/* Live dot */}
        <div style={{
          ...fadeStyle(showOrbital),
          position: 'absolute', top: 8, right: 14, zIndex: 20,
          fontFamily: 'Courier New, monospace', fontSize: 9,
          color: 'rgba(74,222,128,0.6)', letterSpacing: '0.1em',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: '#4ADE80',
            display: 'inline-block', animation: 'liveBlink 0.8s ease-in-out infinite',
            boxShadow: '0 0 6px rgba(74,222,128,0.8)',
          }} />
          LIVE
        </div>

        {/* Centre orb */}
        <div style={{
          ...fadeStyle(showOrbital),
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, calc(-50% - 18px))',
          zIndex: 10, textAlign: 'center',
        }}>
          {/* Radiating rings */}
          <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '2px solid rgba(255,107,53,0.45)',
                animation: `orbRadiate 2.4s ease-out ${i * 0.8}s infinite`,
                pointerEvents: 'none',
              }} />
            ))}
            <div
              role="button"
              tabIndex={0}
              onClick={handleOrbTap}
              onKeyDown={e => { if (e.key === 'Enter') handleOrbTap() }}
              style={{
                width: 160, height: 160, borderRadius: '50%',
                background: 'radial-gradient(circle at 36% 32%, #FFAA80, #FF6B35 45%, #B83010)',
                animation: 'opulse 2.8s ease-in-out infinite',
                cursor: 'pointer', position: 'relative',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {/* Double-tap icon — two stacked finger-tap circles */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                style={{ animation: 'tapBlink 1.6s ease-in-out infinite', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="4" fill="rgba(255,255,255,0.9)" />
                <circle cx="12" cy="12" r="7.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none" />
                <circle cx="12" cy="12" r="11" stroke="rgba(255,255,255,0.22)" strokeWidth="1" fill="none" />
              </svg>
              <span style={{
                fontFamily: 'Courier New, monospace',
                fontSize: 9, letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.4, textAlign: 'center',
              }}>
                double<br />tap
              </span>
            </div>
          </div>
          <div style={{
            fontFamily: 'Georgia, serif', fontSize: 14, letterSpacing: '0.05em',
            color: 'rgba(253,252,250,0.6)', marginTop: 20, lineHeight: 1.5,
          }}>
            Getting Baawa ready<br />for your assessment
          </div>
        </div>

        {/* News strip */}
        <div style={{
          ...fadeStyle(showOrbital),
          position: 'absolute', bottom: 52, left: 18, zIndex: 15,
          width: 280, pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: 'Courier New, monospace', fontSize: 8.5, letterSpacing: '0.18em',
            color: 'rgba(255,107,53,0.45)', textTransform: 'uppercase', marginBottom: 7,
          }}>
            Startup &amp; Tech — Now
          </div>
          {newsItems.map((title, i) => (
            <div key={i} style={{
              fontFamily: 'Courier New, monospace', fontSize: 9.5,
              color: 'rgba(253,252,250,0.4)', lineHeight: 1.6,
              marginBottom: 5, display: 'flex', gap: 6,
            }}>
              <span style={{ color: 'rgba(255,107,53,0.5)', flexShrink: 0 }}>›</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title}
              </span>
            </div>
          ))}
        </div>

        {/* Boot strip */}
        <div style={{
          ...fadeStyle(showOrbital),
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
          background: 'rgba(4,4,14,0.95)', borderTop: '1px solid rgba(99,102,241,0.12)',
          padding: '9px 20px', display: 'flex', gap: '0 24px', flexWrap: 'wrap',
          fontFamily: 'Courier New, monospace', fontSize: 9.5, color: 'rgba(253,252,250,0.35)',
        }}>
          {bootLines.map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, whiteSpace: 'nowrap', lineHeight: 1.8 }}>
              <span style={{ color: '#4ADE80' }}>+</span>
              <span>{line}</span>
            </div>
          ))}
          {!bootDone && (
            <div style={{ display: 'flex', gap: 6, whiteSpace: 'nowrap', lineHeight: 1.8 }}>
              <span style={{ color: '#FBBF24', animation: 'blink 0.6s step-end infinite' }}>{'>'}</span>
              <span>{bootCurrent}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── TYPEWRITER SCREEN ── */}
      <div style={{
        ...fadeStyle(showTypewriter),
        position: 'fixed', inset: 0, background: '#04040E', zIndex: 100,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Orb — pinned at top */}
        <div style={{
          width: 100, height: 100, borderRadius: '50%', flexShrink: 0,
          background: 'radial-gradient(circle at 36% 32%, #FFAA80, #FF6B35 45%, #B83010)',
          animation: 'opulse2 2.4s ease-in-out infinite',
          marginTop: 40, marginBottom: 28,
        }} />

        {/* Scrollable typed text */}
        <div ref={textScrollRef} style={{
          flex: 1, overflowY: 'auto', width: '100%', maxWidth: 580,
          padding: '0 28px',
        }}>
          <div style={{
            fontFamily: 'Georgia, serif',
            fontSize: 'clamp(15px, 2vw, 19px)',
            color: '#FDFCFA', lineHeight: 1.6, textAlign: 'center',
            whiteSpace: 'pre-wrap',
          }}>
            {twText}
            <span style={{
              display: 'inline-block', width: 2, height: '1em',
              background: '#FF6B35', verticalAlign: 'middle',
              animation: 'blink 0.75s step-end infinite', marginLeft: 3,
            }} />
          </div>
        </div>

        {/* Let's Begin */}
        <div style={{
          flexShrink: 0, padding: '28px 28px 40px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          opacity: micVisible ? 1 : 0,
          transition: 'opacity 0.8s ease',
          pointerEvents: micVisible ? 'auto' : 'none',
        }}>
          <button
            onClick={handleMicTap}
            style={{
              background: micTapped ? 'rgba(255,107,53,0.6)' : '#FF6B35',
              color: '#FDFCFA', border: 'none', cursor: 'pointer',
              padding: '14px 44px', borderRadius: '8px',
              fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 600,
              letterSpacing: '0.04em', transition: 'background 0.2s',
            }}
          >
            {micTapped ? 'Starting…' : "Let's Begin →"}
          </button>
          <div style={{
            fontFamily: 'Courier New, monospace', fontSize: 10,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'rgba(253,252,250,0.3)',
          }}>
            Your assessment awaits
          </div>
        </div>
      </div>
    </div>
  )
}

// Small helper — avoids repeating ticker item markup
function TickSpan({ label, value, col }: { label: string; value: string; col: string }) {
  return (
    <span style={{
      display: 'inline-block', margin: '0 22px',
      fontSize: 10.5, fontFamily: 'Courier New, monospace',
    }}>
      <span style={{ color: 'rgba(253,252,250,0.25)', marginRight: 5, letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ color: col }}>{value}</span>
    </span>
  )
}
