import { useRef, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { ArrowRight, BarChart2, Brain, Shield, TrendingUp, Bell, Activity, ChevronRight, Globe, Layers, Search } from 'lucide-react'
import { indices, usStocks, euStocks, asiaStocks, aiAlerts } from '../data/mockData'
import NetworkGlobe from '../components/NetworkGlobe'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import { useLiveIndices } from '../hooks/useLiveIndices'
import { fmtPrice, fmtPct } from '../utils/formatLive'

/* ── 3D tilt card hook ─────────────────────────────────────── */
function useTilt(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width - 0.5) * 18
      const y = ((e.clientY - r.top) / r.height - 0.5) * -18
      el.style.transform = `perspective(900px) rotateY(${x}deg) rotateX(${y}deg) scale(1.03)`
    }
    const onLeave = () => { el.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)' }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave) }
  }, [ref])
}

function TiltCard({ children, className = '', style = {} }) {
  const ref = useRef(null)
  useTilt(ref)
  return (
    <div ref={ref} className={className} style={{ transition:'transform 0.12s ease-out', willChange:'transform', ...style }}>
      {children}
    </div>
  )
}

/* ── Floating stock ticker card ────────────────────────────── */
function FloatCard({ stock, delay, animClass }) {
  const hasPrice = stock.price != null
  const up = hasPrice && stock.changePct >= 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6 }}
      className={`card-glass rounded-2xl px-4 py-3 min-w-[148px] ${animClass}`}
      style={{ boxShadow: !hasPrice ? '0 8px 32px rgba(0,0,0,.15)' : up ? '0 8px 32px rgba(16,185,129,.12)' : '0 8px 32px rgba(239,68,68,.1)' }}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="font-black text-sm" style={{ color: 'var(--text-1)' }}>{stock.symbol}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          !hasPrice ? 'bg-slate-400/15 text-slate-400' :
          up ? 'bg-emerald-400/15 text-emerald-400' : 'bg-red-400/15 text-red-400'
        }`}>
          {fmtPct(stock.changePct)}
        </span>
      </div>
      <div className="font-mono font-bold text-base" style={{ color: hasPrice ? 'var(--text-1)' : 'var(--text-3)' }}>{fmtPrice(stock.price)}</div>
      <div className="text-xs mt-0.5 truncate max-w-[120px]" style={{ color: 'var(--text-3)' }}>{stock.name}</div>
    </motion.div>
  )
}

/* ── Animated counter ──────────────────────────────────────── */
function Counter({ to, prefix = '', suffix = '', decimals = 0 }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let start = null
    const duration = 1800
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(parseFloat((eased * to).toFixed(decimals)))
      if (progress < 1) requestAnimationFrame(step)
    }
    const timer = setTimeout(() => requestAnimationFrame(step), 400)
    return () => clearTimeout(timer)
  }, [to, decimals])
  return <span>{prefix}{decimals > 0 ? val.toFixed(decimals) : val.toLocaleString()}{suffix}</span>
}

const features = [
  { icon: Brain,     title: 'AI-Powered Signals',   desc: 'Quantum-logic algorithms surface high-confidence trade signals across every asset class before the crowd catches on.',        color: 'var(--accent)',  gradient: 'from-cyan-500/20 to-blue-600/10' },
  { icon: Globe,     title: 'Global Markets',        desc: 'Live quotes for US, EU, Asian equities, commodities, FX, and crypto — all in one unified, low-latency feed.',              color: '#3b82f6',        gradient: 'from-blue-500/20 to-violet-600/10' },
  { icon: Layers,    title: 'Portfolio Intelligence',desc: 'Dynamic risk analytics, real-time P&L, sector allocation, and correlation mapping to optimise your returns.',              color: '#8b5cf6',        gradient: 'from-violet-500/20 to-pink-600/10' },
  { icon: Bell,      title: 'Smart Alerts',          desc: 'Configurable alerts for price levels, volume spikes, news sentiment shifts, and AI-detected breakout patterns.',            color: '#10b981',        gradient: 'from-emerald-500/20 to-teal-600/10' },
  { icon: Shield,    title: 'Risk Management',       desc: 'Advanced stop-loss modelling, position sizing, and drawdown protection powered by Monte Carlo simulation.',                color: '#f97316',        gradient: 'from-orange-500/20 to-amber-600/10' },
  { icon: TrendingUp,title: 'Predictive Analytics',  desc: 'Proprietary forecasting models trained on decades of data to identify emerging trends ahead of consensus.',               color: '#f43f5e',        gradient: 'from-rose-500/20 to-pink-600/10' },
]

const stats = [
  { value: 8400,  suffix: '+', label: 'Stocks Tracked',  prefix: '' },
  { value: 180,   suffix: '+', label: 'Global Markets',  prefix: '' },
  { value: 47,    suffix: '+', label: 'Countries',        prefix: '' },
  { value: 6,     suffix: '',  label: 'Asset Classes',    prefix: '' },
]

const ALL_STOCKS = [...usStocks, ...euStocks, ...asiaStocks]
const floatStocks = [usStocks[0], usStocks[2], usStocks[4], usStocks[6]]

/* ── Hero stock search ─────────────────────────────────────── */
function HeroSearch() {
  const [q, setQ]           = useState('')
  const [focused, setFocused] = useState(false)
  const navigate              = useNavigate()

  const baseResults = q.trim().length >= 1
    ? ALL_STOCKS.filter(s =>
        s.symbol.toLowerCase().startsWith(q.toLowerCase()) ||
        s.name.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 7)
    : []

  /* Live-price overlay for whatever symbols are currently shown */
  const { quotes } = useBatchQuotes(baseResults.map(s => s.symbol), 0)
  const results = baseResults.map(s => {
    const q2 = quotes[s.symbol]
    return q2
      ? { ...s, price: q2.price, change: q2.change, changePct: q2.changePct }
      : { ...s, price: null, change: null, changePct: null }
  })

  const go = (sym) => { setQ(''); setFocused(false); navigate(`/stock/${sym}`) }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative flex items-center rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background:'var(--bg-2)', borderColor: focused ? 'rgba(var(--accent-rgb),.5)' : 'var(--border)',
          boxShadow: focused ? `0 0 0 3px rgba(var(--accent-rgb),.1), 0 16px 40px rgba(0,0,0,.3)` : '0 12px 40px rgba(0,0,0,.2)',
          transition:'border-color .18s, box-shadow .18s' }}>
        <Search size={15} className="ml-4 shrink-0" style={{ color:'var(--text-3)' }}/>
        <input
          className="flex-1 bg-transparent text-sm px-3 py-3.5 outline-none"
          style={{ color:'var(--text-1)' }}
          placeholder="Search any stock, e.g. AAPL, Tesla…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 160)}
          onKeyDown={e => { if (e.key === 'Enter' && results.length) go(results[0].symbol) }}
        />
        {q && (
          <button className="mr-3 opacity-50 hover:opacity-100 transition-opacity"
            onClick={() => setQ('')} style={{ color:'var(--text-3)' }}>
            ✕
          </button>
        )}
      </div>
      <AnimatePresence>
        {focused && results.length > 0 && (
          <motion.div
            initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:4 }}
            className="absolute left-0 right-0 mt-1.5 rounded-2xl border shadow-2xl overflow-hidden z-50"
            style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
            {results.map((s, i) => (
              <button key={s.symbol} onMouseDown={() => go(s.symbol)}
                className="w-full flex items-center justify-between px-4 py-3 text-left border-b last:border-0 transition-colors"
                style={{ borderColor:'var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                    style={{ background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)' }}>
                    {s.symbol.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color:'var(--text-1)' }}>{s.symbol}</div>
                    <div className="text-xs truncate max-w-[180px]" style={{ color:'var(--text-3)' }}>{s.name}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono font-semibold" style={{ color: s.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
                    {fmtPrice(s.price)}
                  </div>
                  <div className={`text-xs font-bold ${s.changePct == null ? 'text-slate-500' : s.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmtPct(s.changePct)}
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Landing() {
  const heroRef = useRef(null)
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 600], [0, -120])
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0])

  const [tickerIdx, setTickerIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTickerIdx(i => (i + 1) % indices.length), 2800)
    return () => clearInterval(id)
  }, [])

  /* Live data overlays — null out mock prices so cards show "—" until live data lands */
  const floatSymbols = floatStocks.map(s => s.symbol)
  const { quotes } = useBatchQuotes(floatSymbols, 60_000)
  const liveFloatStocks = floatStocks.map(s => {
    const q = quotes[s.symbol]
    return q
      ? { ...s, price: q.price, change: q.change, changePct: q.changePct }
      : { ...s, price: null, change: null, changePct: null }
  })

  /* Live overlay for the 3 sample AI alert cards */
  const alertSymbols = aiAlerts.slice(0,3).map(a => a.symbol)
  const { quotes: alertQuotes } = useBatchQuotes(alertSymbols, 60_000)
  const liveAlerts = aiAlerts.slice(0,3).map(a => {
    const q = alertQuotes[a.symbol]
    return q ? { ...a, price: q.price } : { ...a, price: null }
  })

  const { indices: liveIndices, isLive: indicesLive } = useLiveIndices(60_000)
  /* When live data is available, show ONLY live indices.
   * When not (no API key / rate-limited), fall back to mock so the section isn't empty. */
  const stripIndices = indicesLive
    ? liveIndices.map(i => ({
        name: i.name,
        value: i.price.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }),
        change: `${i.changePct >= 0 ? '+' : ''}${i.changePct.toFixed(2)}%`,
        up: i.changePct >= 0,
      }))
    : indices.slice(0, 6)

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg-0)' }}>

      {/* ── Live Ticker Bar ── */}
      <div className="border-b overflow-hidden py-2.5 flex items-center gap-3"
        style={{ background: 'var(--bg-1)', borderColor: 'var(--border)' }}>
        {indicesLive && (
          <span className="shrink-0 ml-4 inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: '#10b981', background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)' }}>
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"/>LIVE
          </span>
        )}
        <div className="marquee-inner whitespace-nowrap flex-1">
          {[...stripIndices, ...stripIndices].map((idx, i) => (
            <span key={i} className="inline-flex items-center gap-2 mx-6 text-xs">
              <span className="font-semibold" style={{ color: 'var(--text-3)' }}>{idx.name}</span>
              <span className="font-mono font-bold" style={{ color: 'var(--text-1)' }}>{idx.value}</span>
              <span className={`font-semibold ${idx.up ? 'text-emerald-400' : 'text-red-400'}`}>{idx.change}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative min-h-[94vh] flex items-center overflow-hidden">
        {/* Grid + glow */}
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute inset-0 hero-glow" />

        {/* Animated orbs */}
        <motion.div className="orb w-[500px] h-[500px]" style={{ background: 'var(--accent)', top: '-15%', right: '10%' }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.18, 0.26, 0.18] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="orb w-[380px] h-[380px]" style={{ background: '#8b5cf6', bottom: '5%', left: '-8%' }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.14, 0.22, 0.14] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: 'linear-gradient(to top, var(--bg-0), transparent)' }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity }}
          className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full py-28 grid lg:grid-cols-2 gap-12 items-center">

          {/* Left — headline */}
          <div>
            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6 }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7 text-xs font-semibold"
              style={{ background:`rgba(var(--accent-rgb),.1)`, border:`1px solid rgba(var(--accent-rgb),.25)`, color:'var(--accent)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:'var(--accent)' }} />
              Real-time Portfolio Intelligence Platform
            </motion.div>

            <motion.h1 initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.7, delay:0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.04] tracking-tight mb-6"
              style={{ color:'var(--text-1)' }}>
              Invest<br />
              <span style={{ color:'var(--accent)', textShadow:`0 0 40px rgba(var(--accent-rgb),.4)` }}>Smarter.</span><br />
              <span style={{ color:'var(--text-2)' }}>Everywhere.</span>
            </motion.h1>

            <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.2 }}
              className="text-lg sm:text-xl leading-relaxed mb-10 max-w-lg" style={{ color:'var(--text-2)' }}>
              Track every stock, commodity, and currency across global markets.
              AI-powered signals, real-time analytics, and portfolio intelligence — all in one place.
            </motion.p>

            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.3 }}
              className="space-y-4">
              <HeroSearch />
              <div className="flex flex-wrap gap-3">
                <Link to="/markets" className="btn-primary text-base px-7 py-3.5 gap-2 shadow-xl"
                  style={{ boxShadow:`0 12px 32px rgba(var(--accent-rgb),.35)` }}>
                  Explore Markets <ArrowRight size={16} />
                </Link>
                <Link to="/watchlist" className="btn-ghost text-base px-7 py-3.5">
                  My Watchlist <ChevronRight size={16} />
                </Link>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.7, duration:0.8 }}
              className="flex flex-wrap gap-x-8 gap-y-4 mt-12 pt-8 border-t"
              style={{ borderColor:'rgba(var(--accent-rgb),0.12)' }}>
              {stats.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.8 + i * 0.08 }}>
                  <div className="text-3xl font-black font-mono tracking-tight" style={{ color:'var(--text-1)' }}>
                    <Counter to={s.value} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals ?? 0} />
                  </div>
                  <div className="text-xs mt-0.5 font-medium" style={{ color:'var(--text-3)' }}>{s.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right — Network Globe + floating cards */}
          <motion.div
            initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
            transition={{ duration:0.9, delay:0.3, ease:[0.22,1,0.36,1] }}
            className="relative hidden lg:flex items-center justify-center h-[520px]">

            {/* Globe */}
            <div className="absolute inset-0 flex items-center justify-center">
              <NetworkGlobe size={480} colorRgb="6,182,212"/>
            </div>

            {/* Soft outer glow */}
            <div className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background:'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.06) 0%, transparent 70%)' }}/>

            {/* Floating stock chips on top of globe */}
            <div className="absolute top-10 left-6" style={{ animation:'float1 6s ease-in-out infinite' }}>
              <FloatCard stock={liveFloatStocks[0]} delay={0.5} animClass=""/>
            </div>
            <div className="absolute top-6 right-2" style={{ animation:'float2 7.5s ease-in-out infinite' }}>
              <FloatCard stock={liveFloatStocks[1]} delay={0.75} animClass=""/>
            </div>
            <div className="absolute bottom-20 left-2" style={{ animation:'float3 8s ease-in-out infinite' }}>
              <FloatCard stock={liveFloatStocks[2]} delay={1.0} animClass=""/>
            </div>
            <div className="absolute bottom-12 right-4" style={{ animation:'float1 9s ease-in-out infinite reverse' }}>
              <FloatCard stock={liveFloatStocks[3]} delay={1.2} animClass=""/>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Indices Strip ── */}
      <section className="py-10 border-y" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {stripIndices.map((idx, i) => (
              <motion.div key={idx.name + i}
                initial={{ opacity:0, y:14 }} whileInView={{ opacity:1, y:0 }}
                viewport={{ once:true }} transition={{ delay: i * 0.06 }}
                className="idx-card"
              >
                <div className="section-label mb-1.5 truncate">{idx.name}</div>
                <div className="font-black font-mono text-base tracking-tight" style={{ color:'var(--text-1)' }}>{idx.value}</div>
                <div className={`text-xs font-bold mt-0.5 ${idx.up ? 'text-emerald-400' : 'text-red-400'}`}>{idx.change}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-28 max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
          className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color:'var(--accent)' }}>
            <span className="w-8 h-px" style={{ background:'var(--accent)' }} />
            Platform Capabilities
            <span className="w-8 h-px" style={{ background:'var(--accent)' }} />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black mb-4" style={{ color:'var(--text-1)' }}>
            Everything you need<br />to trade smarter
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color:'var(--text-2)' }}>
            Foliyo unifies real-time data, AI intelligence, and portfolio tools into one beautifully crafted platform.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity:0, y:30 }} whileInView={{ opacity:1, y:0 }}
              viewport={{ once:true }} transition={{ delay: i * 0.08, duration:0.5 }}>
              <TiltCard className={`card border overflow-hidden relative h-full`} style={{ borderColor:'var(--border)' }}>
                {/* Gradient bg */}
                <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-50`} />
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background:`rgba(var(--accent-rgb),.12)`, border:`1px solid rgba(var(--accent-rgb),.2)` }}>
                    <f.icon size={20} style={{ color: f.color }} />
                  </div>
                  <h3 className="font-bold text-base mb-2" style={{ color:'var(--text-1)' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color:'var(--text-2)' }}>{f.desc}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── AI Alerts Preview ── */}
      <section className="py-20 border-y" style={{ borderColor:'var(--border)', background:'var(--bg-1)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity:0, x:-30 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }}>
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase mb-4"
                style={{ color:'var(--accent)' }}>
                <Brain size={13} /> AI Intelligence
              </div>
              <h2 className="text-4xl font-black mb-4" style={{ color:'var(--text-1)' }}>
                Signals that think<br />ahead of the market
              </h2>
              <p className="text-lg mb-6" style={{ color:'var(--text-2)' }}>
                Our quantum-logic engine analyses billions of data points per day to generate trade signals with confidence scores, risk/reward ratios, and detailed reasoning.
              </p>
              <Link to="/ai-alerts" className="btn-primary inline-flex">
                View All Signals <ArrowRight size={15} />
              </Link>
            </motion.div>

            <div className="space-y-3">
              {liveAlerts.map((alert, i) => (
                <motion.div key={alert.id}
                  initial={{ opacity:0, x:30 }} whileInView={{ opacity:1, x:0 }}
                  viewport={{ once:true }} transition={{ delay: i * 0.1 }}>
                  <TiltCard className="card border" style={{ borderColor:'var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black"
                        style={{ background:`rgba(var(--accent-rgb),.12)`, color:'var(--accent)' }}>
                        {alert.symbol.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm" style={{ color:'var(--text-1)' }}>{alert.symbol}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            alert.type === 'BUY' ? 'bg-emerald-400/15 text-emerald-400' :
                            alert.type === 'SELL' ? 'bg-red-400/15 text-red-400' :
                            'bg-yellow-400/15 text-yellow-400'
                          }`}>{alert.type}</span>
                        </div>
                        <div className="text-xs truncate" style={{ color:'var(--text-3)' }}>{alert.name}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold font-mono" style={{ color: alert.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
                          {alert.price != null ? `$${alert.price.toFixed(2)}` : '—'}
                        </div>
                        <div className="text-xs" style={{ color:'var(--accent)' }}>{alert.confidence}% conf.</div>
                      </div>
                    </div>
                    <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background:'var(--bg-3)' }}>
                      <motion.div className="h-1 rounded-full"
                        initial={{ width:0 }} whileInView={{ width:`${alert.confidence}%` }}
                        viewport={{ once:true }} transition={{ delay: 0.3 + i * 0.1, duration:0.8 }}
                        style={{ background: alert.confidence >= 85 ? '#10b981' : alert.confidence >= 70 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                  </TiltCard>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.div initial={{ opacity:0, y:30 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}>
          <TiltCard className="card-glass rounded-3xl py-16 px-8 relative overflow-hidden accent-glow">
            <div className="absolute inset-0 grid-bg opacity-40" />
            <div className="absolute inset-0 hero-glow opacity-60" />
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
                style={{ background:'var(--accent)', boxShadow:`0 16px 48px rgba(var(--accent-rgb),.5)` }}>
                <Activity size={28} style={{ color:'var(--bg-0)' }} />
              </div>
              <h2 className="text-4xl sm:text-5xl font-black mb-4" style={{ color:'var(--text-1)' }}>
                Start investing smarter today
              </h2>
              <p className="text-lg mb-10 max-w-md mx-auto" style={{ color:'var(--text-2)' }}>
                Free forever. No credit card. Full access to global markets, AI signals, and portfolio tools.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/markets" className="btn-primary text-base px-8 py-3.5 justify-center shadow-xl"
                  style={{ boxShadow:`0 12px 32px rgba(var(--accent-rgb),.4)` }}>
                  <BarChart2 size={16} /> Open Markets
                </Link>
                <Link to="/watchlist" className="btn-ghost text-base px-8 py-3.5 justify-center">
                  <Activity size={16} /> My Watchlist
                </Link>
              </div>
            </div>
          </TiltCard>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-8" style={{ borderColor:'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background:'var(--accent)' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M2 12 L6 4 L10 9 L13 6 L14 8" stroke="rgba(0,0,0,0.9)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-black text-sm" style={{ color:'var(--text-1)' }}>
              Foli<span style={{ color:'var(--accent)' }}>yo</span>
            </span>
          </Link>
          <p className="text-xs" style={{ color:'var(--text-3)' }}>© {new Date().getFullYear()} Foliyo · Portfolio Intelligence Platform</p>
          <div className="flex gap-5 text-xs" style={{ color:'var(--text-3)' }}>
            {['Privacy','Terms','API Docs'].map(l => (
              <span key={l} className="hover:text-accent cursor-pointer transition-colors" style={{ '--hover':'var(--accent)' }}>{l}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
