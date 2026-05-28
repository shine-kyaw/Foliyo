import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, TrendingUp, DollarSign, PieChart, Plus, Search, X, Cpu } from 'lucide-react'
import { stocks } from '../data/mockData'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart as RPie, Pie, Cell } from 'recharts'

const COLORS = ['#06b6d4','#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6']

/* ── localStorage ────────────────────────────────────────────── */
const KEY = 'foliyo_portfolio'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const save = d => localStorage.setItem(KEY, JSON.stringify(d))

/* ── Deterministic portfolio history ─────────────────────────── */
function buildHistory(holdings, days = 180) {
  if (!holdings.length) return []
  const totalCost  = holdings.reduce((s, h) => s + h.shares * h.avgCost, 0)
  const totalValue = holdings.reduce((s, h) => s + h.shares * (h.currentPrice || h.avgCost), 0)
  const endVal     = totalValue
  const startVal   = totalCost * 0.97  // slight discount at start
  const data = []
  const now = new Date()
  const returnAmt = endVal - startVal
  const hasReturn = Math.abs(returnAmt) > startVal * 0.001
  const noiseMag = hasReturn ? Math.abs(returnAmt) * 0.18 : 0

  for (let i = days; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    const t = (days - i) / days
    const seed = i * 1.37
    const noise = Math.sin(seed) * noiseMag * 0.7 + Math.cos(seed * 1.6) * noiseMag * 0.3
    const v = startVal + returnAmt * t + noise
    data.push({
      date: d.toLocaleDateString('en-US', { month:'short', day:'numeric' }),
      value: parseFloat(Math.max(v, startVal * 0.85).toFixed(2)),
    })
  }
  return data
}

