import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Search, X } from 'lucide-react'
import { usStocks, euStocks, asiaStocks, aiAlerts } from '../data/mockData'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import { useLiveIndices } from '../hooks/useLiveIndices'
import { useChart } from '../hooks/useChart'
import { fmtPrice, fmtPct } from '../utils/formatLive'
import { BrandLockup } from '../components/Navbar'

const ease = [0.22, 1, 0.36, 1]

const ALL_STOCKS   = [...usStocks, ...euStocks, ...asiaStocks]
const HERO_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'AMZN']
const HERO_NAMES   = Object.fromEntries(usStocks.map(s => [s.symbol, s.name]))

/* Where Foliyo has coverage — each one opens that region's board */
const REGIONS = [
  { key:'us',          label:'United States' },
  { key:'europe',      label:'Europe'        },
  { key:'asia',        label:'Asia Pacific'  },
  { key:'myanmar',     label:'Myanmar · YSX' },
  { key:'commodities', label:'Commodities'   },
  { key:'crypto',      label:'Crypto'        },
  { key:'forex',       label:'Forex'         },
]

/* What's inside — every row is a real page */
const TOOLS = [
  { to:'/markets',        name:'Markets',        desc:'Gainers, losers and sector moves across US, European and Asian equities.' },
  { to:'/global-markets', name:'Global markets', desc:'One board per region — including Myanmar’s Yangon Stock Exchange.' },
  { to:'/watchlist',      name:'Watchlist',      desc:'Pin the tickers you follow and read their moves at a glance.' },
  { to:'/compare',        name:'Compare',        desc:'Put stocks side by side on price, valuation and performance.' },
  { to:'/portfolio',      name:'Portfolio',      desc:'Log your positions to see value, gain or loss, and allocation.' },
  { to:'/simulator',      name:'Simulator',      desc:'Practise with $100,000 of virtual cash before risking your own.' },
  { to:'/ai-alerts',      name:'AI alerts',      desc:'Buy, hold and sell calls scored from momentum, valuation and sector — reasoning included.' },
  { to:'/news',           name:'News',           desc:'Market headlines with a read on whether each one leans bullish or bearish.' },
]

