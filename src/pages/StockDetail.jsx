import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, TrendingDown, Star, GitCompare,
  Activity, BarChart2, Newspaper, Brain, AlertTriangle, CheckCircle, Minus,
  RefreshCw, WifiOff, Clock, Database, ArrowUpRight, ArrowUpToLine, Zap,
} from 'lucide-react'
import { stocks, newsArticles } from '../data/mockData'
import { generateAIAnalysis } from '../utils/aiAnalysis'
import { useQuote } from '../hooks/useQuote'
import { useCompanyNews } from '../hooks/useMarketNews'
import { useChart } from '../hooks/useChart'
import { useFundamentals } from '../hooks/useFundamentals'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import { StatusPill } from '../components/PageHeader'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar,
} from 'recharts'

const RANGES = ['1D','5D','1M','6M','1Y','5Y','All']
const MONO_TICK = { fontSize:11, fill:'var(--text-3)', fontFamily:"'IBM Plex Mono', monospace" }

/* ── Chart tooltip ─────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs border shadow-lg"
      style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
      <p className="font-mono" style={{ color:'var(--text-3)' }}>{label}</p>
      <p className="font-bold font-mono" style={{ color:'var(--text-1)' }}>
        ${payload[0]?.value?.toFixed(2)}
      </p>
    </div>
  )
}

/* ── Skeleton block ────────────────────────────────────────── */
const Skeleton = ({ h = 'h-4', w = 'w-full', className = '' }) => (
  <div className={`rounded-lg animate-pulse ${h} ${w} ${className}`}
    style={{ background:'var(--bg-3)' }}/>
)

/* ── AI verdict badge ──────────────────────────────────────── */
const VERDICT = {
  Bullish: { icon: CheckCircle,   rgb:'var(--up)'      },
  Bearish: { icon: AlertTriangle, rgb:'var(--down)'    },
  Neutral: { icon: Minus,         rgb:'var(--caution)' },
}

const VerdictBadge = ({ verdict }) => {
  const cfg = VERDICT[verdict] || VERDICT.Neutral
  const Icon = cfg.icon
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md"
      style={{ color:`rgb(${cfg.rgb})`, background:`rgb(${cfg.rgb} / .1)`, border:`1px solid rgb(${cfg.rgb} / .2)` }}>
      <Icon size={11}/> {verdict}
    </span>
  )
}

/* ── AI Analysis Card ──────────────────────────────────────── */
function AIAnalysisCard({ stock }) {
  const ai = generateAIAnalysis(stock)
  if (!ai) return null
  const { verdict, summary, reasons, risks, techSummary, fundSummary, newsImpact } = ai
  const verdictRgb = (VERDICT[verdict] || VERDICT.Neutral).rgb

  return (
    <motion.div
      initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }}
      viewport={{ once:true }} transition={{ duration:0.4 }}
      className="card-flat space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Brain size={16} style={{ color:'var(--accent)' }}/>
          <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>AI Analysis</span>
          <span className="text-xs px-2 py-0.5 rounded-md font-medium"
            style={{ background:`rgba(var(--accent-rgb),.08)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.15)` }}>
            Rule-based
          </span>
        </div>
        <VerdictBadge verdict={verdict}/>
      </div>

      {/* Verdict bar */}
      <div className="rounded-lg p-4 border" style={{ background:'var(--bg-1)', borderColor:`rgb(${verdictRgb} / .18)` }}>
        <p className="text-sm leading-relaxed" style={{ color:'var(--text-2)' }}>{summary}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Reasons */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color:'rgb(var(--up))' }}>
            Key Reasons
          </div>
          <ul className="space-y-2">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color:'var(--text-2)' }}>
                <CheckCircle size={12} className="mt-0.5 shrink-0 text-emerald-400"/>
                {r}
              </li>
            ))}
          </ul>
        </div>

        {/* Risks */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color:'rgb(var(--down))' }}>
            Risk Factors
          </div>
          <ul className="space-y-2">
            {risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color:'var(--text-2)' }}>
                <AlertTriangle size={12} className="mt-0.5 shrink-0 text-red-400"/>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label:'Technical', text: techSummary },
          { label:'Fundamental', text: fundSummary },
          { label:'News Impact', text: newsImpact },
        ].map(({ label, text }) => (
          <div key={label} className="rounded-lg p-3.5 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color:'var(--text-3)' }}>{label}</div>
            <p className="text-xs leading-relaxed" style={{ color:'var(--text-2)' }}>{text}</p>
          </div>
        ))}
      </div>

      <p className="text-xs" style={{ color:'var(--text-3)' }}>
        For informational purposes only. Not financial advice. Always do your own research.
      </p>
    </motion.div>
  )
}

