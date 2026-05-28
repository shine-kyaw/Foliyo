import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Search, BarChart2,
  ShoppingCart, Brain, Clock, AlertTriangle, RefreshCw,
  ArrowUp, ArrowDown, X, Cpu, Trophy, Flame,
} from 'lucide-react'
import { stocks as allStocks } from '../data/mockData'
import { useQuote } from '../hooks/useQuote'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

/* ── Persistence keys ────────────────────────────────────────── */
const KEY_CASH     = 'foliyo_sim_cash'
const KEY_HOLDINGS = 'foliyo_sim_holdings'
const KEY_TRADES   = 'foliyo_sim_trades'

const STARTING_CASH = 100_000

function load(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def }
}
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

/* ── Deterministic portfolio chart ─────────────────────────── */
function buildPortfolioChart(startVal, endVal, days) {
  const result = []
  const now = new Date()
  const returnAmt = endVal - startVal
  const hasReturn = Math.abs(returnAmt) > startVal * 0.001  // only add noise if there's real movement
  for (let i = days; i >= 0; i--) {
    const progress = 1 - i / days
    const seed = i * 2.3
    const noiseMag = hasReturn ? Math.abs(returnAmt) * 0.18 : 0
    const noise = Math.sin(seed) * noiseMag * 0.7 + Math.cos(seed * 1.6) * noiseMag * 0.3
    const trend = startVal + returnAmt * progress
    const value = Math.max(trend + noise, startVal * 0.4)
    const d = new Date(now); d.setDate(d.getDate() - i)
    result.push({
      date: d.toLocaleDateString('en-US', { month:'short', day:'numeric' }),
      value: parseFloat(value.toFixed(2)),
    })
  }
  return result
}

