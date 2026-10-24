import { useState, useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Star, GitCompare, Activity, RefreshCw, WifiOff, Clock, ExternalLink,
} from 'lucide-react'
import { stocks, newsArticles } from '../data/mockData'
import { generateAIAnalysis } from '../utils/aiAnalysis'
import { useQuote } from '../hooks/useQuote'
import { useCompanyNews } from '../hooks/useMarketNews'
import { useChart } from '../hooks/useChart'
import { useFundamentals } from '../hooks/useFundamentals'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import { StatusPill } from '../components/PageHeader'
import { api } from '../services/api'
import { ysxStocks } from '../data/myanmarStocks'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, ReferenceLine,
} from 'recharts'
import { persist } from '../utils/userStore'

const RANGES = ['1D','5D','1M','6M','1Y','5Y','All']
const TICK = { fontSize:11, fill:'var(--text-3)', fontFamily:"'Archivo', system-ui, sans-serif" }

/* ── Small helpers ─────────────────────────────────────────── */
const hasUrl = u => !!u && u !== '#'
const extLink = u => hasUrl(u) ? { href:u, target:'_blank', rel:'noopener noreferrer' } : {}
const tone = v => v == null ? 'var(--text-3)' : v >= 0 ? 'rgb(var(--up))' : 'rgb(var(--down))'

/* ── Chart tooltip ─────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs border"
      style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
      <p className="num" style={{ color:'var(--text-3)' }}>{label}</p>
      <p className="font-bold num" style={{ color:'var(--text-1)' }}>
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

/* ── Section title (anchor target) ─────────────────────────── */
const Section = ({ id, title, aside, children }) => (
  <section id={id} aria-label={title} className="scroll-mt-24 pt-6 mt-6 border-t" style={{ borderColor:'var(--border)' }}>
    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
      <h2 className="section-title">{title}</h2>
      {aside}
    </div>
    {children}
  </section>
)

/* ── Label / value row used by statistics and profile ──────── */
const StatRow = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-4 py-2.5 border-b" style={{ borderColor:'var(--border)' }}>
    <span className="text-[13px]" style={{ color:'var(--text-3)' }}>{label}</span>
    <span className="text-[13px] font-semibold num text-right" style={{ color:'var(--text-1)' }}>{value}</span>
  </div>
)

/* ── AI verdict label ──────────────────────────────────────── */
const VERDICT = {
  Bullish: { rgb:'var(--up)'      },
  Bearish: { rgb:'var(--down)'    },
  Neutral: { rgb:'var(--caution)' },
}

const VerdictBadge = ({ verdict }) => {
  const cfg = VERDICT[verdict] || VERDICT.Neutral
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded"
      style={{ color:`rgb(${cfg.rgb})`, background:`rgb(${cfg.rgb} / .1)` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background:`rgb(${cfg.rgb})` }}/> {verdict}
    </span>
  )
}