/* ── Hero stock search ─────────────────────────────────────── */
function HeroSearch() {
  const [q, setQ]             = useState('')
  const [focused, setFocused] = useState(false)
  const navigate              = useNavigate()

  const baseResults = q.trim().length >= 1
    ? ALL_STOCKS.filter(s =>
        s.symbol.toLowerCase().startsWith(q.toLowerCase()) ||
        s.name.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 6)
    : []

  /* Live-price overlay for whatever symbols are currently shown */
  const { quotes } = useBatchQuotes(baseResults.map(s => s.symbol), 0)
  const results = baseResults.map(s => {
    const q2 = quotes[s.symbol]
    return q2
      ? { ...s, price: q2.price, changePct: q2.changePct }
      : { ...s, price: null, changePct: null }
  })

  const go = (sym) => { setQ(''); setFocused(false); navigate(`/stock/${sym}`) }

  return (
    <div className="relative w-full max-w-lg">
      <label className="relative flex items-center rounded-lg border overflow-hidden"
        style={{ background:'var(--bg-2)', borderColor: focused ? 'rgba(var(--accent-rgb),.6)' : 'var(--border-light)',
          boxShadow: focused ? '0 0 0 3px rgba(var(--accent-rgb),.12)' : 'none',
          transition:'border-color .18s, box-shadow .18s' }}>
        <Search size={16} className="ml-4 shrink-0" style={{ color: focused ? 'var(--accent)' : 'var(--text-3)' }}/>
        <span className="sr-only">Search stocks</span>
        <input
          className="flex-1 min-w-0 bg-transparent text-[15px] px-3 py-3.5 outline-none"
          style={{ color:'var(--text-1)' }}
          placeholder="Search a ticker or company"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 160)}
          onKeyDown={e => { if (e.key === 'Enter' && results.length) go(results[0].symbol) }}
        />
        {q ? (
          <button type="button" aria-label="Clear search" className="mr-3 p-1 rounded transition-opacity opacity-60 hover:opacity-100"
            onClick={() => setQ('')} style={{ color:'var(--text-2)' }}>
            <X size={14}/>
          </button>
        ) : (
          <kbd className="mr-3 hidden sm:inline font-mono text-[10px] px-1.5 py-0.5 rounded border"
            style={{ color:'var(--text-3)', borderColor:'var(--border-light)' }}>Enter</kbd>
        )}
      </label>
      <AnimatePresence>
        {focused && results.length > 0 && (
          <motion.div
            initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:4 }}
            className="absolute left-0 right-0 mt-1.5 rounded-lg border shadow-2xl overflow-hidden z-50"
            style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
            {results.map(s => (
              <button key={s.symbol} onMouseDown={() => go(s.symbol)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left border-b last:border-0 transition-colors hover:bg-[var(--bg-3)]"
                style={{ borderColor:'var(--border)' }}>
                <div className="min-w-0">
                  <div className="text-sm font-bold" style={{ color:'var(--text-1)' }}>{s.symbol}</div>
                  <div className="text-xs truncate max-w-[220px]" style={{ color:'var(--text-3)' }}>{s.name}</div>
                </div>
                <div className="text-right shrink-0 font-mono">
                  <div className="text-sm" style={{ color: s.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
                    {fmtPrice(s.price)}
                  </div>
                  <div className={`text-xs ${s.changePct == null ? 'text-slate-500' : s.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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

/* ── Rising line — the mark, drawn from real data ──────────────
   Marigold line ending in the mark's arrowhead over a steel-teal
   wedge. Plain SVG so it can be shaped freely. */
function RisingLine({ data }) {
  const reduce = useReducedMotion()
  const W = 520, H = 200, PAD_T = 22, PAD_B = 6, PAD_R = 28

  const geom = useMemo(() => {
    if (!data || data.length < 2) return null
    const prices = data.map(d => d.price)
    const min = Math.min(...prices), max = Math.max(...prices)
    const span = max - min || 1
    const pts = prices.map((p, i) => [
      (i / (prices.length - 1)) * (W - PAD_R),
      PAD_T + (1 - (p - min) / span) * (H - PAD_T - PAD_B),
    ])
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    const area = `${line} L${pts.at(-1)[0].toFixed(1)},${H} L0,${H} Z`
    // Arrowhead follows the direction of the last stretch of the line
    const [x1, y1] = pts.at(-1), [x0, y0] = pts[Math.max(0, pts.length - 4)]
    const angle = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI
    return { line, area, tip: [x1, y1], angle }
  }, [data])

  if (!geom) return null
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible block" aria-hidden>
      <defs>
        <linearGradient id="hero-wedge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--steel)" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="var(--steel)" stopOpacity="0.03"/>
        </linearGradient>
      </defs>
      <motion.path d={geom.area} fill="url(#hero-wedge)"
        initial={reduce ? false : { opacity:0 }} animate={{ opacity:1 }} transition={{ duration:1, delay:0.5 }}/>
      <motion.path d={geom.line} fill="none" stroke="var(--accent)" strokeWidth="3.5"
        strokeLinejoin="round" strokeLinecap="round"
        initial={reduce ? false : { pathLength:0 }} animate={{ pathLength:1 }}
        transition={{ duration:1.4, ease }}/>
      <motion.path d="M-2,-10 L17,0 L-2,10 L3,0 Z" fill="var(--accent)"
        transform={`translate(${geom.tip[0]} ${geom.tip[1]}) rotate(${geom.angle})`}
        initial={reduce ? false : { opacity:0 }} animate={{ opacity:1 }}
        transition={{ delay:1.25, duration:0.3 }}/>
    </svg>
  )
}

/* ── Hero board — one benchmark line plus the names people check first ── */
function HeroBoard() {
  const { data, loading, isLive } = useChart('SPY', '1M', null)
  const { quotes } = useBatchQuotes(HERO_SYMBOLS, 60_000)

  const first = data?.[0]?.price, last = data?.at(-1)?.price
  const monthPct = first && last ? ((last - first) / first) * 100 : null
  const up = (monthPct ?? 0) >= 0

  return (
    <div className="relative rounded-xl border overflow-hidden"
      style={{ background:'var(--bg-1)', borderColor:'var(--border)', boxShadow:'0 30px 80px rgba(var(--shadow-color),.35)' }}>

      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div>
          <div className="section-label">S&amp;P 500 tracker · SPY · 1 month</div>
          <div className="mt-1.5 flex items-baseline gap-3">
            <span className="font-mono text-2xl font-semibold" style={{ color: last ? 'var(--text-1)' : 'var(--text-3)' }}>
              {last ? `$${last.toFixed(2)}` : '—'}
            </span>
            {monthPct != null && (
              <span className={`font-mono text-sm ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                {up ? '+' : ''}{monthPct.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded"
          style={isLive
            ? { color:'rgb(var(--up))', background:'rgb(var(--up) / .1)' }
            : { color:'var(--text-3)', background:'var(--bg-3)' }}>
          {loading ? 'Loading' : isLive ? 'Live' : 'Delayed'}
        </span>
      </div>

      <div className="relative mt-4 min-h-[150px] flex items-end">
        {data && data.length > 1 ? (
          <RisingLine data={data} />
        ) : (
          <div className="w-full h-[150px] mx-5 mb-5 rounded-md shimmer opacity-60" />
        )}
      </div>

      <ul className="border-t divide-y" style={{ borderColor:'var(--border)' }}>
        {HERO_SYMBOLS.map(sym => {
          const q = quotes[sym]
          const pct = q?.changePct
          return (
            <li key={sym} style={{ borderColor:'var(--border)' }}>
              <Link to={`/stock/${sym}`}
                className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-[var(--bg-2)]">
                <span className="flex items-baseline gap-2.5 min-w-0">
                  <span className="text-sm font-bold w-12 shrink-0" style={{ color:'var(--text-1)' }}>{sym}</span>
                  <span className="text-xs truncate" style={{ color:'var(--text-3)' }}>{HERO_NAMES[sym]}</span>
                </span>
                <span className="flex items-baseline gap-3 font-mono text-sm shrink-0">
                  <span style={{ color: q ? 'var(--text-1)' : 'var(--text-3)' }}>{fmtPrice(q?.price)}</span>
                  <span className={`w-16 text-right text-xs ${pct == null ? 'text-slate-500' : pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmtPct(pct)}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const STRIP_FALLBACK = ['S&P 500', 'NASDAQ', 'Dow Jones', 'FTSE 100', 'DAX', 'Nikkei 225']

export default function Landing() {
  const reduce = useReducedMotion()
  const rise = (delay = 0) => reduce ? {} : {
    initial: { opacity:0, y:18 }, animate: { opacity:1, y:0 }, transition: { duration:0.6, delay, ease },
  }

  /* Live overlay for the three sample signal cards */
  const alertSymbols = aiAlerts.slice(0,3).map(a => a.symbol)
  const { quotes: alertQuotes } = useBatchQuotes(alertSymbols, 60_000)
  const liveAlerts = aiAlerts.slice(0,3).map(a => {
    const q = alertQuotes[a.symbol]
    return q ? { ...a, price: q.price } : { ...a, price: null }
  })

  /* Index strip shows live values only — names with a dash until data lands */
  const { indices: liveIndices, isLive: indicesLive } = useLiveIndices(60_000)
  const stripIndices = indicesLive
    ? liveIndices.slice(0, 6).map(i => ({
        name: i.name,
        value: i.price.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }),
        change: `${i.changePct >= 0 ? '+' : ''}${i.changePct.toFixed(2)}%`,
        up: i.changePct >= 0,
      }))
    : STRIP_FALLBACK.map(name => ({ name, value:'—', change:'', up:true }))

  return (
    <div className="overflow-x-hidden" style={{ background:'var(--bg-0)' }}>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg pointer-events-none"
          style={{ maskImage:'linear-gradient(to bottom, black 30%, transparent)', WebkitMaskImage:'linear-gradient(to bottom, black 30%, transparent)' }}/>
        {/* One leaning steel plate behind the board — the mark's wedge, at scale */}
        <div className="absolute hidden lg:block pointer-events-none"
          style={{ right:'-8%', top:'10%', width:'48%', height:'84%', borderRadius:14,
                   background:'linear-gradient(165deg, rgba(var(--steel-rgb),.18), rgba(var(--steel-rgb),0) 72%)',
                   transform:'skewX(var(--lean))' }}/>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-20 lg:pb-24 grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">

          <div className="lg:col-span-7">
            <motion.div {...rise(0)} className="eyebrow mb-7">Markets · Portfolio · Signals</motion.div>

            <motion.h1 {...rise(0.06)} className="display-xl text-[2.1rem] min-[400px]:text-[2.4rem] sm:text-[3.25rem] lg:text-[3rem] xl:text-[3.9rem] mb-7"
              style={{ color:'var(--text-1)' }}>
              Every market.<br/>
              One <span className="lean" style={{ color:'var(--accent)' }}>forward</span> view.
            </motion.h1>

            <motion.p {...rise(0.14)} className="text-lg leading-relaxed mb-9 max-w-xl" style={{ color:'var(--text-2)' }}>
              Follow stocks from New York to Yangon, plus commodities, crypto and forex.
              Keep a watchlist, track your portfolio and test ideas in the simulator — in one place.
            </motion.p>

            <motion.div {...rise(0.22)} className="space-y-5">
              <HeroSearch />
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/markets" className="btn-primary text-[15px] px-7 py-3.5">
                  Explore markets <ArrowRight size={16}/>
                </Link>
                <Link to="/watchlist" className="btn-ghost text-[15px] px-6 py-3.5">
                  Open watchlist
                </Link>
              </div>
            </motion.div>

            <motion.div {...rise(0.3)} className="mt-12 pt-6 border-t max-w-xl" style={{ borderColor:'var(--border)' }}>
              <div className="section-label mb-3">Coverage</div>
              <div className="flex flex-wrap gap-1.5">
                {REGIONS.map(r => (
                  <Link key={r.key} to={`/global-markets?region=${r.key}`}
                    className="text-[13px] font-medium px-2.5 py-1 rounded-md border transition-colors hover:border-[rgba(var(--accent-rgb),.5)] hover:text-[var(--text-1)]"
                    style={{ color:'var(--text-2)', borderColor:'var(--border)' }}>
                    {r.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div className="lg:col-span-5"
            {...(reduce ? {} : { initial:{ opacity:0, y:28 }, animate:{ opacity:1, y:0 }, transition:{ duration:0.8, delay:0.2, ease } })}>
            <HeroBoard />
          </motion.div>
        </div>
      </section>

      {/* ── Indices strip ── */}
      <section className="border-y" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
            {stripIndices.map((idx, i) => (
              <div key={idx.name + i} className="py-5 pr-4">
                <div className="section-label mb-1.5 truncate">{idx.name}</div>
                <div className="flex items-baseline gap-2 font-mono flex-wrap">
                  <span className="text-base font-medium" style={{ color: idx.value === '—' ? 'var(--text-3)' : 'var(--text-1)' }}>{idx.value}</span>
                  {idx.change && <span className={`text-xs ${idx.up ? 'text-emerald-400' : 'text-red-400'}`}>{idx.change}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's inside ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24 sm:py-28 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4">
          <div className="lg:sticky" style={{ top:'calc(var(--header-h) + 32px)' }}>
            <div className="eyebrow mb-5">What’s inside</div>
            <h2 className="text-4xl sm:text-5xl font-black leading-[1.02] mb-5" style={{ color:'var(--text-1)' }}>
              Eight tools.<br/>One <span className="lean" style={{ color:'var(--accent)' }}>place.</span>
            </h2>
            <p className="text-base leading-relaxed max-w-sm" style={{ color:'var(--text-2)' }}>
              Every page opens without an account. Sign in when you want your watchlist and portfolio to follow you.
            </p>
          </div>
        </div>

        <ul className="lg:col-span-8 border-t" style={{ borderColor:'var(--border)' }}>
          {TOOLS.map((t, i) => (
            <motion.li key={t.to}
              initial={reduce ? false : { opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }}
              viewport={{ once:true, margin:'-40px' }} transition={{ delay: i * 0.04, duration:0.45, ease }}
              className="border-b" style={{ borderColor:'var(--border)' }}>
              <Link to={t.to} className="group grid sm:grid-cols-[230px_1fr_auto] items-baseline gap-x-6 gap-y-1 py-5 sm:py-6">
                <span className="font-display text-[1.4rem] font-extrabold whitespace-nowrap transition-colors group-hover:text-[var(--accent)]"
                  style={{ color:'var(--text-1)' }}>
                  {t.name}
                </span>
                <span className="text-[15px] leading-relaxed" style={{ color:'var(--text-2)' }}>{t.desc}</span>
                <ArrowUpRight size={20} className="hidden sm:block self-center transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                  style={{ color:'var(--text-3)' }}/>
              </Link>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* ── Signals preview ── */}
      <section className="border-y" style={{ borderColor:'var(--border)', background:'var(--bg-1)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <div className="eyebrow mb-5">AI alerts</div>
            <h2 className="text-4xl font-black leading-[1.05] mb-5" style={{ color:'var(--text-1)' }}>
              A call, a confidence score, and the <span className="lean" style={{ color:'var(--accent)' }}>why.</span>
            </h2>
            <p className="text-base leading-relaxed mb-8 max-w-md" style={{ color:'var(--text-2)' }}>
              Each signal weighs recent momentum, valuation and sector conditions, then shows its reasoning
              so you can disagree with it. A starting point for your own research — not financial advice.
            </p>
            <Link to="/ai-alerts" className="btn-primary">
              See all signals <ArrowRight size={15}/>
            </Link>
          </div>

          <div className="lg:col-span-7 space-y-3">
            {liveAlerts.map((alert, i) => {
              const tone = alert.type === 'BUY' ? 'up' : alert.type === 'SELL' ? 'down' : 'caution'
              return (
                <motion.div key={alert.id}
                  initial={reduce ? false : { opacity:0, x:24 }} whileInView={{ opacity:1, x:0 }}
                  viewport={{ once:true }} transition={{ delay: i * 0.08, duration:0.5, ease }}>
                  <Link to={`/stock/${alert.symbol}`} className="card block !p-4 sm:!p-5">
                    <div className="flex items-center gap-4">
                      <span className="text-[11px] font-bold tracking-wider px-2 py-1 rounded w-12 text-center shrink-0"
                        style={{ color:`rgb(var(--${tone}))`, background:`rgb(var(--${tone}) / .12)` }}>
                        {alert.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm" style={{ color:'var(--text-1)' }}>{alert.symbol}</div>
                        <div className="text-xs truncate" style={{ color:'var(--text-3)' }}>{alert.name}</div>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <div className="text-sm" style={{ color: alert.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
                          {alert.price != null ? `$${alert.price.toFixed(2)}` : '—'}
                        </div>
                        <div className="text-[11px]" style={{ color:'var(--text-3)' }}>{alert.confidence}% confidence</div>
                      </div>
                    </div>
                    <div className="mt-3.5 h-[3px] rounded-full overflow-hidden" style={{ background:'var(--bg-3)' }}>
                      <motion.div className="h-full rounded-full"
                        initial={reduce ? false : { width:0 }} whileInView={{ width:`${alert.confidence}%` }}
                        viewport={{ once:true }} transition={{ delay: 0.3 + i * 0.1, duration:0.8, ease }}
                        style={{ background:`rgb(var(--${tone}))` }}/>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Closing ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24 sm:py-28">
        <div className="relative rounded-xl overflow-hidden border px-6 sm:px-14 py-14 sm:py-16 grid md:grid-cols-[1fr_auto] gap-10 items-center"
          style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
          <div className="absolute -right-24 -bottom-28 w-[440px] h-[280px] pointer-events-none"
            style={{ background:'linear-gradient(160deg, rgba(var(--steel-rgb),.2), transparent 70%)', transform:'skewX(var(--lean))' }}/>
          <div className="relative">
            <h2 className="display-xl text-4xl sm:text-6xl mb-4" style={{ color:'var(--text-1)' }}>
              Start with one <span className="lean" style={{ color:'var(--accent)' }}>ticker.</span>
            </h2>
            <p className="text-base sm:text-lg max-w-lg" style={{ color:'var(--text-2)' }}>
              No account needed to browse. Open the markets board and follow whatever catches your eye.
            </p>
          </div>
          <div className="relative flex flex-col sm:flex-row md:flex-col gap-3">
            <Link to="/markets" className="btn-primary text-[15px] px-8 py-3.5 justify-center">
              Explore markets <ArrowRight size={16}/>
            </Link>
            <Link to="/simulator" className="btn-ghost text-[15px] px-8 py-3.5 justify-center">
              Try the simulator
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t" style={{ borderColor:'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-[1fr_auto] items-start">
          <div>
            <Link to="/" aria-label="Foliyo home" className="inline-block"><BrandLockup size={24}/></Link>
            <p className="text-xs mt-4 max-w-md leading-relaxed" style={{ color:'var(--text-3)' }}>
              Market data from Finnhub and Twelve Data; Myanmar prices from the Yangon Stock Exchange and may be delayed.
              Foliyo is for information and practice only and is not financial advice.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-2 text-sm">
            {TOOLS.map(t => (
              <Link key={t.to} to={t.to} className="transition-colors hover:text-[var(--text-1)]" style={{ color:'var(--text-2)' }}>
                {t.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 text-xs" style={{ color:'var(--text-3)' }}>
          © {new Date().getFullYear()} Foliyo
        </div>
      </footer>
    </div>
  )
}
