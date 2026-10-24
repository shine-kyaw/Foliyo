import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Search, Brain, AlertTriangle, RefreshCw, X, Check,
} from 'lucide-react'
import { stocks as allStocks } from '../data/mockData'
import { useQuote } from '../hooks/useQuote'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import PageHeader from '../components/PageHeader'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { persist } from '../utils/userStore'

/* ── Persistence keys ────────────────────────────────────────── */
const KEY_CASH     = 'foliyo_sim_cash'
const KEY_HOLDINGS = 'foliyo_sim_holdings'
const KEY_TRADES   = 'foliyo_sim_trades'

const STARTING_CASH = 100_000

function load(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def }
}
function save(key, val) { try { persist(key, val) } catch {} }

/* ── Display helpers ─────────────────────────────────────────── */
const UP   = 'rgb(var(--up))'
const DOWN = 'rgb(var(--down))'
const tone = v => v >= 0 ? UP : DOWN
const sgn  = v => v >= 0 ? '+' : '−'
const usd  = v => `$${v.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}`

/* ── Recorded performance ──────────────────────────────────────
   The line is made of real readings: the portfolio's value at each
   trade, plus at most one reading an hour while the page is open
   with live prices. Nothing is interpolated or invented.          */
const KEY_HISTORY = 'foliyo_sim_history'
const RANGE_MS = { '1D':86_400_000, '1W':7*86_400_000, '1M':30*86_400_000, '3M':90*86_400_000, '1Y':365*86_400_000, 'All':Infinity }

function historyPoints(history, range) {
  const cutoff = Date.now() - (RANGE_MS[range] ?? Infinity)
  const fmt = range === '1D'
    ? { hour:'numeric', minute:'2-digit' }
    : { month:'short', day:'numeric' }
  return history
    .filter(p => p.t >= cutoff)
    .map(p => ({ date: new Date(p.t).toLocaleString('en-US', fmt), value: p.value }))
}

/* ── AI Coach ───────────────────────────────────────────────── */
function deriveInsights(holdings, cash, trades, currentPrices) {
  const insights = []

  const stockValue = holdings.reduce((sum, h) => sum + (currentPrices[h.symbol] ?? h.avgCost) * h.shares, 0)
  const totalValue = cash + stockValue
  const returnPct  = ((totalValue - STARTING_CASH) / STARTING_CASH * 100).toFixed(1)

  if (!holdings.length) {
    insights.push({ type:'info', text:'Your portfolio is 100% cash. Browse stocks below and place your first trade to start building a portfolio.' })
    return insights
  }

  if (Math.abs(Number(returnPct)) >= 0.1) {
    insights.push({
      type: Number(returnPct) >= 0 ? 'positive' : 'negative',
      text: `Your portfolio is ${Number(returnPct) >= 0 ? 'up' : 'down'} ${Math.abs(Number(returnPct))}% from your $${STARTING_CASH.toLocaleString()} starting balance.`,
    })
  }

  const cashPct = (cash / totalValue * 100)
  if (cashPct > 60) {
    insights.push({ type:'info', text:`${cashPct.toFixed(0)}% of your portfolio is cash ($${Math.round(cash).toLocaleString()}). High cash reduces risk but limits potential returns.` })
  }

  holdings.forEach(h => {
    const price = currentPrices[h.symbol] ?? h.avgCost
    const weight = price * h.shares / totalValue * 100
    if (weight > 40) {
      insights.push({ type:'warning', text:`${h.symbol} is ${weight.toFixed(0)}% of your total portfolio. Consider diversifying to reduce concentration risk.` })
    }
  })

  const sectorMap = {}
  holdings.forEach(h => {
    const s = allStocks.find(st => st.symbol === h.symbol)
    if (!s?.sector) return
    const val = (currentPrices[h.symbol] ?? h.avgCost) * h.shares
    sectorMap[s.sector] = (sectorMap[s.sector] || 0) + val
  })
  Object.entries(sectorMap).forEach(([sector, val]) => {
    const pct = val / totalValue * 100
    if (pct > 65) insights.push({ type:'warning', text:`${pct.toFixed(0)}% of your portfolio is in ${sector}. Adding other sectors can reduce volatility.` })
  })

  if (holdings.length > 0 && holdings.length < 3) {
    insights.push({ type:'info', text:`You hold ${holdings.length} position${holdings.length === 1 ? '' : 's'}. A diversified portfolio typically has 8–15 stocks across multiple sectors.` })
  }

  if (trades.length >= 1) {
    const last = trades[0]
    const cur  = currentPrices[last.symbol]
    if (cur && last.type === 'buy') {
      const diff = ((cur - last.price) / last.price * 100).toFixed(1)
      if (Number(diff) > 2)       insights.push({ type:'positive', text:`Your ${last.symbol} purchase is up ${diff}% since you bought it at $${last.price.toFixed(2)}.` })
      else if (Number(diff) < -2) insights.push({ type:'negative', text:`Your ${last.symbol} position is down ${Math.abs(diff)}% since purchase. Review the fundamentals before adding more.` })
    }
  }

  const allUp = holdings.every(h => (currentPrices[h.symbol] ?? h.avgCost) > h.avgCost)
  if (allUp && holdings.length >= 3) {
    insights.push({ type:'positive', text:`All ${holdings.length} of your positions are currently profitable. Great momentum across the portfolio.` })
  }

  return insights.slice(0, 4)
}