/* ── AI Analysis Card ──────────────────────────────────────── */
function AIAnalysisCard({ stock }) {
  const ai = generateAIAnalysis(stock)
  if (!ai) return null
  const { verdict, summary, reasons, risks, techSummary, fundSummary, newsImpact } = ai

  return (
    <Section id="stock-analysis" title="Analysis"
      aside={
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background:'var(--bg-3)', color:'var(--text-2)' }}>
            Rule-based
          </span>
          <VerdictBadge verdict={verdict}/>
        </div>
      }>
      <div className="card-flat" style={{ padding:'18px 20px' }}>
        <p className="text-sm leading-relaxed" style={{ color:'var(--text-2)' }}>{summary}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-5">
          <div>
            <div className="text-xs font-bold mb-2" style={{ color:'rgb(var(--up))' }}>Key reasons</div>
            <ul className="space-y-1.5 list-disc pl-4 marker:text-[var(--text-3)]">
              {reasons.map((r, i) => (
                <li key={i} className="text-[13px] leading-snug" style={{ color:'var(--text-2)' }}>{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-bold mb-2" style={{ color:'rgb(var(--down))' }}>Risk factors</div>
            <ul className="space-y-1.5 list-disc pl-4 marker:text-[var(--text-3)]">
              {risks.map((r, i) => (
                <li key={i} className="text-[13px] leading-snug" style={{ color:'var(--text-2)' }}>{r}</li>
              ))}
            </ul>
          </div>
        </div>

        <dl className="mt-5 border-t" style={{ borderColor:'var(--border)' }}>
          {[
            { label:'Technical', text: techSummary },
            { label:'Fundamental', text: fundSummary },
            { label:'News impact', text: newsImpact },
          ].map(({ label, text }) => (
            <div key={label} className="grid sm:grid-cols-[110px_minmax(0,1fr)] gap-x-4 gap-y-0.5 py-3 border-b" style={{ borderColor:'var(--border)' }}>
              <dt className="text-xs font-semibold" style={{ color:'var(--text-3)' }}>{label}</dt>
              <dd className="text-[13px] leading-relaxed" style={{ color:'var(--text-2)' }}>{text}</dd>
            </div>
          ))}
        </dl>

        <p className="text-xs mt-4" style={{ color:'var(--text-3)' }}>
          For informational purposes only. Not financial advice. Always do your own research.
        </p>
      </div>
    </Section>
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
    persist(WL_META, meta)
  } catch {}
}

/* ── Symbols we don't carry: ask the search API what they are ── */
function useSymbolLookup(symbol) {
  const [state, setState] = useState({ status: symbol ? 'loading' : 'idle', results: [] })
  useEffect(() => {
    if (!symbol) { setState({ status: 'idle', results: [] }); return }
    let cancelled = false
    setState({ status: 'loading', results: [] })
    api.search(symbol)
      .then(r => { if (!cancelled) setState({ status: 'done', results: r.results || [] }) })
      .catch(() => { if (!cancelled) setState({ status: 'error', results: [] }) })
    return () => { cancelled = true }
  }, [symbol])
  const exact = state.results.find(r => r.symbol?.toUpperCase() === symbol)
  return { ...state, exact }
}

const YSX_CODES = new Set(ysxStocks.map(s => s.code))

export default function StockDetail() {
  const { symbol: rawSymbol } = useParams()
  const symbol = (rawSymbol || '').toUpperCase()
  const [range, setRange]           = useState('1M')
  const [logoError, setLogoError]   = useState(false)
  const [watchlisted, setWatchlist] = useState(() => wlLoad().has(symbol))

  // Our own list first; anything else is described from live company data, never borrowed from another stock
  const known = stocks.find(s => s.symbol === symbol)

  const { quote, status, lastUpdated, refetch } = useQuote(symbol)
  const { articles: liveNews } = useCompanyNews(symbol)
  const { data: fundamentals, loading: fundsLoading } = useFundamentals(symbol)
  const lookup = useSymbolLookup(known ? null : symbol)
  const stock = known || {
    symbol,
    name: fundamentals?.name || lookup.exact?.name || symbol,
    sector: fundamentals?.industry || '',
    exchange: fundamentals?.exchange || lookup.exact?.exchange || null,
    pe: fundamentals?.pe ?? null,
    mktCap: fundamentals?.mktCap ?? null,
    price: null,
  }
  const { data: chartData, loading: chartLoading, isLive: chartLive, source: chartSource, refetch: refetchChart } = useChart(symbol, range, null)   // no stand-in history: an unavailable chart says so

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
  const strokeColor = liveChangePct == null ? 'var(--text-3)' : isUp ? 'rgb(var(--up))' : 'rgb(var(--down))'

  /* ── Watchlist toggle ── */
  const toggleWatchlist = () => {
    const wl = wlLoad()
    if (watchlisted) { wl.delete(symbol) } else {
      wl.add(symbol)
      wlSaveMeta(symbol, stock.name)
    }
    persist(WL_KEY, [...wl])
    setWatchlist(!watchlisted)
  }

  /* ── Smart signal badges ── */
  const signals = []
  if (quote?.price && quote?.high && quote.price >= quote.high * 0.98)
    signals.push({ label:'Trading near today\'s high', rgb:'var(--up)' })
  if (quote?.price && fundamentals?.week52High && quote.price >= fundamentals.week52High * 0.97)
    signals.push({ label:'Near 52-week high', rgb:'var(--caution)' })
  if (quote?.price && fundamentals?.week52Low && quote.price <= fundamentals.week52Low * 1.05)
    signals.push({ label:'Near 52-week low', rgb:'var(--down)' })
  if (liveChangePct != null && liveChangePct >= 4)
    signals.push({ label:`Strong day +${liveChangePct.toFixed(1)}%`, rgb:'var(--up)' })
  if (liveChangePct != null && liveChangePct <= -4)
    signals.push({ label:`Sharp decline ${liveChangePct.toFixed(1)}%`, rgb:'var(--down)' })

  /* Build metrics list — only include rows where we have a real value */
  const fmt$ = v => v != null ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}` : null
  const fmtX = v => v != null ? `${Number(v).toFixed(2)}x` : null
  const fmtPct = v => v != null ? `${Number(v).toFixed(2)}%` : null
  const fmtN = v => v != null ? Number(v).toFixed(2) : null
  const range2 = (lo, hi) => lo != null && hi != null ? `${lo} – ${hi}` : null

  const dayLow = fmt$(quote?.low), dayHigh = fmt$(quote?.high)
  const wkLow = fmt$(fundamentals?.week52Low), wkHigh = fmt$(fundamentals?.week52High)
  const allMetrics = [
    ['Previous close', fmt$(quote?.prevClose)],
    ["Day's range",    range2(dayLow, dayHigh) ?? (dayHigh != null ? `High ${dayHigh}` : dayLow != null ? `Low ${dayLow}` : null)],
    ['52-week range',  range2(wkLow, wkHigh) ?? (wkHigh != null ? `High ${wkHigh}` : wkLow != null ? `Low ${wkLow}` : null)],
    ['Market cap',     fundamentals?.mktCap ?? stock.mktCap ?? null],
    ['P/E ratio',      fmtX(fundamentals?.pe ?? stock.pe)],
    ['EPS (TTM)',      fmt$(fundamentals?.eps)],
    ['Dividend yield', fmtPct(fundamentals?.dividendYield)],
    ['Beta',           fmtN(fundamentals?.beta)],
    ['P/B ratio',      fmtX(fundamentals?.pb)],
    ['ROE',            fmtPct(fundamentals?.roe)],
  ]
  const metrics = allMetrics.filter(([, v]) => v != null && v !== '—')

  /* Profile rows — only what fundamentals actually returned */
  const profileRows = [
    ['Industry', fundamentals?.industry || stock.sector || null],
    ['Country',  fundamentals?.country || null],
    ['Exchange', stock.exchange || null],
  ].filter(([, v]) => v)
  const hasProfile = profileRows.length > 0 || !!fundamentals?.description || !!fundamentals?.website

  /* YSX codes have their own page */
  if (YSX_CODES.has(symbol)) return <Navigate to={`/myanmar-stocks/${symbol}`} replace />

  /* Nothing prices it, nothing describes it, and search has no exact match → it isn't a ticker we can show */
  const stillChecking = status === 'loading' || fundsLoading || lookup.status === 'loading'
  const unknown = !known && !hasPrice && !fundamentals?.name && !lookup.exact && !stillChecking
  if (unknown) {
    const suggestions = lookup.results.filter(r => r.symbol).slice(0, 5)
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 page-enter">
        <Link to="/markets" className="inline-flex items-center gap-1.5 text-sm mb-8 hover:text-accent transition-colors" style={{ color:'var(--text-3)' }}>
          <ArrowLeft size={14}/> Markets
        </Link>
        <h1 className="text-3xl font-black mb-3" style={{ color:'var(--text-1)' }}>We can’t find “{symbol}”</h1>
        <p className="text-sm leading-relaxed" style={{ color:'var(--text-2)' }}>
          No exchange we cover lists this ticker, and there’s no live price for it. It may be misspelled, delisted, or traded somewhere Foliyo doesn’t reach.
        </p>
        {suggestions.length > 0 && (
          <div className="mt-8">
            <div className="section-label mb-3">Did you mean</div>
            <div className="rounded-xl border divide-y" style={{ borderColor:'var(--border)' }}>
              {suggestions.map(r => (
                <Link key={r.symbol} to={r.type === 'YSX' ? `/myanmar-stocks/${r.symbol}` : `/stock/${encodeURIComponent(r.symbol)}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-[var(--bg-2)] transition-colors"
                  style={{ borderColor:'var(--border)' }}>
                  <span className="font-bold text-sm" style={{ color:'var(--text-1)' }}>{r.symbol}</span>
                  <span className="text-sm truncate" style={{ color:'var(--text-3)' }}>{r.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
        <Link to="/markets" className="btn-primary mt-8">Browse markets</Link>
      </div>
    )
  }

  /* ── Header strings ── */
  const priceStr = hasPrice ? `$${livePrice.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}` : '—'
  const sign = isUp ? '+' : ''
  const timeStr = lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : null
  const statusLine = status === 'closed'
    ? `At close${timeStr ? ` · ${timeStr}` : ''}`
    : timeStr ? `As of ${timeStr}` : null
  const exchangeLine = [stock.exchange || fundamentals?.exchange, quote?.source && `${quote.source} price`, 'USD'].filter(Boolean).join(' · ')

  const navLinks = [
    ['Summary', 'stock-summary'],
    ['Chart', 'stock-chart'],
    ['Statistics', 'stock-stats'],
    ['News', 'stock-news'],
    ...(hasPrice ? [['Analysis', 'stock-analysis']] : []),
    ...(hasProfile ? [['Profile', 'stock-profile']] : []),
  ]

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 page-enter">

      {/* Back */}
      <Link to="/markets"
        className="inline-flex items-center gap-1.5 text-[13px] mb-4 transition-colors hover:text-accent"
        style={{ color:'var(--text-3)' }}>
        <ArrowLeft size={13}/> Markets
      </Link>

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-[140px_minmax(0,1fr)_280px] xl:grid-cols-[150px_minmax(0,1fr)_300px]">

        {/* ── Sub-nav (desktop) ───────────────────────────────── */}
        <nav aria-label="On this page" className="hidden lg:block">
          <ul className="sticky top-24 space-y-0.5">
            {navLinks.map(([label, id]) => (
              <li key={id}>
                <a href={`#${id}`}
                  onClick={e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior:'smooth', block:'start' }) }}
                  className="block text-[13px] font-semibold px-3 py-1.5 rounded-md transition-colors hover:bg-[var(--bg-1)]"
                  style={{ color:'var(--text-2)' }}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Main column ─────────────────────────────────────── */}
        <main className="min-w-0">

          {/* Header */}
          <header id="stock-summary" className="scroll-mt-24">
            {exchangeLine && (
              <p className="text-xs mb-1.5" style={{ color:'var(--text-3)' }}>{exchangeLine}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              {!logoError && (
                <img
                  src={`https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${symbol}.png`}
                  alt=""
                  className="w-9 h-9 rounded-lg object-contain p-1 shrink-0"
                  style={{ background:'var(--bg-3)', border:'1px solid var(--border)' }}
                  onError={() => setLogoError(true)}
                />
              )}
              <h1 className="text-[1.7rem] sm:text-[2.1rem] font-bold leading-[1.1] min-w-0" style={{ color:'var(--text-1)' }}>
                {stock.name} ({stock.symbol})
              </h1>
              <button onClick={toggleWatchlist} aria-pressed={watchlisted}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-full border transition-colors"
                style={watchlisted
                  ? { background:'var(--bg-3)', borderColor:'var(--border-light)', color:'var(--text-1)' }
                  : { borderColor:'var(--border-light)', color:'var(--text-2)' }
                }>
                <Star size={14} style={watchlisted ? { color:'var(--brand)', fill:'var(--brand)' } : undefined}/>
                {watchlisted ? 'Watching' : 'Watchlist'}
              </button>
            </div>

            <div className="flex items-end gap-x-4 gap-y-1 flex-wrap mt-3">
              <div className="text-[2.25rem] sm:text-[2.5rem] font-bold num leading-none" style={{ color: hasPrice ? 'var(--text-1)' : 'var(--text-3)' }}>
                {priceStr}
              </div>
              {hasPrice && (
                <div className="text-lg sm:text-xl font-semibold num leading-none pb-0.5" style={{ color: tone(liveChangePct) }}>
                  {sign}{liveChange.toFixed(2)} ({sign}{liveChangePct.toFixed(2)}%)
                </div>
              )}
              <div className="pb-0.5">
                {status === 'loading' && <StatusPill pulse>Loading</StatusPill>}
                {status === 'live' && <StatusPill tone="live" pulse>Live</StatusPill>}
                {status === 'closed' && <StatusPill><Clock size={10}/>Closed</StatusPill>}
                {(status === 'unavailable' || status === 'error') && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap"
                    style={{ color:'rgb(var(--down))', background:'rgb(var(--down) / .08)', borderColor:'rgb(var(--down) / .2)' }}>
                    <WifiOff size={10}/>Unavailable
                  </span>
                )}
              </div>
            </div>
            {statusLine && (
              <div className="flex items-center gap-1.5 text-xs mt-2" style={{ color:'var(--text-3)' }}>
                {statusLine}
                <button onClick={refetch} aria-label="Refresh quote" className="opacity-60 hover:opacity-100 transition-opacity">
                  <RefreshCw size={11}/>
                </button>
              </div>
            )}

            {/* Signals + actions */}
            {signals.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {signals.map(({ label, rgb }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded"
                    style={{ color:`rgb(${rgb})`, background:`rgb(${rgb} / .09)` }}>
                    {label}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 flex-wrap items-center mt-4">
              <Link to={`/compare?a=${stock.symbol}`} className="btn-ghost text-[13px]" style={{ padding:'6px 14px' }}>
                <GitCompare size={13}/> Compare
              </Link>
              <Link to="/simulator" className="btn-primary text-[13px]" style={{ padding:'6px 14px' }}>
                <Activity size={13}/> Practise a trade
              </Link>
            </div>
          </header>

          {/* ── Chart ───────────────────────────────────────────── */}
          <section id="stock-chart" aria-label="Price chart" className="scroll-mt-24 mt-6">
            <div className="card-flat" style={{ padding:'14px 16px 12px' }}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex gap-1 flex-wrap" role="group" aria-label="Chart range">
                  {RANGES.map(r => (
                    <button key={r} onClick={() => setRange(r)} aria-pressed={range === r}
                      className="text-xs num px-3 py-1 rounded-full font-semibold transition-colors"
                      style={range === r
                        ? { background:'var(--btn-bg)', color:'var(--btn-fg)' }
                        : { color:'var(--text-2)', background:'var(--bg-1)' }
                      }>
                      {r}
                    </button>
                  ))}
                </div>
                <button onClick={refetchChart} className="p-1.5 rounded-md transition-colors hover:text-accent"
                  style={{ color:'var(--text-3)' }} title="Refresh chart" aria-label="Refresh chart">
                  <RefreshCw size={12} className={chartLoading ? 'animate-spin' : ''}/>
                </button>
              </div>

              <AnimatePresence mode="wait">
                {chartLoading ? (
                  <motion.div key="loading"
                    initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                    className="space-y-2" style={{ height:340 }}>
                    <Skeleton h="h-[290px]"/>
                    <Skeleton h="h-[44px]"/>
                  </motion.div>
                ) : chartData?.length ? (
                  <motion.div key={range}
                    initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.25 }}>
                    <ResponsiveContainer width="100%" height={290}>
                      <AreaChart data={chartData} margin={{ top:5, right:5, bottom:0, left:5 }}>
                        <defs>
                          <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.14}/>
                            <stop offset="95%" stopColor={strokeColor} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--border)" strokeOpacity={0.7} vertical={false}/>
                        <XAxis dataKey="date" tick={TICK}
                          interval={Math.floor(chartData.length / 6)} axisLine={false} tickLine={false}/>
                        <YAxis tick={TICK} domain={['auto','auto']} orientation="right"
                          axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} width={52}/>
                        <Tooltip content={<ChartTooltip/>}/>
                        {quote?.prevClose != null && (
                          <ReferenceLine y={quote.prevClose} stroke="var(--text-3)" strokeDasharray="2 3" strokeWidth={1}/>
                        )}
                        <Area type="monotone" dataKey="price" stroke={strokeColor}
                          strokeWidth={1.75} fill="url(#stockGrad)" dot={false}/>
                      </AreaChart>
                    </ResponsiveContainer>
                    {chartData.some(d => d.volume) && (
                      <ResponsiveContainer width="100%" height={44} className="mt-1">
                        <BarChart data={chartData} margin={{ top:0, right:5, bottom:0, left:5 }}>
                          <Bar dataKey="volume" fill="var(--border-light)" radius={[2,2,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </motion.div>
                ) : (
                  <div className="flex items-center justify-center text-center px-4" style={{ height:290 }}>
                    <p className="text-sm" style={{ color:'var(--text-3)' }}>No chart data for this range. Try another range or refresh the chart.</p>
                  </div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between gap-3 mt-2 text-[11px]" style={{ color:'var(--text-3)' }}>
                <span>{chartData?.some(d => d.volume) ? 'Volume shown below the price' : ''}</span>
                {chartSource && (
                  <span className="inline-flex items-center gap-1.5">
                    {chartLive && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:'rgb(var(--up))' }}/>}
                    Source: {chartSource}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* ── Key statistics ──────────────────────────────────── */}
          <Section id="stock-stats" title="Key statistics"
            aside={fundamentals && (
              <span className="text-[11px]" style={{ color:'var(--text-3)' }}>Source: {fundamentals.source ?? 'Finnhub'}</span>
            )}>
            {fundsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex justify-between py-3 border-b" style={{ borderColor:'var(--border)' }}>
                    <Skeleton h="h-3" w="w-24"/>
                    <Skeleton h="h-3" w="w-16"/>
                  </div>
                ))}
              </div>
            ) : metrics.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 border-t" style={{ borderColor:'var(--border)' }}>
                {metrics.map(([label, value]) => <StatRow key={label} label={label} value={value}/>)}
              </div>
            ) : (
              <p className="text-sm" style={{ color:'var(--text-3)' }}>No fundamentals returned for {symbol} yet. Check back shortly.</p>
            )}
          </Section>

          {/* ── Company profile ─────────────────────────────────── */}
          {hasProfile && (
            <Section id="stock-profile" title={`About ${stock.name}`}>
              {profileRows.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 border-t mb-4" style={{ borderColor:'var(--border)' }}>
                  {profileRows.map(([label, value]) => <StatRow key={label} label={label} value={value}/>)}
                </div>
              )}
              {fundamentals?.description && (
                <p className="text-sm leading-relaxed" style={{ color:'var(--text-2)' }}>{fundamentals.description}</p>
              )}
              {fundamentals?.website && (
                <a href={fundamentals.website} target="_blank" rel="noopener noreferrer"
                  className="link inline-flex items-center gap-1 text-[13px] mt-3">
                  {fundamentals.website.replace(/^https?:\/\//, '')} <ExternalLink size={11}/>
                </a>
              )}
            </Section>
          )}

          {/* ── News ────────────────────────────────────────────── */}
          <Section id="stock-news" title={`${stock.symbol} news`}>
            {relatedNews.length ? (
              <ul className="border-t" style={{ borderColor:'var(--border)' }}>
                {relatedNews.map((n, i) => {
                  const Wrap = hasUrl(n.url) ? 'a' : 'div'
                  return (
                    <li key={n.id ?? i} className="border-b" style={{ borderColor:'var(--border)' }}>
                      <Wrap {...extLink(n.url)} className="flex gap-4 py-4 group">
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold leading-snug group-hover:underline" style={{ color:'var(--text-1)' }}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-xs" style={{ color:'var(--text-3)' }}>
                            {n.source && <span>{n.source}</span>}
                            {n.source && n.time && <span>·</span>}
                            {n.time && <span>{n.time}</span>}
                            {(n.sentiment === 'bullish' || n.sentiment === 'bearish') && (
                              <>
                                <span>·</span>
                                <span className="font-semibold capitalize"
                                  style={{ color: n.sentiment === 'bullish' ? 'rgb(var(--up))' : 'rgb(var(--down))' }}>
                                  {n.sentiment}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {n.image && (
                          <img src={n.image} alt="" loading="lazy"
                            className="w-24 h-16 sm:w-28 sm:h-[72px] rounded-lg object-cover shrink-0"
                            style={{ background:'var(--bg-3)' }}
                            onError={e => { e.currentTarget.style.display = 'none' }}/>
                        )}
                      </Wrap>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm py-4" style={{ color:'var(--text-3)' }}>No recent news for {stock.symbol}. Headlines show here when they publish.</p>
            )}
          </Section>

          {/* ── AI Analysis ─────────────────────────────────────── */}
          {hasPrice && <AIAnalysisCard stock={{ ...stock, price: livePrice, changePct: liveChangePct }}/>}
        </main>

        {/* ── Right rail ──────────────────────────────────────── */}
        <aside aria-label="Related stocks" className="min-w-0">
          {related.length > 0 && (
            <div className="lg:sticky lg:top-24">
              <h2 className="section-title mb-2">Related in {stock.sector}</h2>
              <ul className="border-t" style={{ borderColor:'var(--border)' }}>
                {related.map(s => (
                  <li key={s.symbol} className="border-b" style={{ borderColor:'var(--border)' }}>
                    <Link to={`/stock/${s.symbol}`} className="asset-row flex items-center justify-between gap-3 py-2.5 px-1 -mx-1 rounded">
                      <div className="min-w-0">
                        <div className="text-sm font-bold link">{s.symbol}</div>
                        <div className="text-xs truncate" style={{ color:'var(--text-3)' }}>{s.name}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold num" style={{ color: s.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
                          {s.price != null ? `$${s.price.toFixed(2)}` : '—'}
                        </div>
                        <div className="text-xs font-semibold num" style={{ color: tone(s.changePct) }}>
                          {s.changePct != null ? `${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(2)}%` : '—'}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