/* ── AI Coach ───────────────────────────────────────────────── */
function deriveInsights(holdings, cash, trades) {
  const insights = []
  const currentPrices = Object.fromEntries(allStocks.map(s => [s.symbol, s.price]))

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
    <div className="rounded-xl px-3 py-2 text-xs border shadow-lg"
      style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
      <p style={{ color:'var(--text-3)' }}>{label}</p>
      <p className="font-bold font-mono" style={{ color:'var(--text-1)' }}>
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
      <div className="relative flex items-center rounded-xl border overflow-hidden"
        style={{ background:'var(--bg-1)', borderColor: open ? 'rgba(var(--accent-rgb),.4)' : 'var(--border)' }}>
        <Search size={13} className="ml-3 shrink-0" style={{ color:'var(--text-3)' }}/>
        <input className="flex-1 bg-transparent text-sm px-2.5 py-2.5 outline-none"
          style={{ color:'var(--text-1)' }}
          placeholder="Search stock to trade…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 160)}/>
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:4 }}
            className="absolute left-0 right-0 mt-1 rounded-xl border shadow-2xl overflow-hidden z-50"
            style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
            {results.map(s => (
              <button key={s.symbol} onMouseDown={() => pick(s)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left border-b last:border-0"
                style={{ borderColor:'var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0"
                    style={{ background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)' }}>
                    {s.symbol.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold" style={{ color:'var(--text-1)' }}>{s.symbol}</div>
                    <div className="text-xs truncate max-w-[130px]" style={{ color:'var(--text-3)' }}>{s.name}</div>
                  </div>
                </div>
                <div className="text-xs font-mono font-semibold" style={{ color: s.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
                  {s.price != null ? `$${s.price.toFixed(2)}` : '—'}
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
  const staticStock = allStocks.find(s => s.symbol === h.symbol)
  const cur     = quote?.price     ?? staticStock?.price ?? h.avgCost
  const dayChg  = quote?.changePct ?? staticStock?.changePct ?? 0
  const val     = cur * h.shares
  const pl      = (cur - h.avgCost) * h.shares
  const plPct   = ((cur - h.avgCost) / h.avgCost * 100)
  const wt      = (val / totalValue * 100)

  const sellStock = { symbol:h.symbol, name:h.name, price:cur, changePct:dayChg }

  return (
    <tr className="tr border-b" style={{ borderColor:'var(--border)' }}>
      <td className="td">
        <Link to={`/stock/${h.symbol}`} className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
            style={{ background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)' }}>
            {h.symbol.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-sm group-hover:text-accent transition-colors"
              style={{ color:'var(--text-1)' }}>{h.symbol}</div>
            <div className="text-xs truncate max-w-[100px]" style={{ color:'var(--text-3)' }}>{h.name}</div>
          </div>
        </Link>
      </td>
      <td className="td text-right font-mono font-semibold text-sm" style={{ color:'var(--text-2)' }}>{h.shares}</td>
      <td className="td text-right font-mono text-sm" style={{ color:'var(--text-2)' }}>${h.avgCost.toFixed(2)}</td>
      <td className="td text-right">
        <div className="font-mono font-semibold text-sm" style={{ color:'var(--text-1)' }}>${cur.toFixed(2)}</div>
        <div className={`text-xs font-bold ${dayChg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {dayChg >= 0 ? '+' : ''}{dayChg.toFixed(2)}% today
        </div>
      </td>
      <td className="td text-right font-mono font-bold text-sm" style={{ color:'var(--text-1)' }}>
        ${val.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
      </td>
      <td className="td text-right">
        <div className={`text-sm font-bold font-mono ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {pl >= 0 ? '+' : ''}${Math.abs(pl).toFixed(2)}
        </div>
        <div className={`text-xs ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {plPct >= 0 ? '+' : ''}{plPct.toFixed(2)}%
        </div>
      </td>
      <td className="td text-right hidden md:table-cell">
        <span className="text-sm font-mono" style={{ color:'var(--text-2)' }}>{wt.toFixed(1)}%</span>
      </td>
      <td className="td text-right hidden md:table-cell">
        <button onClick={() => onSell(sellStock)}
          className="text-xs px-2.5 py-1.5 rounded-lg border transition-all"
          style={{ borderColor:'rgba(239,68,68,.25)', color:'#ef4444', background:'rgba(239,68,68,.06)' }}>
          Sell
        </button>
      </td>
    </tr>
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

  /* ── Portfolio value ── */
  const stockValue = useMemo(() =>
    holdings.reduce((sum, h) => {
      const s = allStocks.find(st => st.symbol === h.symbol)
      return sum + (s ? s.price * h.shares : h.avgCost * h.shares)
    }, 0),
  [holdings])

  const totalValue  = cash + stockValue
  const totalReturn = totalValue - STARTING_CASH
  const returnPct   = (totalReturn / STARTING_CASH * 100)
  const isUp        = totalReturn >= 0

  /* ── Chart data ── */
  const RANGE_DAYS = { '1D':1,'1W':7,'1M':30,'3M':90,'1Y':365,'All':365 }
  const chartData = useMemo(() => {
    const days = RANGE_DAYS[chartRange] ?? 30
    return buildPortfolioChart(STARTING_CASH, totalValue, days)
  }, [chartRange, totalValue])

  /* ── AI insights ── */
  const insights = useMemo(() => deriveInsights(holdings, cash, trades), [holdings, cash, trades])

  /* ── Trade helpers ── */
  const tradeTotal  = tradeStock ? parseFloat(qty || 0) * tradeStock.price : 0
  const maxShares   = tradeStock ? Math.floor(cash / tradeStock.price) : 0
  const ownedShares = tradeStock ? (holdings.find(h => h.symbol === tradeStock.symbol)?.shares ?? 0) : 0

  const resetForm = () => { setTradeStock(null); setQty(''); setTradeError(''); setTradeSuccess('') }

  const executeTrade = () => {
    if (!tradeStock) return
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
    setCash(STARTING_CASH); setHoldings([]); setTrades([])
    setShowReset(false); resetForm()
  }

  const INSIGHT_CFG = {
    info:     { color:'var(--accent)',  bg:`rgba(var(--accent-rgb),.08)`, Icon: Brain    },
    positive: { color:'#10b981',        bg:'rgba(16,185,129,.08)',        Icon: TrendingUp },
    negative: { color:'#ef4444',        bg:'rgba(239,68,68,.08)',         Icon: TrendingDown },
    warning:  { color:'#f59e0b',        bg:'rgba(245,158,11,.08)',        Icon: AlertTriangle },
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 page-enter">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2.5" style={{ color:'var(--text-1)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background:'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
              <Cpu size={16} className="text-white"/>
            </div>
            Stock Simulator
          </h1>
          <p className="text-sm mt-0.5" style={{ color:'var(--text-3)' }}>
            Practice investing with $100,000 virtual cash — no real money involved
          </p>
        </div>
        <button onClick={() => setShowReset(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all"
          style={{ borderColor:'var(--border)', color:'var(--text-3)' }}>
          <RefreshCw size={12}/> Reset Portfolio
        </button>
      </div>

      {/* ── Reset confirm ── */}
      <AnimatePresence>
        {showReset && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
            className="rounded-2xl border p-4 flex items-center gap-4 flex-wrap"
            style={{ background:'rgba(239,68,68,.06)', borderColor:'rgba(239,68,68,.2)' }}>
            <AlertTriangle size={16} className="text-red-400 shrink-0"/>
            <p className="text-sm flex-1" style={{ color:'var(--text-2)' }}>
              This will clear all holdings and trades and reset your cash to $100,000.
            </p>
            <div className="flex gap-2">
              <button onClick={doReset}
                className="text-xs px-3 py-2 rounded-lg font-bold bg-red-400/15 text-red-400 border border-red-400/25 transition-all hover:bg-red-400/25">
                Yes, Reset
              </button>
              <button onClick={() => setShowReset(false)}
                className="text-xs px-3 py-2 rounded-lg font-bold border transition-all"
                style={{ borderColor:'var(--border)', color:'var(--text-3)' }}>
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label:'Portfolio Value',
            value:`$${totalValue.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,
            sub: `${isUp?'+':''}${returnPct.toFixed(2)}%`,
            subColor: isUp?'#10b981':'#ef4444',
            bg: isUp ? 'rgba(16,185,129,.06)' : 'rgba(239,68,68,.06)',
            border: isUp ? 'rgba(16,185,129,.18)' : 'rgba(239,68,68,.18)',
          },
          {
            label:'Total Return',
            value:`${isUp?'+':''}$${Math.abs(totalReturn).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,
            sub: `vs $${STARTING_CASH.toLocaleString()} start`,
            subColor:'var(--text-3)',
            bg: isUp ? 'rgba(16,185,129,.06)' : 'rgba(239,68,68,.06)',
            border: isUp ? 'rgba(16,185,129,.18)' : 'rgba(239,68,68,.18)',
          },
          {
            label:'Cash Available',
            value:`$${cash.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,
            sub:`${(cash/totalValue*100).toFixed(0)}% of portfolio`,
            subColor:'var(--text-3)',
            bg:'var(--bg-2)', border:'var(--border)',
          },
          {
            label:'Holdings',
            value: holdings.length,
            sub: `${trades.length} trade${trades.length !== 1?'s':''}`,
            subColor:'var(--text-3)',
            bg:'var(--bg-2)', border:'var(--border)',
          },
        ].map(c => (
          <motion.div key={c.label}
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
            className="rounded-2xl p-4 border"
            style={{ background:c.bg, borderColor:c.border }}>
            <div className="text-xs font-medium mb-2" style={{ color:'var(--text-3)' }}>{c.label}</div>
            <div className="text-xl font-black font-mono" style={{ color:'var(--text-1)' }}>{c.value}</div>
            <div className="text-xs font-semibold mt-0.5" style={{ color:c.subColor }}>{c.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Best / Worst performers ── */}
      {holdings.length >= 2 && (() => {
        const rows = holdings.map(h => {
          const s = allStocks.find(st => st.symbol === h.symbol)
          const cur = s?.price ?? h.avgCost
          const plPct = ((cur - h.avgCost) / h.avgCost * 100)
          return { ...h, cur, plPct }
        })
        const best  = rows.reduce((a, b) => b.plPct > a.plPct ? b : a)
        const worst = rows.reduce((a, b) => b.plPct < a.plPct ? b : a)
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 border flex items-center gap-3"
              style={{ background:'rgba(16,185,129,.05)', borderColor:'rgba(16,185,129,.18)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background:'rgba(16,185,129,.12)' }}>
                <Trophy size={16} className="text-emerald-400"/>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium mb-0.5" style={{ color:'var(--text-3)' }}>Best Performer</div>
                <div className="font-black text-sm" style={{ color:'var(--text-1)' }}>{best.symbol}</div>
                <div className="text-xs font-bold text-emerald-400">+{best.plPct.toFixed(2)}% total return</div>
              </div>
            </div>
            <div className="rounded-2xl p-4 border flex items-center gap-3"
              style={{ background:'rgba(239,68,68,.05)', borderColor:'rgba(239,68,68,.18)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background:'rgba(239,68,68,.12)' }}>
                <Flame size={16} className="text-red-400"/>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium mb-0.5" style={{ color:'var(--text-3)' }}>Worst Performer</div>
                <div className="font-black text-sm" style={{ color:'var(--text-1)' }}>{worst.symbol}</div>
                <div className={`text-xs font-bold ${worst.plPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {worst.plPct >= 0 ? '+' : ''}{worst.plPct.toFixed(2)}% total return
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Main grid: Chart + Trade Form ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Chart */}
        <div className="lg:col-span-2 card border" style={{ borderColor:'var(--border)' }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <BarChart2 size={14} style={{ color:'var(--accent)' }}/>
              <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Portfolio Performance</span>
            </div>
            <div className="flex gap-1">
              {['1D','1W','1M','3M','1Y','All'].map(r => (
                <button key={r} onClick={() => setChartRange(r)}
                  className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all"
                  style={chartRange === r
                    ? { background:`rgba(var(--accent-rgb),.12)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.2)` }
                    : { color:'var(--text-3)', border:'1px solid transparent' }
                  }>{r}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top:5, right:5, bottom:0, left:5 }}>
              <defs>
                <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={isUp?'#10b981':'#ef4444'} stopOpacity={0.18}/>
                  <stop offset="95%" stopColor={isUp?'#10b981':'#ef4444'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="date" tick={{ fontSize:10, fill:'var(--text-3)' }}
                interval={Math.floor(chartData.length/5)} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:'var(--text-3)' }} domain={['auto','auto']}
                axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={48}/>
              <Tooltip content={<ChartTip/>}/>
              <Area type="monotone" dataKey="value"
                stroke={isUp?'#10b981':'#ef4444'} strokeWidth={2.5} fill="url(#simGrad)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Trade form */}
        <div className="card border space-y-4" style={{ borderColor:'var(--border)' }}>
          <div className="flex items-center gap-2">
            <ShoppingCart size={14} style={{ color:'var(--accent)' }}/>
            <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Place Trade</span>
          </div>

          {/* Buy / Sell toggle */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor:'var(--border)' }}>
            {['buy','sell'].map(m => (
              <button key={m} onClick={() => { setTradeMode(m); setTradeError(''); setTradeSuccess('') }}
                className="flex-1 py-2 text-sm font-bold capitalize transition-all"
                style={tradeMode === m
                  ? m === 'buy'
                    ? { background:'rgba(16,185,129,.15)', color:'#10b981' }
                    : { background:'rgba(239,68,68,.15)', color:'#ef4444' }
                  : { color:'var(--text-3)', background:'var(--bg-1)' }
                }>{m}</button>
            ))}
          </div>

          {/* Stock search */}
          <TradeSearch onSelect={s => { setTradeStock(s); setQty(''); setTradeError(''); setTradeSuccess('') }}/>

          {/* Selected stock info */}
          {tradeStock && (
            <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
              className="rounded-xl p-3 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm" style={{ color:'var(--text-1)' }}>{tradeStock.symbol}</div>
                  <div className="text-xs truncate" style={{ color:'var(--text-3)' }}>{tradeStock.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm" style={{ color:'var(--text-1)' }}>
                    ${tradeStock.price.toFixed(2)}
                  </div>
                  <div className={`text-xs font-bold ${tradeStock.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tradeStock.changePct >= 0 ? '+' : ''}{tradeStock.changePct.toFixed(2)}%
                  </div>
                </div>
                <button onClick={resetForm} className="ml-2 p-1 rounded-lg hover:bg-white/5 transition-colors"
                  style={{ color:'var(--text-3)' }}>
                  <X size={13}/>
                </button>
              </div>
            </motion.div>
          )}

          {/* Shares input */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color:'var(--text-3)' }}>
              Shares
              {tradeStock && tradeMode === 'buy' && (
                <span className="ml-2 normal-case font-normal" style={{ color:'var(--text-3)' }}>
                  Max {maxShares.toLocaleString()}
                </span>
              )}
              {tradeStock && tradeMode === 'sell' && ownedShares > 0 && (
                <span className="ml-2 normal-case font-normal" style={{ color:'var(--text-3)' }}>
                  Own {ownedShares}
                </span>
              )}
            </div>
            <input type="number" min="1" step="1"
              className="input text-sm py-2.5 w-full font-mono"
              placeholder="Number of shares"
              value={qty}
              onChange={e => { setQty(e.target.value); setTradeError('') }}
              disabled={!tradeStock}
            />
          </div>

          {/* Cost preview */}
          {tradeStock && qty && !isNaN(parseInt(qty)) && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
              className="rounded-xl p-3 space-y-1.5 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
              <div className="flex justify-between text-xs">
                <span style={{ color:'var(--text-3)' }}>
                  {parseInt(qty)} share{parseInt(qty)!==1?'s':''} × ${tradeStock.price.toFixed(2)}
                </span>
                <span className="font-mono font-semibold" style={{ color:'var(--text-1)' }}>
                  ${tradeTotal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color:'var(--text-3)' }}>Cash after trade</span>
                <span className="font-mono font-semibold"
                  style={{ color: tradeMode==='buy' ? (tradeTotal>cash?'#ef4444':'#10b981') : '#10b981' }}>
                  ${Math.max(0, tradeMode==='buy' ? cash-tradeTotal : cash+tradeTotal).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                </span>
              </div>
            </motion.div>
          )}

          {/* Error / Success */}
          <AnimatePresence>
            {tradeError && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                className="rounded-xl px-3 py-2 text-xs font-medium border"
                style={{ background:'rgba(239,68,68,.08)', borderColor:'rgba(239,68,68,.2)', color:'#ef4444' }}>
                <AlertTriangle size={11} className="inline mr-1.5"/>{tradeError}
              </motion.div>
            )}
            {tradeSuccess && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                className="rounded-xl px-3 py-2 text-xs font-medium border"
                style={{ background:'rgba(16,185,129,.08)', borderColor:'rgba(16,185,129,.2)', color:'#10b981' }}>
                ✓ {tradeSuccess}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Confirm button */}
          <button onClick={executeTrade} disabled={!tradeStock || !qty}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            style={tradeMode === 'buy'
              ? { background:'rgba(16,185,129,.15)', color:'#10b981', border:'1px solid rgba(16,185,129,.3)' }
              : { background:'rgba(239,68,68,.15)', color:'#ef4444', border:'1px solid rgba(239,68,68,.3)' }
            }>
            {tradeMode === 'buy' ? 'Buy Shares' : 'Sell Shares'}
          </button>
        </div>
      </div>

      {/* ── Holdings table ── */}
      <div className="card border" style={{ borderColor:'var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} style={{ color:'var(--accent)' }}/>
          <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Holdings</span>
          <span className="text-xs px-1.5 py-0.5 rounded-md font-medium ml-1"
            style={{ background:'var(--bg-3)', color:'var(--text-3)' }}>{holdings.length}</span>
        </div>
        {holdings.length === 0 ? (
          <div className="text-center py-12" style={{ color:'var(--text-3)' }}>
            <TrendingUp size={32} className="mx-auto mb-3 opacity-20"/>
            <p className="text-sm">No holdings yet — place your first trade above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor:'var(--border)' }}>
                  {['Asset','Shares','Avg Cost','Current / Today','Value','P&L','Weight','Action'].map((h,i) => (
                    <th key={h} className={`th ${i===0?'text-left':'text-right'} ${['Weight','Action'].includes(h)?'hidden md:table-cell':''}`}>
                      {h}
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
      </div>

      {/* ── AI Coach + Trade History ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* AI Coach */}
        <div className="card border" style={{ borderColor:'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Brain size={14} style={{ color:'var(--accent)' }}/>
            <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>AI Coach</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-1"
              style={{ background:`rgba(var(--accent-rgb),.08)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.15)` }}>
              Powered by Foliyo AI
            </span>
          </div>
          <div className="space-y-3">
            {insights.map((ins, i) => {
              const cfg = INSIGHT_CFG[ins.type] || INSIGHT_CFG.info
              return (
                <motion.div key={i}
                  initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.07 }}
                  className="flex gap-3 rounded-xl p-3 border"
                  style={{ background:cfg.bg, borderColor:'var(--border)' }}>
                  <cfg.Icon size={14} className="shrink-0 mt-0.5" style={{ color:cfg.color }}/>
                  <p className="text-xs leading-relaxed" style={{ color:'var(--text-2)' }}>{ins.text}</p>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Trade history */}
        <div className="card border" style={{ borderColor:'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} style={{ color:'var(--accent)' }}/>
            <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Trade History</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md font-medium ml-1"
              style={{ background:'var(--bg-3)', color:'var(--text-3)' }}>{trades.length}</span>
          </div>
          {trades.length === 0 ? (
            <div className="text-center py-10" style={{ color:'var(--text-3)' }}>
              <Clock size={28} className="mx-auto mb-2 opacity-20"/>
              <p className="text-xs">No trades yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {trades.map(t => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border"
                  style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${t.type==='buy'?'bg-emerald-400/10':'bg-red-400/10'}`}>
                    {t.type === 'buy'
                      ? <ArrowDown size={12} className="text-emerald-400"/>
                      : <ArrowUp size={12} className="text-red-400"/>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs" style={{ color:'var(--text-1)' }}>{t.symbol}</span>
                      <span className={`text-xs font-semibold capitalize ${t.type==='buy'?'text-emerald-400':'text-red-400'}`}>{t.type}</span>
                    </div>
                    <div className="text-xs" style={{ color:'var(--text-3)' }}>
                      {t.shares} shares @ ${t.price.toFixed(2)} · {t.date}
                    </div>
                  </div>
                  <div className="text-xs font-mono font-semibold text-right shrink-0" style={{ color:'var(--text-2)' }}>
                    ${t.total.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl p-4 border text-xs" style={{ background:'var(--bg-2)', borderColor:'var(--border)', color:'var(--text-3)' }}>
        <AlertTriangle size={11} className="inline mr-1.5"/>
        <span className="font-semibold" style={{ color:'var(--text-2)' }}>Simulator Disclaimer:</span>{' '}
        This simulator uses virtual money for educational purposes only. It is not real trading or financial advice. All prices are simulated and may not reflect real-time market data.
      </div>
    </div>
  )
}