/* ── Chart tooltip ──────────────────────────────────────────── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs border"
      style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
      <p style={{ color:'var(--text-3)' }}>{label}</p>
      <p className="font-bold num" style={{ color:'var(--text-1)' }}>
        ${payload[0]?.value?.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}
      </p>
    </div>
  )
}

/* ── Stock search for trade form ────────────────────────────── */
function TradeSearch({ onSelect }) {
  const [q, setQ]     = useState('')
  const [open, setOpen] = useState(false)

  const baseResults = q.trim().length >= 1
    ? allStocks.filter(s =>
        s.symbol.toLowerCase().includes(q.toLowerCase()) ||
        s.name.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 6)
    : []

  const { quotes } = useBatchQuotes(baseResults.map(s => s.symbol), 0)
  const results = baseResults.map(s => {
    const q2 = quotes[s.symbol]
    return q2
      ? { ...s, price: q2.price, change: q2.change, changePct: q2.changePct }
      : { ...s, price: null, change: null, changePct: null }
  })

  const pick = s => { onSelect(s); setQ(''); setOpen(false) }

  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'var(--text-3)' }}/>
      <input className="input pl-9" aria-label="Search stock to trade"
        placeholder="Search stock to trade…"
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}/>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:4 }}
            className="absolute left-0 right-0 mt-1 rounded-[10px] border overflow-hidden z-50"
            style={{ background:'var(--bg-2)', borderColor:'var(--border-light)', boxShadow:'0 8px 24px rgba(var(--shadow-color), .12)' }}>
            {results.map(s => (
              <button key={s.symbol} onMouseDown={() => pick(s)}
                className="asset-row w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left border-b last:border-0"
                style={{ borderColor:'var(--border)' }}>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold link">{s.symbol}</div>
                  <div className="text-xs truncate" style={{ color:'var(--text-3)' }}>{s.name}</div>
                </div>
                <div className="text-right num shrink-0">
                  <div className="text-[13px] font-bold" style={{ color: s.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
                    {s.price != null ? `$${s.price.toFixed(2)}` : '—'}
                  </div>
                  {s.changePct != null && (
                    <div className="text-xs font-semibold" style={{ color:tone(s.changePct) }}>
                      {sgn(s.changePct)}{Math.abs(s.changePct).toFixed(2)}%
                    </div>
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Live holding row ───────────────────────────────────────── */
function HoldingRow({ h, totalValue, onSell }) {
  const { quote } = useQuote(h.symbol)
  const cur     = quote?.price     ?? h.avgCost
  const dayChg  = quote?.changePct ?? 0
  const val     = cur * h.shares
  const pl      = (cur - h.avgCost) * h.shares
  const plPct   = ((cur - h.avgCost) / h.avgCost * 100)
  const wt      = (val / totalValue * 100)

  const sellStock = { symbol:h.symbol, name:h.name, price:cur, changePct:dayChg }

  return (
    <tr className="asset-row border-b bg-[var(--bg-0)]" style={{ borderColor:'var(--border)' }}>
      <td className="td">
        <Link to={`/stock/${h.symbol}`} className="block">
          <div className="font-bold text-[13px] link">{h.symbol}</div>
          <div className="text-xs truncate max-w-[140px]" style={{ color:'var(--text-3)' }}>{h.name}</div>
        </Link>
      </td>
      <td className="td text-right num whitespace-nowrap">{h.shares}</td>
      <td className="td text-right num whitespace-nowrap" style={{ color:'var(--text-2)' }}>${h.avgCost.toFixed(2)}</td>
      <td className="td text-right num whitespace-nowrap font-bold">${cur.toFixed(2)}</td>
      <td className="td text-right num whitespace-nowrap font-semibold" style={{ color:tone(dayChg) }}>
        {sgn(dayChg)}{Math.abs(dayChg).toFixed(2)}%
      </td>
      <td className="td text-right num whitespace-nowrap font-bold">{usd(val)}</td>
      <td className="td text-right num whitespace-nowrap">
        <div className="font-semibold" style={{ color:tone(pl) }}>{sgn(pl)}${Math.abs(pl).toFixed(2)}</div>
        <div className="text-xs" style={{ color:tone(pl) }}>{sgn(plPct)}{Math.abs(plPct).toFixed(2)}%</div>
      </td>
      <td className="td text-right num whitespace-nowrap hidden md:table-cell" style={{ color:'var(--text-2)' }}>{wt.toFixed(1)}%</td>
      {/* Pinned to the right edge so Sell stays reachable when the table scrolls on a phone */}
      <td className="td text-right sticky right-0 bg-inherit">
        <button onClick={() => onSell(sellStock)} aria-label={`Sell ${h.symbol}`}
          className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors hover:bg-[rgb(var(--down)/.08)]"
          style={{ borderColor:'rgb(var(--down) / .4)', color:DOWN }}>
          Sell
        </button>
      </td>
    </tr>
  )
}

/* ── Small pieces ───────────────────────────────────────────── */
function SectionHead({ children, count }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <h2 className="section-title">{children}</h2>
      {count != null && <span className="text-sm num" style={{ color:'var(--text-3)' }}>{count}</span>}
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────── */
export default function Simulator() {
  const [cash, setCash]         = useState(() => load(KEY_CASH, STARTING_CASH))
  const [holdings, setHoldings] = useState(() => load(KEY_HOLDINGS, []))
  const [trades, setTrades]     = useState(() => load(KEY_TRADES, []))
  const [chartRange, setChartRange] = useState('1M')
  const [tradeStock, setTradeStock] = useState(null)
  const [tradeMode, setTradeMode]   = useState('buy')
  const [qty, setQty]               = useState('')
  const [tradeError, setTradeError] = useState('')
  const [tradeSuccess, setTradeSuccess] = useState('')
  const [showReset, setShowReset]   = useState(false)

  useEffect(() => { save(KEY_CASH,     cash)     }, [cash])
  useEffect(() => { save(KEY_HOLDINGS, holdings) }, [holdings])
  useEffect(() => { save(KEY_TRADES,   trades)   }, [trades])

  /* ── Portfolio value — live quotes; a holding without one counts at cost ── */
  const { quotes: liveQuotes } = useBatchQuotes(holdings.map(h => h.symbol), 60_000)
  const currentPrices = useMemo(
    () => Object.fromEntries(holdings.map(h => [h.symbol, liveQuotes[h.symbol]?.price ?? h.avgCost])),
    [holdings, liveQuotes])
  const pricesLive = holdings.every(h => liveQuotes[h.symbol]?.price != null)
  const stockValue = useMemo(
    () => holdings.reduce((sum, h) => sum + currentPrices[h.symbol] * h.shares, 0),
    [holdings, currentPrices])

  const totalValue  = cash + stockValue
  const totalReturn = totalValue - STARTING_CASH
  const returnPct   = (totalReturn / STARTING_CASH * 100)
  const isUp        = totalReturn >= 0

  /* ── Recorded performance ── */
  const [history, setHistory] = useState(() => load(KEY_HISTORY, []))
  useEffect(() => { save(KEY_HISTORY, history) }, [history])
  const lastTradeCount = useRef(trades.length)
  useEffect(() => {
    if (!holdings.length && !trades.length) return
    if (holdings.length && !pricesLive) return            // only record values priced live
    const value = parseFloat(totalValue.toFixed(2))
    const traded = trades.length !== lastTradeCount.current
    lastTradeCount.current = trades.length
    setHistory(h => {
      const last = h.at(-1)
      if (!traded && last && Date.now() - last.t < 3_600_000) return h
      const base = h.length ? h : [{ t: trades[0] ? new Date(trades[0].date || Date.now()).getTime() : Date.now(), value: STARTING_CASH }]
      return [...base, { t: Date.now(), value }].slice(-1000)
    })
  }, [totalValue, pricesLive, trades, holdings.length])
  const chartData = useMemo(() => historyPoints(history, chartRange), [history, chartRange])

  /* ── AI insights ── */
  const insights = useMemo(() => deriveInsights(holdings, cash, trades, currentPrices), [holdings, cash, trades, currentPrices])

  /* ── Trade helpers ── */
  const hasPrice    = tradeStock?.price != null
  const tradeTotal  = hasPrice ? parseFloat(qty || 0) * tradeStock.price : 0
  const maxShares   = hasPrice ? Math.floor(cash / tradeStock.price) : 0
  const ownedShares = tradeStock ? (holdings.find(h => h.symbol === tradeStock.symbol)?.shares ?? 0) : 0

  const resetForm = () => { setTradeStock(null); setQty(''); setTradeError(''); setTradeSuccess('') }

  const executeTrade = () => {
    if (!tradeStock) return
    if (!hasPrice) { setTradeError('No price for this stock yet. Wait a moment and try again.'); return }
    const n = parseInt(qty)
    if (!n || n <= 0) { setTradeError('Enter a valid number of shares.'); return }

    if (tradeMode === 'buy') {
      if (tradeTotal > cash) { setTradeError(`Insufficient cash. Max ${maxShares} shares.`); return }
      setCash(c => parseFloat((c - tradeTotal).toFixed(2)))
      setHoldings(prev => {
        const existing = prev.find(h => h.symbol === tradeStock.symbol)
        if (existing) {
          return prev.map(h => h.symbol === tradeStock.symbol
            ? { ...h, shares: h.shares + n, avgCost: parseFloat(((h.avgCost * h.shares + tradeTotal) / (h.shares + n)).toFixed(4)) }
            : h
          )
        }
        return [...prev, { symbol:tradeStock.symbol, name:tradeStock.name, shares:n, avgCost:tradeStock.price }]
      })
    } else {
      if (n > ownedShares) { setTradeError(`You only own ${ownedShares} shares.`); return }
      const proceeds = n * tradeStock.price
      setCash(c => parseFloat((c + proceeds).toFixed(2)))
      setHoldings(prev => {
        const h = prev.find(h => h.symbol === tradeStock.symbol)
        if (!h || h.shares - n <= 0) return prev.filter(h => h.symbol !== tradeStock.symbol)
        return prev.map(h => h.symbol === tradeStock.symbol ? { ...h, shares: h.shares - n } : h)
      })
    }

    const newTrade = {
      id: Date.now(),
      type: tradeMode,
      symbol: tradeStock.symbol,
      name: tradeStock.name,
      shares: n,
      price: tradeStock.price,
      total: tradeTotal,
      date: new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }),
    }
    setTrades(prev => [newTrade, ...prev].slice(0, 100))
    setTradeSuccess(`${tradeMode === 'buy' ? 'Bought' : 'Sold'} ${n} share${n > 1 ? 's' : ''} of ${tradeStock.symbol}`)
    setQty('')
    setTradeError('')
    setTimeout(() => setTradeSuccess(''), 3000)
  }

  const doReset = () => {
    setCash(STARTING_CASH); setHoldings([]); setTrades([]); setHistory([])
    setShowReset(false); resetForm()
  }

  const INSIGHT_CFG = {
    info:     { color:'var(--accent)',       Icon: Brain    },
    positive: { color:UP,                    Icon: TrendingUp },
    negative: { color:DOWN,                  Icon: TrendingDown },
    warning:  { color:'rgb(var(--caution))', Icon: AlertTriangle },
  }

  const upC   = UP
  const downC = DOWN
  const dirC  = isUp ? upC : downC

  /* ── Account summary stats ── */
  const stats = [
    {
      label:'Portfolio value',
      value: usd(totalValue),
      sub: `${sgn(returnPct)}${Math.abs(returnPct).toFixed(2)}% all time`,
      subColor: dirC,
    },
    {
      label:'Cash available',
      value: usd(cash),
      sub: `${(cash/totalValue*100).toFixed(0)}% of portfolio`,
    },
    {
      label:'Total return',
      value: `${isUp?'+':'−'}${usd(Math.abs(totalReturn))}`,
      valueColor: dirC,
      sub: `vs $${STARTING_CASH.toLocaleString()} start`,
    },
    {
      label:'Holdings',
      value: holdings.length,
      sub: `${trades.length} trade${trades.length !== 1?'s':''}`,
    },
  ]

  /* ── Best / worst performer ── */
  const performers = (() => {
    if (holdings.length < 2) return null
    const rows = holdings.map(h => {
      const cur = currentPrices[h.symbol] ?? h.avgCost
      const plPct = ((cur - h.avgCost) / h.avgCost * 100)
      return { ...h, cur, plPct }
    })
    return {
      best:  rows.reduce((a, b) => b.plPct > a.plPct ? b : a),
      worst: rows.reduce((a, b) => b.plPct < a.plPct ? b : a),
    }
  })()

  const qtyN = parseInt(qty)

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-8 page-enter">

      {/* ── Header ── */}
      <PageHeader title="Stock simulator" subtitle="Practice investing with $100,000 of virtual cash — no real money involved">
        <button onClick={() => setShowReset(true)} className="btn-ghost">
          <RefreshCw size={14}/> Reset portfolio
        </button>
      </PageHeader>

      {/* ── Reset confirm ── */}
      <AnimatePresence>
        {showReset && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
            role="alert"
            className="rounded-[10px] border p-4 flex items-center gap-4 flex-wrap -mt-3"
            style={{ background:'rgb(var(--down) / .05)', borderColor:'rgb(var(--down) / .25)' }}>
            <AlertTriangle size={16} className="shrink-0" style={{ color:downC }}/>
            <p className="text-sm flex-1 min-w-[220px]" style={{ color:'var(--text-2)' }}>
              This will clear all holdings and trades and reset your cash to <span className="num font-semibold">$100,000</span>.
            </p>
            <div className="flex gap-2">
              <button onClick={doReset} className="btn-primary"
                style={{ background:downC, borderColor:downC, color:'var(--on-accent)' }}>
                Yes, reset
              </button>
              <button onClick={() => setShowReset(false)} className="btn-ghost">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Account summary — big figures split by thin rules ── */}
      <section aria-label="Account summary">
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px border-y" style={{ background:'var(--border)', borderColor:'var(--border)' }}>
          {stats.map((c, i) => (
            <div key={c.label} className={`min-w-0 py-4 px-4 lg:px-6 ${i === 0 ? 'lg:pl-0' : ''}`} style={{ background:'var(--bg-0)' }}>
              <dt className="text-xs font-semibold" style={{ color:'var(--text-3)' }}>{c.label}</dt>
              <dd className="mt-1">
                <div className="text-[1.45rem] sm:text-[1.85rem] font-bold leading-tight num truncate" style={{ color: c.valueColor || 'var(--text-1)' }}>{c.value}</div>
                <div className="text-xs font-semibold num mt-0.5" style={{ color: c.subColor || 'var(--text-3)' }}>{c.sub}</div>
              </dd>
            </div>
          ))}
        </dl>
        {performers && (
          <div className="flex flex-wrap gap-x-10 gap-y-2 pt-3 text-sm">
            <p>
              <span style={{ color:'var(--text-3)' }}>Best performer </span>
              <Link to={`/stock/${performers.best.symbol}`} className="font-bold link">{performers.best.symbol}</Link>{' '}
              <span className="num font-semibold" style={{ color:tone(performers.best.plPct) }}>
                {sgn(performers.best.plPct)}{Math.abs(performers.best.plPct).toFixed(2)}% total return
              </span>
            </p>
            <p>
              <span style={{ color:'var(--text-3)' }}>Worst performer </span>
              <Link to={`/stock/${performers.worst.symbol}`} className="font-bold link">{performers.worst.symbol}</Link>{' '}
              <span className="num font-semibold" style={{ color:tone(performers.worst.plPct) }}>
                {sgn(performers.worst.plPct)}{Math.abs(performers.worst.plPct).toFixed(2)}% total return
              </span>
            </p>
          </div>
        )}
      </section>

      {/* ── Main grid: chart, holdings, history · order ticket rail ── */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">

        <div className="min-w-0 space-y-10">

          {/* Chart */}
          <section aria-label="Portfolio performance" className="card-flat">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="section-title">Portfolio performance</h2>
              <div className="flex gap-1 flex-wrap" role="group" aria-label="Chart range">
                {['1D','1W','1M','3M','1Y','All'].map(r => (
                  <button key={r} onClick={() => setChartRange(r)} aria-pressed={chartRange === r}
                    className="text-xs px-3 py-1.5 rounded-full font-semibold transition-colors"
                    style={chartRange === r
                      ? { background:'var(--bg-3)', color:'var(--text-1)' }
                      : { color:'var(--text-2)' }
                    }>{r}</button>
                ))}
              </div>
            </div>
            {chartData.length < 2 ? (
              <div className="h-[260px] flex items-center justify-center text-center px-6 text-sm rounded-lg"
                style={{ background:'var(--bg-1)', color:'var(--text-3)' }}>
                {history.length < 2
                  ? 'Your line builds from real readings: Foliyo records the portfolio’s value at every trade, and once an hour while you’re here.'
                  : 'No readings in this range yet. Pick a longer range.'}
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top:5, right:5, bottom:0, left:5 }}>
                <defs>
                  <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={dirC} stopOpacity={0.14}/>
                    <stop offset="95%" stopColor={dirC} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="date" tick={{ fontSize:11, fill:'var(--text-3)' }}
                  interval={Math.floor(chartData.length/5)} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11, fill:'var(--text-3)' }} domain={['auto','auto']}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={48}/>
                <Tooltip content={<ChartTip/>}/>
                <Area type="monotone" dataKey="value"
                  stroke={dirC} strokeWidth={2} fill="url(#simGrad)"/>
              </AreaChart>
            </ResponsiveContainer>
            )}
          </section>

          {/* Holdings table */}
          <section aria-label="Holdings">
            <SectionHead count={holdings.length}>Holdings</SectionHead>
            {holdings.length === 0 ? (
              <p className="text-sm py-8 border-t" style={{ color:'var(--text-2)', borderColor:'var(--border)' }}>
                No holdings yet. Pick a stock in Place Trade and buy your first shares.
              </p>
            ) : (
              <div className="overflow-x-auto border-t" style={{ borderColor:'var(--border)' }}>
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b" style={{ borderColor:'var(--border)' }}>
                      {['Symbol','Shares','Avg cost','Price','Day change','Value','P&L','Weight',''].map((h,i) => (
                        <th key={h || 'action'} scope="col"
                          className={`th whitespace-nowrap ${i===0?'text-left':'text-right'} ${h==='Weight'?'hidden md:table-cell':''} ${i===8?'sticky right-0 bg-[var(--bg-0)]':''}`}>
                          {h || <span className="sr-only">Action</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map(h => (
                      <HoldingRow key={h.symbol} h={h} totalValue={totalValue}
                        onSell={s => { setTradeStock(s); setTradeMode('sell'); setQty('') }}/>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Trade history */}
          <section aria-label="Trade history">
            <SectionHead count={trades.length}>Trade history</SectionHead>
            {trades.length === 0 ? (
              <p className="text-sm py-8 border-t" style={{ color:'var(--text-2)', borderColor:'var(--border)' }}>
                No trades yet. Your buys and sells will be listed here.
              </p>
            ) : (
              <div className="overflow-auto max-h-[380px] border-t" style={{ borderColor:'var(--border)' }}>
                <table className="w-full min-w-[520px]">
                  <thead>
                    <tr className="border-b" style={{ borderColor:'var(--border)' }}>
                      {['Date','Symbol','Type','Shares','Price','Total'].map((h,i) => (
                        <th key={h} scope="col" className={`th whitespace-nowrap sticky top-0 bg-[var(--bg-0)] ${i < 3 ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map(t => (
                      <tr key={t.id} className="asset-row border-b" style={{ borderColor:'var(--border)' }}>
                        <td className="td whitespace-nowrap text-[13px]" style={{ color:'var(--text-2)' }}>{t.date}</td>
                        <td className="td">
                          <Link to={`/stock/${t.symbol}`} className="font-bold text-[13px] link">{t.symbol}</Link>
                        </td>
                        <td className="td font-semibold capitalize" style={{ color: t.type === 'buy' ? UP : DOWN }}>{t.type}</td>
                        <td className="td text-right num">{t.shares}</td>
                        <td className="td text-right num">${t.price.toFixed(2)}</td>
                        <td className="td text-right num font-semibold">{usd(t.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* ── Right rail: order ticket + coach ── */}
        <aside className="space-y-6 min-w-0">

          {/* Order ticket */}
          <section aria-label="Place trade" className="card-flat space-y-4">
            <h2 className="section-title">Place trade</h2>

            {/* Buy / Sell toggle */}
            <div className="flex rounded-full p-1" role="group" aria-label="Order side" style={{ background:'var(--bg-3)' }}>
              {['buy','sell'].map(m => (
                <button key={m} onClick={() => { setTradeMode(m); setTradeError(''); setTradeSuccess('') }}
                  aria-pressed={tradeMode === m}
                  className="flex-1 py-1.5 rounded-full text-sm font-bold capitalize transition-colors"
                  style={tradeMode === m
                    ? { background:'var(--bg-2)', color: m === 'buy' ? upC : downC, boxShadow:'0 1px 3px rgba(var(--shadow-color), .14)' }
                    : { color:'var(--text-2)' }
                  }>{m}</button>
              ))}
            </div>

            {/* Stock search */}
            <TradeSearch onSelect={s => { setTradeStock(s); setQty(''); setTradeError(''); setTradeSuccess('') }}/>

            {/* Selected stock info */}
            {tradeStock && (
              <div className="rounded-[10px] px-3 py-2.5 flex items-center gap-3" style={{ background:'var(--bg-1)' }}>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[13px]">
                    <Link to={`/stock/${tradeStock.symbol}`} className="link">{tradeStock.symbol}</Link>
                  </div>
                  <div className="text-xs truncate" style={{ color:'var(--text-3)' }}>{tradeStock.name}</div>
                </div>
                <div className="text-right num">
                  <div className="font-bold text-[15px]" style={{ color:'var(--text-1)' }}>
                    {hasPrice ? `$${tradeStock.price.toFixed(2)}` : '—'}
                  </div>
                  <div className="text-xs font-semibold"
                    style={{ color: tradeStock.changePct == null ? 'var(--text-3)' : tone(tradeStock.changePct) }}>
                    {tradeStock.changePct == null ? 'Loading price' : `${sgn(tradeStock.changePct)}${Math.abs(tradeStock.changePct).toFixed(2)}%`}
                  </div>
                </div>
                <button onClick={resetForm} aria-label="Clear selected stock"
                  className="p-1.5 rounded-full hover:bg-[var(--bg-3)] transition-colors"
                  style={{ color:'var(--text-3)' }}>
                  <X size={14}/>
                </button>
              </div>
            )}

            {/* Shares input */}
            <div>
              <label htmlFor="sim-qty" className="flex items-baseline justify-between text-xs font-semibold mb-1.5" style={{ color:'var(--text-2)' }}>
                <span>Shares</span>
                {tradeStock && tradeMode === 'buy' && (
                  <span className="font-normal num" style={{ color:'var(--text-3)' }}>Max {maxShares.toLocaleString()}</span>
                )}
                {tradeStock && tradeMode === 'sell' && ownedShares > 0 && (
                  <span className="font-normal num" style={{ color:'var(--text-3)' }}>Own {ownedShares}</span>
                )}
              </label>
              <input id="sim-qty" type="number" min="1" step="1"
                className="input num"
                placeholder="Number of shares"
                value={qty}
                onChange={e => { setQty(e.target.value); setTradeError('') }}
                disabled={!tradeStock}
              />
            </div>

            {/* Order summary */}
            {tradeStock && qty && !isNaN(qtyN) && (
              <dl className="text-sm border-t" style={{ borderColor:'var(--border)' }}>
                <div className="flex justify-between gap-3 py-2 border-b" style={{ borderColor:'var(--border)' }}>
                  <dt style={{ color:'var(--text-3)' }}>Price per share</dt>
                  <dd className="num font-semibold" style={{ color:'var(--text-1)' }}>{hasPrice ? `$${tradeStock.price.toFixed(2)}` : '—'}</dd>
                </div>
                <div className="flex justify-between gap-3 py-2 border-b" style={{ borderColor:'var(--border)' }}>
                  <dt style={{ color:'var(--text-3)' }}>Shares</dt>
                  <dd className="num font-semibold" style={{ color:'var(--text-1)' }}>{qtyN}</dd>
                </div>
                <div className="flex justify-between gap-3 py-2 border-b" style={{ borderColor:'var(--border)' }}>
                  <dt style={{ color:'var(--text-3)' }}>{tradeMode === 'buy' ? 'Estimated cost' : 'Estimated proceeds'}</dt>
                  <dd className="num font-semibold" style={{ color:'var(--text-1)' }}>{usd(tradeTotal)}</dd>
                </div>
                <div className="flex justify-between gap-3 py-2 border-b" style={{ borderColor:'var(--border)' }}>
                  <dt style={{ color:'var(--text-3)' }}>Cash after trade</dt>
                  <dd className="num font-semibold"
                    style={{ color: tradeMode==='buy' ? (tradeTotal>cash?downC:upC) : upC }}>
                    {usd(Math.max(0, tradeMode==='buy' ? cash-tradeTotal : cash+tradeTotal))}
                  </dd>
                </div>
              </dl>
            )}

            {/* Error / Success */}
            <AnimatePresence>
              {tradeError && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} role="alert"
                  className="rounded-lg px-3 py-2 text-xs font-medium"
                  style={{ background:'rgb(var(--down) / .08)', color:downC }}>
                  <AlertTriangle size={12} className="inline mr-1.5 -mt-0.5"/>{tradeError}
                </motion.div>
              )}
              {tradeSuccess && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} role="status"
                  className="rounded-lg px-3 py-2 text-xs font-medium"
                  style={{ background:'rgb(var(--up) / .08)', color:upC }}>
                  <Check size={12} className="inline mr-1.5 -mt-0.5"/>{tradeSuccess}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confirm button */}
            <button onClick={executeTrade} disabled={!tradeStock || !qty}
              className="btn-primary w-full justify-center py-3"
              style={tradeMode === 'buy' ? undefined : { background:downC, borderColor:downC, color:'var(--on-accent)' }}>
              {tradeMode === 'buy' ? 'Buy shares' : 'Sell shares'}
            </button>
          </section>

          {/* AI Coach */}
          <section aria-label="AI Coach" className="card-flat">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="section-title">AI Coach</h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background:'var(--bg-3)', color:'var(--text-2)' }}>
                Rule-based
              </span>
            </div>
            <ul>
              {insights.map((ins, i) => {
                const cfg = INSIGHT_CFG[ins.type] || INSIGHT_CFG.info
                return (
                  <li key={i} className="flex gap-3 py-3 border-t first:border-t-0" style={{ borderColor:'var(--border)' }}>
                    <cfg.Icon size={15} className="shrink-0 mt-0.5" style={{ color:cfg.color }}/>
                    <p className="text-[13px] leading-relaxed" style={{ color:'var(--text-2)' }}>{ins.text}</p>
                  </li>
                )
              })}
            </ul>
          </section>
        </aside>
      </div>

      {/* Disclaimer */}
      <p className="text-xs leading-relaxed border-t pt-4" style={{ borderColor:'var(--border)', color:'var(--text-3)' }}>
        <AlertTriangle size={11} className="inline mr-1.5 -mt-0.5"/>
        <span className="font-semibold" style={{ color:'var(--text-2)' }}>Simulator disclaimer:</span>{' '}
        This simulator uses virtual money for educational purposes only. It is not real trading or financial advice. All prices are simulated and may not reflect real-time market data.
      </p>
    </div>
  )
}