/* ── Main page ─────────────────────────────────────────────── */
/* ── Watchlist localStorage helpers ─────────────────────────── */
const WL_KEY  = 'foliyo_watchlist'
const WL_META = 'foliyo_watchlist_meta'
function wlLoad() { try { return new Set(JSON.parse(localStorage.getItem(WL_KEY) || '[]')) } catch { return new Set() } }
function wlSaveMeta(symbol, name) {
  try {
    const meta = JSON.parse(localStorage.getItem(WL_META) || '{}')
    meta[symbol] = { name }
    localStorage.setItem(WL_META, JSON.stringify(meta))
  } catch {}
}

export default function StockDetail() {
  const { symbol } = useParams()
  const [range, setRange]           = useState('1M')
  const [logoError, setLogoError]   = useState(false)
  const [watchlisted, setWatchlist] = useState(() => wlLoad().has(symbol))

  const stock = stocks.find(s => s.symbol === symbol) || stocks[0]

  const { quote, status, lastUpdated, refetch } = useQuote(symbol)
  const { articles: liveNews } = useCompanyNews(symbol)
  const { data: chartData, loading: chartLoading, isLive: chartLive, source: chartSource, refetch: refetchChart } = useChart(symbol, range, stock.price)
  const { data: fundamentals, loading: fundsLoading } = useFundamentals(symbol)

  /* Show "—" rather than mock prices until live data arrives. */
  const livePrice     = quote?.price     ?? null
  const liveChange    = quote?.change    ?? null
  const liveChangePct = quote?.changePct ?? null
  const hasPrice = livePrice != null

  const relatedNews = (liveNews.length ? liveNews : newsArticles.filter(n => n.relatedSymbols?.includes(stock.symbol)))
    .slice(0, 4)
  const relatedBase = stocks
    .filter(s => s.symbol !== stock.symbol && s.sector === stock.sector)
    .slice(0, 4)
  const { quotes: relatedQuotes } = useBatchQuotes(relatedBase.map(s => s.symbol), 60_000)
  const related = relatedBase.map(s => {
    const q = relatedQuotes[s.symbol]
    return q
      ? { ...s, price: q.price, change: q.change, changePct: q.changePct }
      : { ...s, price: null, change: null, changePct: null }
  })

  const isUp        = liveChangePct != null && liveChangePct >= 0
  const strokeColor = liveChangePct == null ? 'var(--accent)' : isUp ? 'rgb(var(--up))' : 'rgb(var(--down))'

  /* ── Watchlist toggle ── */
  const toggleWatchlist = () => {
    const wl = wlLoad()
    if (watchlisted) { wl.delete(symbol) } else {
      wl.add(symbol)
      wlSaveMeta(symbol, stock.name)
    }
    localStorage.setItem(WL_KEY, JSON.stringify([...wl]))
    setWatchlist(!watchlisted)
  }

  /* ── Smart signal badges ── */
  const signals = []
  if (quote?.price && quote?.high && quote.price >= quote.high * 0.98)
    signals.push({ label:'Trading near today\'s high', rgb:'var(--up)', icon:ArrowUpRight })
  if (quote?.price && fundamentals?.week52High && quote.price >= fundamentals.week52High * 0.97)
    signals.push({ label:'Near 52-week high', rgb:'var(--caution)', icon:ArrowUpToLine })
  if (quote?.price && fundamentals?.week52Low && quote.price <= fundamentals.week52Low * 1.05)
    signals.push({ label:'Near 52-week low', rgb:'var(--down)', icon:AlertTriangle })
  if (liveChangePct != null && liveChangePct >= 4)
    signals.push({ label:`Strong day +${liveChangePct.toFixed(1)}%`, rgb:'var(--up)', icon:Zap })
  if (liveChangePct != null && liveChangePct <= -4)
    signals.push({ label:`Sharp decline ${liveChangePct.toFixed(1)}%`, rgb:'var(--down)', icon:TrendingDown })

  /* Build metrics list — only include rows where we have a real value */
  const fmt$ = v => v != null ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}` : null
  const fmtX = v => v != null ? `${Number(v).toFixed(2)}x` : null
  const fmtPct = v => v != null ? `${Number(v).toFixed(2)}%` : null
  const fmtN = v => v != null ? Number(v).toFixed(2) : null

  const allMetrics = [
    ['Day High',   fmt$(quote?.high)],
    ['Day Low',    fmt$(quote?.low)],
    ['Prev Close', fmt$(quote?.prevClose)],
    ['52W High',   fmt$(fundamentals?.week52High)],
    ['52W Low',    fmt$(fundamentals?.week52Low)],
    ['Mkt Cap',    fundamentals?.mktCap ?? stock.mktCap ?? null],
    ['P/E Ratio',  fmtX(fundamentals?.pe ?? stock.pe)],
    ['EPS (TTM)',  fmt$(fundamentals?.eps)],
    ['Div Yield',  fmtPct(fundamentals?.dividendYield)],
    ['Beta',       fmtN(fundamentals?.beta)],
    ['P/B Ratio',  fmtX(fundamentals?.pb)],
    ['ROE',        fmtPct(fundamentals?.roe)],
  ]
  const metrics = allMetrics.filter(([, v]) => v != null && v !== '—')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 page-enter">

      {/* Back */}
      <Link to="/markets"
        className="inline-flex items-center gap-2 text-sm transition-colors hover:text-accent"
        style={{ color:'var(--text-3)' }}>
        <ArrowLeft size={14}/> Back to Markets
      </Link>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        <div className="flex items-center gap-4">
          <motion.div initial={{ scale:0.8, opacity:0 }} animate={{ scale:1, opacity:1 }}>
            {!logoError ? (
              <img
                src={`https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${symbol}.png`}
                alt={symbol}
                className="w-14 h-14 rounded-xl object-contain p-1.5"
                style={{ background:'var(--bg-3)', border:'1px solid var(--border)' }}
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black"
                style={{ background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.25)` }}>
                {symbol.charAt(0)}
              </div>
            )}
          </motion.div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="display-xl text-4xl sm:text-5xl" style={{ color:'var(--text-1)' }}>{stock.symbol}</h1>
              <span className="text-xs px-2.5 py-1 rounded-md font-medium"
                style={{ background:'var(--bg-3)', color:'var(--text-3)' }}>
                {stock.sector}
              </span>
              {stock.exchange && (
                <span className="text-xs px-2.5 py-1 rounded-md font-medium"
                  style={{ background:'var(--bg-3)', color:'var(--text-3)' }}>
                  {stock.exchange}
                </span>
              )}
            </div>
            <p className="text-sm mt-1.5" style={{ color:'var(--text-2)' }}>{stock.name}</p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1 sm:justify-end flex-wrap">
              <div className="text-4xl font-black font-mono leading-none" style={{ color: hasPrice ? 'var(--text-1)' : 'var(--text-3)' }}>
                {hasPrice ? `$${livePrice.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}` : '—'}
              </div>
              {/* Data status */}
              {status === 'loading' && <StatusPill pulse>Loading</StatusPill>}
              {status === 'live' && <StatusPill tone="live" pulse>Live</StatusPill>}
              {status === 'closed' && <StatusPill><Clock size={10}/>Closed</StatusPill>}
              {(status === 'unavailable' || status === 'error') && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md border whitespace-nowrap"
                  style={{ color:'rgb(var(--down))', background:'rgb(var(--down) / .08)', borderColor:'rgb(var(--down) / .2)' }}>
                  <WifiOff size={10}/>Unavailable
                </span>
              )}
            </div>
            {hasPrice && (
              <div className={`flex items-center sm:justify-end gap-1.5 text-sm font-bold font-mono ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {isUp ? <ArrowUpRight size={14}/> : <TrendingDown size={14}/>}
                {isUp ? '+' : ''}{liveChange.toFixed(2)} ({isUp ? '+' : ''}{liveChangePct.toFixed(2)}%)
                <span className="text-xs font-normal font-sans" style={{ color:'var(--text-3)' }}>Today</span>
              </div>
            )}
            {lastUpdated && (
              <div className="flex items-center sm:justify-end gap-1 text-xs mt-1" style={{ color:'var(--text-3)' }}>
                <Clock size={10}/>
                Updated <span className="font-mono">{new Date(lastUpdated).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                <button onClick={refetch} aria-label="Refresh quote" className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
                  <RefreshCw size={10}/>
                </button>
              </div>
            )}
          </div>
          {/* Signal badges */}
          {signals.length > 0 && (
            <div className="flex flex-wrap sm:justify-end gap-1.5 mb-1">
              {signals.map(({ label, rgb, icon:Icon }) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border"
                  style={{ color:`rgb(${rgb})`, background:`rgb(${rgb} / .08)`, borderColor:`rgb(${rgb} / .2)` }}>
                  <Icon size={12}/> {label}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 flex-wrap sm:justify-end items-center">
            <button onClick={toggleWatchlist} aria-pressed={watchlisted}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors"
              style={watchlisted
                ? { background:'rgba(var(--accent-rgb),.12)', borderColor:'rgba(var(--accent-rgb),.25)', color:'var(--text-1)' }
                : { borderColor:'var(--border-light)', color:'var(--text-2)' }
              }>
              <Star size={13} style={watchlisted ? { color:'var(--accent)', fill:'var(--accent)' } : undefined}/>
              {watchlisted ? 'Watching' : 'Watchlist'}
            </button>
            <Link to={`/compare?a=${stock.symbol}`}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors hover:text-accent"
              style={{ borderColor:'var(--border-light)', color:'var(--text-2)' }}>
              <GitCompare size={13}/> Compare
            </Link>
            <Link to="/simulator" className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5">
              <Activity size={13}/> Practise a trade
            </Link>
          </div>
        </div>
      </div>

      {/* ── Chart ───────────────────────────────────────────── */}
      <div className="card-flat">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 size={14} style={{ color:'var(--accent)' }}/>
            <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Price Chart</span>
            {chartSource && (chartLive
              ? <StatusPill tone="live" pulse>{chartSource}</StatusPill>
              : <StatusPill><Database size={9}/>{chartSource}</StatusPill>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refetchChart} className="p-1.5 rounded-md transition-colors hover:text-accent"
              style={{ color:'var(--text-3)' }} title="Refresh chart" aria-label="Refresh chart">
              <RefreshCw size={12} className={chartLoading ? 'animate-spin' : ''}/>
            </button>
            <div className="flex gap-1">
              {RANGES.map(r => (
                <button key={r} onClick={() => setRange(r)}
                  className="text-xs font-mono px-2.5 py-1.5 rounded-md font-semibold transition-colors"
                  style={range === r
                    ? { background:`rgba(var(--accent-rgb),.12)`, color:'var(--text-1)', border:`1px solid rgba(var(--accent-rgb),.25)` }
                    : { color:'var(--text-2)', background:'transparent', border:'1px solid transparent' }
                  }>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {chartLoading ? (
            <motion.div key="loading"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="space-y-2" style={{ height:352 }}>
              <Skeleton h="h-[300px]"/>
              <Skeleton h="h-[52px]"/>
            </motion.div>
          ) : chartData?.length ? (
            <motion.div key={range}
              initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.25 }}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top:5, right:5, bottom:0, left:5 }}>
                  <defs>
                    <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.22}/>
                      <stop offset="95%" stopColor={strokeColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                  <XAxis dataKey="date" tick={MONO_TICK}
                    interval={Math.floor(chartData.length / 6)} axisLine={false} tickLine={false}/>
                  <YAxis tick={MONO_TICK} domain={['auto','auto']}
                    axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} width={56}/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <Area type="monotone" dataKey="price" stroke={strokeColor}
                    strokeWidth={2} fill="url(#stockGrad)"/>
                </AreaChart>
              </ResponsiveContainer>
              {chartData.some(d => d.volume) && (
                <>
                  <ResponsiveContainer width="100%" height={52} className="mt-1">
                    <BarChart data={chartData} margin={{ top:0, right:5, bottom:0, left:5 }}>
                      <Bar dataKey="volume" fill="var(--border-light)" radius={[2,2,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-right mt-1" style={{ color:'var(--text-3)' }}>Volume</p>
                </>
              )}
            </motion.div>
          ) : (
            <div className="flex items-center justify-center text-center px-4" style={{ height:300 }}>
              <p className="text-sm" style={{ color:'var(--text-3)' }}>No chart data for this range. Try another range or refresh the chart.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Key Metrics ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }}
        viewport={{ once:true }} transition={{ duration:0.35 }}>
        <div className="card-flat">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} style={{ color:'var(--accent)' }}/>
            <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Key Metrics</span>
            {fundamentals && (
              <span className="text-xs px-2 py-0.5 rounded-md font-medium"
                style={{ background:'var(--bg-3)', color:'var(--text-3)' }}>
                {fundamentals.source ?? 'Finnhub'}
              </span>
            )}
          </div>
          {fundsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-lg p-3.5 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
                  <Skeleton h="h-3" w="w-16" className="mb-2"/>
                  <Skeleton h="h-5" w="w-24"/>
                </div>
              ))}
            </div>
          ) : metrics.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {metrics.map(([label, value]) => (
                <div key={label} className="rounded-lg p-3.5 border"
                  style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
                  <div className="text-xs mb-1 font-medium" style={{ color:'var(--text-3)' }}>{label}</div>
                  <div className="text-sm font-bold font-mono" style={{ color:'var(--text-1)' }}>{value}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color:'var(--text-3)' }}>No fundamentals returned for {symbol} yet. Check back shortly.</p>
          )}

          {/* Company description */}
          {fundamentals?.description && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor:'var(--border)' }}>
              <p className="text-xs leading-relaxed" style={{ color:'var(--text-2)' }}>
                {fundamentals.description}
              </p>
              {fundamentals.website && (
                <a href={fundamentals.website} target="_blank" rel="noopener noreferrer"
                  className="text-xs mt-2 inline-block transition-colors hover:text-accent"
                  style={{ color:'var(--accent)' }}>
                  {fundamentals.website.replace(/^https?:\/\//, '')} ↗
                </a>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── AI Analysis ─────────────────────────────────────── */}
      <AIAnalysisCard stock={stock}/>

      {/* ── Latest News ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }}
        viewport={{ once:true }} transition={{ duration:0.35 }}>
        <div className="card-flat">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper size={14} style={{ color:'var(--accent)' }}/>
            <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Latest News</span>
          </div>
          {relatedNews.length ? (
            <div className="space-y-3">
              {relatedNews.map(n => (
                <div key={n.id}
                  className="flex gap-4 p-4 rounded-lg border transition-colors"
                  style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center"
                    style={{ background:'var(--bg-3)', border:'1px solid var(--border)' }}>
                    <Newspaper size={18} style={{ color:'var(--text-3)' }}/>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-medium" style={{ color:'var(--text-3)' }}>{n.source}</span>
                      <span style={{ color:'var(--border-light)' }}>·</span>
                      <span className="text-xs" style={{ color:'var(--text-3)' }}>{n.time}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        n.sentiment === 'bullish' ? 'bg-emerald-400/10 text-emerald-400'
                        : n.sentiment === 'bearish' ? 'bg-red-400/10 text-red-400' : ''
                      }`} style={n.sentiment === 'bullish' || n.sentiment === 'bearish' ? undefined : { background:'var(--bg-3)', color:'var(--text-3)' }}>
                        {n.sentiment}
                      </span>
                    </div>
                    <p className="text-sm font-semibold leading-snug" style={{ color:'var(--text-1)' }}>
                      {n.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <Newspaper size={32} className="mx-auto mb-3 opacity-20" style={{ color:'var(--text-3)' }}/>
              <p className="text-sm" style={{ color:'var(--text-3)' }}>No recent news for {stock.symbol}. Headlines show here when they publish.</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Related Stocks ──────────────────────────────────── */}
      {related.length > 0 && (
        <motion.div
          initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true }} transition={{ duration:0.35 }}>
          <div className="card-flat">
            <div className="text-sm font-bold mb-4" style={{ color:'var(--text-1)' }}>
              Related in {stock.sector}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {related.map(s => (
                <Link key={s.symbol} to={`/stock/${s.symbol}`}
                  className="rounded-lg p-3.5 border transition-colors group"
                  style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div className="font-bold text-sm group-hover:text-accent transition-colors"
                    style={{ color:'var(--text-1)' }}>{s.symbol}</div>
                  <div className="text-xs mb-2 truncate" style={{ color:'var(--text-3)' }}>{s.name}</div>
                  <div className="font-mono font-bold text-sm" style={{ color: s.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
                    {s.price != null ? `$${s.price.toFixed(2)}` : '—'}
                  </div>
                  <div className={`text-xs font-bold font-mono ${s.changePct == null ? '' : s.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                    style={s.changePct == null ? { color:'var(--text-3)' } : undefined}>
                    {s.changePct != null ? `${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(2)}%` : '—'}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      )}

    </div>
  )
}