/* ── Tooltip ─────────────────────────────────────────────────── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 text-xs border" style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
      <p style={{ color:'var(--text-3)' }}>{label}</p>
      <p className="font-bold font-mono" style={{ color:'var(--text-1)' }}>
        ${payload[0]?.value?.toLocaleString('en-US', { minimumFractionDigits:2 })}
      </p>
    </div>
  )
}

/* ── Add Position Modal ──────────────────────────────────────── */
function AddPositionModal({ onAdd, onClose, existing }) {
  const [query, setQuery]   = useState('')
  const [focused, setFocused] = useState(false)
  const [selected, setSelected] = useState(null)
  const [shares, setShares] = useState('')
  const [avgCost, setAvgCost] = useState('')
  const [err, setErr]       = useState('')

  const baseResults = query.trim().length > 0
    ? stocks.filter(s =>
        !existing.includes(s.symbol) &&
        (s.symbol.toLowerCase().includes(query.toLowerCase()) ||
         s.name.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 6)
    : []

  const { quotes } = useBatchQuotes(baseResults.map(s => s.symbol), 0)
  const results = baseResults.map(s => {
    const q = quotes[s.symbol]
    return q
      ? { ...s, price: q.price, change: q.change, changePct: q.changePct }
      : { ...s, price: null, change: null, changePct: null }
  })

  const handleSelect = s => {
    setSelected(s)
    setQuery(s.symbol)
    if (s.price != null) setAvgCost(s.price.toFixed(2))
    setFocused(false)
  }

  const handleSubmit = () => {
    if (!selected) { setErr('Select a stock first.'); return }
    const sh = parseFloat(shares)
    const ac = parseFloat(avgCost)
    if (!sh || sh <= 0) { setErr('Enter a valid share quantity.'); return }
    if (!ac || ac <= 0) { setErr('Enter a valid average cost.'); return }
    onAdd({ symbol: selected.symbol, name: selected.name, sector: selected.sector || 'Other',
            shares: sh, avgCost: ac, currentPrice: selected.price ?? ac })
    onClose()
  }

  const estValue  = selected && shares && avgCost && selected.price != null ? parseFloat(shares) * selected.price : null
  const estReturn = estValue && avgCost ? estValue - parseFloat(shares) * parseFloat(avgCost) : null

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.6)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ scale:0.94, y:24 }} animate={{ scale:1, y:0 }} exit={{ scale:0.94, y:24 }}
        className="w-full max-w-md rounded-2xl border p-6 relative"
        style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
        <button onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ color:'var(--text-3)', background:'var(--bg-3)' }}>
          <X size={14}/>
        </button>
        <h2 className="text-base font-black mb-5" style={{ color:'var(--text-1)' }}>Add Position</h2>

        {/* Stock search */}
        <div className="relative mb-4">
          <label className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text-3)' }}>Stock</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-3)' }}/>
            <input className="input pl-9 w-full" placeholder="Search ticker or company…"
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(null) }}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 180)}/>
          </div>
          <AnimatePresence>
            {focused && results.length > 0 && (
              <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                className="absolute z-50 w-full mt-1 rounded-xl border shadow-xl overflow-hidden"
                style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
                {results.map(s => (
                  <button key={s.symbol} onMouseDown={() => handleSelect(s)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
                    style={{ borderBottom:'1px solid var(--border)' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                      style={{ background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)' }}>
                      {s.symbol.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold" style={{ color:'var(--text-1)' }}>{s.symbol}</div>
                      <div className="text-xs truncate" style={{ color:'var(--text-3)' }}>{s.name}</div>
                    </div>
                    <span className="text-sm font-mono font-semibold" style={{ color: s.price != null ? 'var(--text-2)' : 'var(--text-3)' }}>
                      {s.price != null ? `$${s.price.toFixed(2)}` : '—'}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text-3)' }}>Shares</label>
            <input className="input w-full" type="number" placeholder="0" min="0" step="1"
              value={shares} onChange={e => setShares(e.target.value)}/>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text-3)' }}>Avg Cost / Share</label>
            <input className="input w-full" type="number" placeholder="0.00" min="0" step="0.01"
              value={avgCost} onChange={e => setAvgCost(e.target.value)}/>
          </div>
        </div>

        {/* Preview */}
        {estValue !== null && (
          <div className="rounded-xl p-3 mb-4 grid grid-cols-2 gap-3 text-xs"
            style={{ background:'var(--bg-3)' }}>
            <div>
              <div style={{ color:'var(--text-3)' }}>Current Value</div>
              <div className="font-black font-mono text-sm mt-0.5" style={{ color:'var(--text-1)' }}>
                ${estValue.toLocaleString('en-US', { minimumFractionDigits:2 })}
              </div>
            </div>
            <div>
              <div style={{ color:'var(--text-3)' }}>Unrealized P&L</div>
              <div className={`font-black font-mono text-sm mt-0.5 ${estReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {estReturn >= 0 ? '+' : ''}${estReturn.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {err && <p className="text-xs text-red-400 mb-3">{err}</p>}

        <button onClick={handleSubmit}
          className="btn-primary w-full justify-center py-3">
          <Plus size={14}/> Add to Portfolio
        </button>
      </motion.div>
    </motion.div>
  )
}

/* ── Main page ───────────────────────────────────────────────── */
export default function Portfolio() {
  const [holdings, setHoldings] = useState(load)
  const [range, setRange]       = useState('6M')
  const [tab, setTab]           = useState('holdings')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { save(holdings) }, [holdings])

  const addHolding = h => {
    setHoldings(prev => {
      const existing = prev.find(x => x.symbol === h.symbol)
      if (existing) {
        // Merge: recalculate average cost
        const totalShares = existing.shares + h.shares
        const totalCost = existing.shares * existing.avgCost + h.shares * h.avgCost
        return prev.map(x => x.symbol === h.symbol
          ? { ...x, shares: totalShares, avgCost: totalCost / totalShares, currentPrice: h.currentPrice }
          : x)
      }
      return [...prev, h]
    })
  }

  const removeHolding = symbol => setHoldings(prev => prev.filter(h => h.symbol !== symbol))

  const totalValue   = holdings.reduce((s, h) => s + h.shares * h.currentPrice, 0)
  const totalCost    = holdings.reduce((s, h) => s + h.shares * h.avgCost, 0)
  const totalGain    = totalValue - totalCost
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

  const sliceMap = { '1M':30, '3M':90, '6M':180, '1Y':365 }
  const history  = buildHistory(holdings, 180)
  const histSlice = history.slice(-sliceMap[range])

  const sectorMap = {}
  holdings.forEach(h => { sectorMap[h.sector] = (sectorMap[h.sector] || 0) + h.shares * h.currentPrice })
  const sectorData = Object.entries(sectorMap).map(([name, value]) => ({
    name, value: parseFloat(((value / (totalValue || 1)) * 100).toFixed(1))
  }))

  const summaryCards = [
    { label:'Portfolio Value', value: totalValue > 0 ? `$${totalValue.toLocaleString('en-US',{minimumFractionDigits:2})}` : '—',
      sub:'Total market value', icon:DollarSign, c:'var(--accent)', bg:`rgba(var(--accent-rgb),.1)` },
    { label:'Total Return',
      value: totalGain >= 0 ? `+$${totalGain.toLocaleString('en-US',{minimumFractionDigits:2})}` : `-$${Math.abs(totalGain).toLocaleString('en-US',{minimumFractionDigits:2})}`,
      sub: `${totalGainPct >= 0 ? '+' : ''}${totalGainPct.toFixed(2)}% all time`,
      icon:TrendingUp, c: totalGain >= 0 ? '#10b981' : '#ef4444',
      bg: totalGain >= 0 ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)' },
    { label:'Cost Basis', value: totalCost > 0 ? `$${totalCost.toLocaleString('en-US',{minimumFractionDigits:2})}` : '—',
      sub:'Total invested', icon:Briefcase, c:'#3b82f6', bg:'rgba(59,130,246,.1)' },
    { label:'Positions', value: holdings.length,
      sub: `${holdings.filter(h => h.shares * h.currentPrice > h.shares * h.avgCost).length} winning`,
      icon:PieChart, c:'#8b5cf6', bg:'rgba(139,92,246,.1)' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-5 page-enter">

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <AddPositionModal
            onAdd={addHolding}
            onClose={() => setShowModal(false)}
            existing={holdings.map(h => h.symbol)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2.5" style={{ color:'var(--text-1)' }}>
            <Briefcase size={22} style={{ color:'var(--accent)' }}/>
            Portfolio
          </h1>
          <p className="text-sm mt-0.5" style={{ color:'var(--text-3)' }}>Track and manage your investment holdings</p>
        </div>
        <button className="btn-primary text-sm py-2.5" onClick={() => setShowModal(true)}>
          <Plus size={14}/> Add Position
        </button>
      </div>

      {holdings.length === 0 ? (
        /* ── Empty state ── */
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          className="rounded-2xl border p-16 text-center"
          style={{ background:'var(--bg-2)', borderColor:'var(--border)', borderStyle:'dashed' }}>
          <Briefcase size={44} className="mx-auto mb-4 opacity-20" style={{ color:'var(--text-3)' }}/>
          <h3 className="text-lg font-black mb-2" style={{ color:'var(--text-1)' }}>No portfolio holdings yet</h3>
          <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color:'var(--text-3)' }}>
            Add your stock positions manually, or use the Simulator to practice trading with virtual money.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button className="btn-primary py-2.5" onClick={() => setShowModal(true)}>
              <Plus size={14}/> Add Position
            </button>
            <Link to="/simulator"
              className="btn-ghost py-2.5 flex items-center gap-2 text-sm font-semibold">
              <Cpu size={14}/> Try Simulator
            </Link>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map((c, i) => (
              <motion.div key={c.label} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.07 }}
                className="card border flex items-center gap-4" style={{ borderColor:'var(--border)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background:c.bg }}>
                  <c.icon size={18} style={{ color:c.c }}/>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color:'var(--text-3)' }}>{c.label}</div>
                  <div className="text-lg font-black font-mono truncate" style={{ color:'var(--text-1)' }}>{c.value}</div>
                  <div className="text-xs" style={{ color:'var(--text-3)' }}>{c.sub}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Chart + Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card border lg:col-span-2" style={{ borderColor:'var(--border)' }}>
              <div className="flex items-center justify-between mb-5">
                <span className="font-bold text-sm" style={{ color:'var(--text-1)' }}>Performance</span>
                <div className="flex gap-1">
                  {['1M','3M','6M','1Y'].map(r => (
                    <button key={r} onClick={() => setRange(r)}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all"
                      style={range === r
                        ? { background:`rgba(var(--accent-rgb),.12)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.2)` }
                        : { color:'var(--text-3)', border:'1px solid transparent' }
                      }>{r}</button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={histSlice}>
                  <defs>
                    <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:'var(--text-3)' }}
                    interval={Math.floor(histSlice.length / 5)} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:10, fill:'var(--text-3)' }}
                    tickFormatter={v => `$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}
                    domain={['auto','auto']} width={44}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} fill="url(#portGrad)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card border" style={{ borderColor:'var(--border)' }}>
              <div className="font-bold text-sm mb-4" style={{ color:'var(--text-1)' }}>Sector Allocation</div>
              <ResponsiveContainer width="100%" height={160}>
                <RPie>
                  <Pie data={sectorData} cx="50%" cy="50%" innerRadius={46} outerRadius={72} paddingAngle={3} dataKey="value">
                    {sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={v => [`${v}%`, 'Allocation']}
                    contentStyle={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:10, fontSize:11 }}/>
                </RPie>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {sectorData.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background:COLORS[i % COLORS.length] }}/>
                      <span style={{ color:'var(--text-2)' }}>{s.name}</span>
                    </div>
                    <span className="font-mono font-semibold" style={{ color:'var(--text-1)' }}>{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Holdings Table */}
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor:'var(--border)' }}>
            <div className="px-5 py-3.5 border-b flex items-center gap-2"
              style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
              {['holdings','performance'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className="text-xs px-4 py-2 rounded-xl font-semibold capitalize transition-all"
                  style={tab === t
                    ? { background:`rgba(var(--accent-rgb),.12)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.2)` }
                    : { color:'var(--text-3)' }
                  }>{t}</button>
              ))}
            </div>
            <div className="overflow-x-auto" style={{ background:'var(--bg-1)' }}>
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor:'var(--border)', background:'var(--bg-2)' }}>
                    {['Stock','Shares','Avg Cost','Current','Value','Gain/Loss','Alloc',''].map((h, i) => (
                      <th key={i} className={`th ${i === 0 ? 'text-left' : 'text-right'} ${['Shares','Avg Cost'].includes(h) ? 'hidden sm:table-cell' : ''} ${h === 'Alloc' ? 'hidden md:table-cell' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h, i) => {
                    const value    = h.shares * h.currentPrice
                    const cost     = h.shares * h.avgCost
                    const gainLoss = value - cost
                    const gainPct  = ((gainLoss / cost) * 100)
                    const alloc    = (value / totalValue) * 100
                    return (
                      <motion.tr key={h.symbol} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.04 }}
                        className="tr border-b" style={{ borderColor:'var(--border)' }}>
                        <td className="td">
                          <Link to={`/stock/${h.symbol}`} className="flex items-center gap-3 group">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
                              style={{ background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.18)` }}>
                              {h.symbol.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-sm" style={{ color:'var(--text-1)' }}>{h.symbol}</div>
                              <div className="text-xs hidden sm:block" style={{ color:'var(--text-3)' }}>{h.name}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="td text-right hidden sm:table-cell">
                          <span className="font-mono text-sm" style={{ color:'var(--text-2)' }}>{h.shares}</span>
                        </td>
                        <td className="td text-right hidden sm:table-cell">
                          <span className="font-mono text-sm" style={{ color:'var(--text-2)' }}>${h.avgCost.toFixed(2)}</span>
                        </td>
                        <td className="td text-right">
                          <span className="font-mono font-bold text-sm" style={{ color:'var(--text-1)' }}>${h.currentPrice.toFixed(2)}</span>
                        </td>
                        <td className="td text-right">
                          <span className="font-mono font-bold text-sm" style={{ color:'var(--text-1)' }}>
                            ${value.toLocaleString('en-US', { minimumFractionDigits:2 })}
                          </span>
                        </td>
                        <td className="td text-right">
                          <div className={`font-mono font-bold text-sm ${gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {gainLoss >= 0 ? '+' : '-'}${Math.abs(gainLoss).toFixed(2)}
                          </div>
                          <div className={`text-xs ${gainPct >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                            {gainPct >= 0 ? '+' : ''}{gainPct.toFixed(2)}%
                          </div>
                        </td>
                        <td className="td text-right hidden md:table-cell">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background:'var(--bg-3)' }}>
                              <div className="h-1.5 rounded-full" style={{ width:`${Math.min(alloc, 100)}%`, background:'var(--accent)' }}/>
                            </div>
                            <span className="font-mono text-xs w-8 text-right" style={{ color:'var(--text-3)' }}>{alloc.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="td text-right">
                          <button onClick={() => removeHolding(h.symbol)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center ml-auto transition-colors hover:bg-red-400/10"
                            style={{ color:'var(--text-3)' }}>
                            <X size={12}/>
                          </button>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3.5 flex items-center justify-between"
              style={{ background:'var(--bg-2)', borderTop:`1px solid var(--border)` }}>
              <span className="text-xs" style={{ color:'var(--text-3)' }}>{holdings.length} position{holdings.length !== 1 ? 's' : ''}</span>
              <div className="flex items-center gap-4">
                <span className="text-xs" style={{ color:'var(--text-3)' }}>Total</span>
                <span className="font-black font-mono text-sm" style={{ color:'var(--text-1)' }}>
                  ${totalValue.toLocaleString('en-US', { minimumFractionDigits:2 })}
                </span>
                <span className={`font-black text-sm ${totalGainPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {totalGainPct >= 0 ? '+' : ''}{totalGainPct.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
