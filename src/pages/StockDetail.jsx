import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, TrendingUp, TrendingDown, Star, GitCompare,
  Activity, BarChart2, Newspaper, Brain, AlertTriangle, CheckCircle, Minus,
  RefreshCw, WifiOff, Clock, Database,
} from 'lucide-react'
import { stocks, newsArticles } from '../data/mockData'
import { generateAIAnalysis } from '../utils/aiAnalysis'
import { useQuote } from '../hooks/useQuote'
import { useCompanyNews } from '../hooks/useMarketNews'
import { useChart } from '../hooks/useChart'
import { useFundamentals } from '../hooks/useFundamentals'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar,
} from 'recharts'

const RANGES = ['1D','5D','1M','6M','1Y','5Y','All']

/* ── Chart tooltip ─────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 text-xs border shadow-lg"
      style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
      <p style={{ color:'var(--text-3)' }}>{label}</p>
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
const VerdictBadge = ({ verdict }) => {
  const cfg = {
    Bullish: { icon: CheckCircle,    color:'#10b981', bg:'rgba(16,185,129,.1)',  border:'rgba(16,185,129,.2)'  },
    Bearish: { icon: AlertTriangle,  color:'#ef4444', bg:'rgba(239,68,68,.1)',   border:'rgba(239,68,68,.2)'   },
    Neutral: { icon: Minus,          color:'#f59e0b', bg:'rgba(245,158,11,.1)',  border:'rgba(245,158,11,.2)'  },
  }[verdict] || {}
  const Icon = cfg.icon
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.border}` }}>
      <Icon size={11}/> {verdict}
    </span>
  )
}

/* ── AI Analysis Card ──────────────────────────────────────── */
function AIAnalysisCard({ stock }) {
  const ai = generateAIAnalysis(stock)
  if (!ai) return null
  const { verdict, summary, reasons, risks, techSummary, fundSummary, newsImpact } = ai
  const accentColor = verdict === 'Bullish' ? '#10b981' : verdict === 'Bearish' ? '#ef4444' : '#f59e0b'

  return (
    <motion.div
      initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }}
      viewport={{ once:true }} transition={{ duration:0.4 }}
      className="card border space-y-5" style={{ borderColor:'var(--border)' }}>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Brain size={16} style={{ color:'var(--accent)' }}/>
          <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>AI Analysis</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background:`rgba(var(--accent-rgb),.08)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.15)` }}>
            Powered by Foliyo AI
          </span>
        </div>
        <VerdictBadge verdict={verdict}/>
      </div>

      {/* Verdict bar */}
      <div className="rounded-xl p-4 border" style={{ background:'var(--bg-1)', borderColor:`${accentColor}22` }}>
        <p className="text-sm leading-relaxed" style={{ color:'var(--text-2)' }}>{summary}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Reasons */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color:'#10b981' }}>
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
          <div className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color:'#ef4444' }}>
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
          <div key={label} className="rounded-xl p-3.5 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
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
  const strokeColor = isUp ? '#10b981' : '#ef4444'

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

  /* ── Smart signal badges (Quantix-style) ── */
  const signals = []
  if (quote?.price && quote?.high && quote.price >= quote.high * 0.98)
    signals.push({ label:'Trading near today\'s high', color:'#10b981', bg:'rgba(16,185,129,.08)', border:'rgba(16,185,129,.18)', icon:'📈' })
  if (quote?.price && fundamentals?.week52High && quote.price >= fundamentals.week52High * 0.97)
    signals.push({ label:'Near 52-week high', color:'#f59e0b', bg:'rgba(245,158,11,.08)', border:'rgba(245,158,11,.2)', icon:'🏆' })
  if (quote?.price && fundamentals?.week52Low && quote.price <= fundamentals.week52Low * 1.05)
    signals.push({ label:'Near 52-week low', color:'#ef4444', bg:'rgba(239,68,68,.08)', border:'rgba(239,68,68,.18)', icon:'⚠️' })
  if (liveChangePct != null && liveChangePct >= 4)
    signals.push({ label:`Strong day +${liveChangePct.toFixed(1)}%`, color:'#10b981', bg:'rgba(16,185,129,.08)', border:'rgba(16,185,129,.18)', icon:'🚀' })
  if (liveChangePct != null && liveChangePct <= -4)
    signals.push({ label:`Sharp decline ${liveChangePct.toFixed(1)}%`, color:'#ef4444', bg:'rgba(239,68,68,.08)', border:'rgba(239,68,68,.18)', icon:'📉' })

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
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.div initial={{ scale:0.8, opacity:0 }} animate={{ scale:1, opacity:1 }}>
            {!logoError ? (
              <img
                src={`https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${symbol}.png`}
                alt={symbol}
                className="w-14 h-14 rounded-2xl object-contain p-1.5"
                style={{ background:'var(--bg-3)', border:'1px solid var(--border)' }}
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black"
                style={{ background:`rgba(var(--accent-rgb),.15)`, color:'var(--accent)', border:`2px solid rgba(var(--accent-rgb),.25)` }}>
                {symbol.charAt(0)}
              </div>
            )}
          </motion.div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black" style={{ color:'var(--text-1)' }}>{stock.symbol}</h1>
              <span className="text-xs px-2.5 py-1 rounded-lg font-medium"
                style={{ background:'var(--bg-3)', color:'var(--text-3)' }}>
                {stock.sector}
              </span>
              {stock.exchange && (
                <span className="text-xs px-2.5 py-1 rounded-lg font-medium"
                  style={{ background:'var(--bg-3)', color:'var(--text-3)' }}>
                  {stock.exchange}
                </span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color:'var(--text-2)' }}>{stock.name}</p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="text-3xl font-black font-mono" style={{ color: hasPrice ? 'var(--text-1)' : 'var(--text-3)' }}>
                {hasPrice ? `$${livePrice.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}` : '—'}
              </div>
              {/* Data status badge */}
              {status === 'loading' && (
                <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background:'rgba(148,163,184,.08)', color:'#94a3b8', border:'1px solid rgba(148,163,184,.15)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"/>Loading
                </span>
              )}
              {status === 'live' && (
                <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background:'rgba(16,185,129,.1)', color:'#10b981', border:'1px solid rgba(16,185,129,.2)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>Live
                </span>
              )}
              {status === 'closed' && (
                <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background:'rgba(245,158,11,.08)', color:'#f59e0b', border:'1px solid rgba(245,158,11,.2)' }}>
                  <Clock size={10}/>Closed
                </span>
              )}
              {(status === 'unavailable' || status === 'error') && (
                <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background:'rgba(239,68,68,.08)', color:'#ef4444', border:'1px solid rgba(239,68,68,.2)' }}>
                  <WifiOff size={10}/>Unavailable
                </span>
              )}
            </div>
            {hasPrice && (
              <div className={`flex items-center gap-1.5 text-sm font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {isUp ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                {isUp ? '+' : ''}{liveChange.toFixed(2)} ({isUp ? '+' : ''}{liveChangePct.toFixed(2)}%)
                <span className="text-xs font-normal" style={{ color:'var(--text-3)' }}>Today</span>
              </div>
            )}
            {lastUpdated && (
              <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color:'var(--text-3)' }}>
                <Clock size={10}/>
                Updated {new Date(lastUpdated).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                <button onClick={refetch} className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
                  <RefreshCw size={10}/>
                </button>
              </div>
            )}
          </div>
          {/* Signal badges */}
          {signals.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1">
              {signals.map(s => (
                <span key={s.label} className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                  style={{ color:s.color, background:s.bg, borderColor:s.border }}>
                  {s.icon} {s.label}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button onClick={toggleWatchlist}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all"
              style={watchlisted
                ? { background:'rgba(234,179,8,.1)', borderColor:'rgba(234,179,8,.3)', color:'#eab308' }
                : { borderColor:'var(--border)', color:'var(--text-3)' }
              }>
              <Star size={13} className={watchlisted ? 'fill-yellow-400 text-yellow-400' : ''}/>
              {watchlisted ? 'Watching' : 'Watchlist'}
            </button>
            <Link to={`/compare?a=${stock.symbol}`}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all"
              style={{ borderColor:'var(--border)', color:'var(--text-3)' }}>
              <GitCompare size={13}/> Compare
            </Link>
            <button className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5">
              <Activity size={13}/> Trade
            </button>
          </div>
        </div>
      </div>

      {/* ── Chart ───────────────────────────────────────────── */}
      <div className="card border" style={{ borderColor:'var(--border)' }}>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 size={14} style={{ color:'var(--accent)' }}/>
            <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Price Chart</span>
            {chartSource && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={chartLive
                  ? { background:'rgba(16,185,129,.1)', color:'#10b981', border:'1px solid rgba(16,185,129,.2)' }
                  : { background:'rgba(148,163,184,.08)', color:'#94a3b8', border:'1px solid rgba(148,163,184,.15)' }
                }>
                {chartLive ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/></> : <Database size={9}/>}
                {chartSource}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refetchChart} className="p-1.5 rounded-lg transition-colors"
              style={{ color:'var(--text-3)' }} title="Refresh chart">
              <RefreshCw size={12} className={chartLoading ? 'animate-spin' : ''}/>
            </button>
            <div className="flex gap-1">
              {RANGES.map(r => (
                <button key={r} onClick={() => setRange(r)}
                  className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all"
                  style={range === r
                    ? { background:`rgba(var(--accent-rgb),.12)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.2)` }
                    : { color:'var(--text-3)', border:'1px solid transparent' }
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
                      <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={strokeColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:'var(--text-3)' }}
                    interval={Math.floor(chartData.length / 6)} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:10, fill:'var(--text-3)' }} domain={['auto','auto']}
                    axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} width={56}/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <Area type="monotone" dataKey="price" stroke={strokeColor}
                    strokeWidth={2.5} fill="url(#stockGrad)"/>
                </AreaChart>
              </ResponsiveContainer>
              {chartData.some(d => d.volume) && (
                <>
                  <ResponsiveContainer width="100%" height={52} className="mt-1">
                    <BarChart data={chartData} margin={{ top:0, right:5, bottom:0, left:5 }}>
                      <Bar dataKey="volume" fill="var(--border)" radius={[2,2,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-right mt-1" style={{ color:'var(--text-3)' }}>Volume</p>
                </>
              )}
            </motion.div>
          ) : (
            <div className="flex items-center justify-center" style={{ height:300 }}>
              <p className="text-sm" style={{ color:'var(--text-3)' }}>No chart data available</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Key Metrics ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }}
        viewport={{ once:true }} transition={{ duration:0.35 }}>
        <div className="card border" style={{ borderColor:'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} style={{ color:'var(--accent)' }}/>
            <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Key Metrics</span>
            {fundamentals && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background:'rgba(16,185,129,.1)', color:'#10b981', border:'1px solid rgba(16,185,129,.2)' }}>
                {fundamentals.source ?? 'Finnhub'}
              </span>
            )}
          </div>
          {fundsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl p-3.5 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
                  <Skeleton h="h-3" w="w-16" className="mb-2"/>
                  <Skeleton h="h-5" w="w-24"/>
                </div>
              ))}
            </div>
          ) : metrics.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {metrics.map(([label, value]) => (
                <div key={label} className="rounded-xl p-3.5 border"
                  style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
                  <div className="text-xs mb-1 font-medium" style={{ color:'var(--text-3)' }}>{label}</div>
                  <div className="text-sm font-bold font-mono" style={{ color:'var(--text-1)' }}>{value}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color:'var(--text-3)' }}>Metrics unavailable for {symbol}</p>
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
        <div className="card border" style={{ borderColor:'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Newspaper size={14} style={{ color:'var(--accent)' }}/>
            <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Latest News</span>
          </div>
          {relatedNews.length ? (
            <div className="space-y-3">
              {relatedNews.map(n => (
                <div key={n.id}
                  className="flex gap-4 p-4 rounded-xl border transition-all cursor-pointer"
                  style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${n.imageColor} shrink-0`}/>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-medium" style={{ color:'var(--text-3)' }}>{n.source}</span>
                      <span style={{ color:'var(--border)' }}>·</span>
                      <span className="text-xs" style={{ color:'var(--text-3)' }}>{n.time}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        n.sentiment === 'bullish'
                          ? 'bg-emerald-400/10 text-emerald-400'
                          : 'bg-red-400/10 text-red-400'
                      }`}>{n.sentiment}</span>
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
              <p className="text-sm" style={{ color:'var(--text-3)' }}>No recent news for {stock.symbol}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Related Stocks ──────────────────────────────────── */}
      {related.length > 0 && (
        <motion.div
          initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true }} transition={{ duration:0.35 }}>
          <div className="card border" style={{ borderColor:'var(--border)' }}>
            <div className="text-sm font-bold mb-4" style={{ color:'var(--text-1)' }}>
              Related in {stock.sector}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {related.map(s => (
                <Link key={s.symbol} to={`/stock/${s.symbol}`}
                  className="rounded-xl p-3.5 border transition-all group"
                  style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div className="font-bold text-sm group-hover:text-accent transition-colors"
                    style={{ color:'var(--text-1)' }}>{s.symbol}</div>
                  <div className="text-xs mb-2 truncate" style={{ color:'var(--text-3)' }}>{s.name}</div>
                  <div className="font-mono font-bold text-sm" style={{ color: s.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
                    {s.price != null ? `$${s.price.toFixed(2)}` : '—'}
                  </div>
                  <div className={`text-xs font-bold ${s.changePct == null ? 'text-slate-500' : s.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
