import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, X } from 'lucide-react'
import { stocks } from '../data/mockData'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import { useHoldingsHistory } from '../hooks/useHoldingsHistory'
import PageHeader from '../components/PageHeader'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart as RPie, Pie, Cell } from 'recharts'
import { persist } from '../utils/userStore'

const COLORS = ['#e8a43e','#6fa3b8','#8fb38a','#d9805c','#d8c7a6','#c98a6b','#3f6f82']

/* ── localStorage ────────────────────────────────────────────── */
const KEY = 'foliyo_portfolio'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const save = d => persist(KEY, d)

/* ── Helpers ─────────────────────────────────────────────────── */
const tone = v => v >= 0 ? 'rgb(var(--up))' : 'rgb(var(--down))'
const money = (v, d = 2) => v.toLocaleString('en-US', { minimumFractionDigits:d, maximumFractionDigits:d })
const signedMoney = v => `${v >= 0 ? '+' : '-'}$${money(Math.abs(v))}`
const signedPct = v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`

/* ── Tooltip ─────────────────────────────────────────────────── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs border" style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
      <p style={{ color:'var(--text-3)' }}>{label}</p>
      <p className="font-bold num" style={{ color:'var(--text-1)' }}>
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
      style={{ background:'rgba(17,18,21,0.45)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        role="dialog" aria-modal="true" aria-labelledby="add-position-title"
        initial={{ scale:0.97, y:16 }} animate={{ scale:1, y:0 }} exit={{ scale:0.97, y:16 }}
        className="w-full max-w-md rounded-[14px] border p-6 relative"
        style={{ background:'var(--bg-2)', borderColor:'var(--border)', boxShadow:'0 20px 50px rgba(var(--shadow-color), 0.18)' }}>
        <button onClick={onClose} aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--border)]"
          style={{ color:'var(--text-2)', background:'var(--bg-3)' }}>
          <X size={14}/>
        </button>
        <h2 id="add-position-title" className="text-[1.5rem] font-bold mb-5" style={{ color:'var(--text-1)' }}>Add position</h2>

        {/* Stock search */}
        <div className="relative mb-4">
          <label htmlFor="pf-stock" className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text-3)' }}>Stock</label>
          <div className="relative">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'var(--text-3)' }}/>
            <input id="pf-stock" className="input pl-9 w-full" placeholder="Search ticker or company…"
              autoComplete="off"
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(null) }}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 180)}/>
          </div>
          <AnimatePresence>
            {focused && results.length > 0 && (
              <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                className="absolute z-50 w-full mt-1 rounded-[10px] border overflow-hidden"
                style={{ background:'var(--bg-2)', borderColor:'var(--border-light)', boxShadow:'0 8px 24px rgba(var(--shadow-color), 0.12)' }}>
                {results.map((s, i) => (
                  <button key={s.symbol} onMouseDown={() => handleSelect(s)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--bg-1)] transition-colors"
                    style={{ borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold" style={{ color:'var(--link)' }}>{s.symbol}</div>
                      <div className="text-xs truncate" style={{ color:'var(--text-3)' }}>{s.name}</div>
                    </div>
                    <span className="text-sm num font-semibold" style={{ color: s.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
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
            <label htmlFor="pf-shares" className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text-3)' }}>Shares</label>
            <input id="pf-shares" className="input w-full" type="number" placeholder="0" min="0" step="1"
              value={shares} onChange={e => setShares(e.target.value)}/>
          </div>
          <div>
            <label htmlFor="pf-cost" className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text-3)' }}>Avg cost / share</label>
            <input id="pf-cost" className="input w-full" type="number" placeholder="0.00" min="0" step="0.01"
              value={avgCost} onChange={e => setAvgCost(e.target.value)}/>
          </div>
        </div>

        {/* Preview */}
        {estValue !== null && (
          <dl className="grid grid-cols-2 gap-3 py-3 mb-4 border-y text-xs" style={{ borderColor:'var(--border)' }}>
            <div>
              <dt style={{ color:'var(--text-3)' }}>Market value</dt>
              <dd className="font-bold num text-base mt-0.5" style={{ color:'var(--text-1)' }}>
                ${estValue.toLocaleString('en-US', { minimumFractionDigits:2 })}
              </dd>
            </div>
            <div>
              <dt style={{ color:'var(--text-3)' }}>Unrealized P&amp;L</dt>
              <dd className="font-bold num text-base mt-0.5" style={{ color: tone(estReturn) }}>
                {estReturn >= 0 ? '+' : ''}${estReturn.toFixed(2)}
              </dd>
            </div>
          </dl>
        )}

        {err && <p className="text-xs mb-3" role="alert" style={{ color:'rgb(var(--down))' }}>{err}</p>}

        <button onClick={handleSubmit}
          className="btn-primary w-full justify-center py-3">
          <Plus size={14}/> Add to portfolio
        </button>
      </motion.div>
    </motion.div>
  )
}

/* ── Main page ───────────────────────────────────────────────── */
export default function Portfolio() {
  const [saved, setHoldings]   = useState(load)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { save(saved) }, [saved])

  // Value positions at live prices; fall back to the price saved with the position
  const { quotes: liveQuotes } = useBatchQuotes(saved.map(h => h.symbol), 60_000)
  const holdings = saved.map(h => liveQuotes[h.symbol]?.price != null
    ? { ...h, currentPrice: liveQuotes[h.symbol].price, live: true }
    : { ...h, live: false })

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


  const sectorMap = {}
  holdings.forEach(h => { sectorMap[h.sector] = (sectorMap[h.sector] || 0) + h.shares * h.currentPrice })
  const sectorData = Object.entries(sectorMap).map(([name, value]) => ({
    name, value: parseFloat(((value / (totalValue || 1)) * 100).toFixed(1))
  }))

  const winning = holdings.filter(h => h.shares * h.currentPrice > h.shares * h.avgCost).length
  const stats = [
    { label:'Total value',     value: totalValue > 0 ? `$${money(totalValue)}` : '—' },
    { label:'Total gain/loss', value: signedMoney(totalGain), sub: signedPct(totalGainPct), c: tone(totalGain) },
    { label:'Cost basis',      value: totalCost > 0 ? `$${money(totalCost)}` : '—' },
    { label:'Positions',       value: String(holdings.length), sub: `${winning} in profit` },
  ]

  const [histRange, setHistRange] = useState('6M')
  const { data: history, loading: historyLoading, missing: historyMissing } = useHoldingsHistory(saved, histRange)
  const histUp = history.length > 1 && history.at(-1).value >= history[0].value

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 page-enter">

      {/* ── Modal ── */}
      <AnimatePresence>
        {showModal && (
          <AddPositionModal
            onAdd={addHolding}
            onClose={() => setShowModal(false)}
            existing={holdings.map(h => h.symbol)}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <PageHeader title="Portfolio" subtitle="Track and manage your investment holdings" className="mb-6">
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={14}/> Add position
        </button>
      </PageHeader>

      {holdings.length === 0 ? (
        /* ── Empty state ── */
        <div className="border-y py-12" style={{ borderColor:'var(--border)' }}>
          <h2 className="text-[1.5rem] font-bold mb-2" style={{ color:'var(--text-1)' }}>Add your first position</h2>
          <p className="text-sm mb-6 max-w-md" style={{ color:'var(--text-2)' }}>
            Log a stock with its share count and average cost to see value, gain or loss, and allocation. Or practise in the Simulator with virtual money.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={14}/> Add position
            </button>
            <Link to="/simulator" className="btn-ghost">Try the Simulator</Link>
          </div>
        </div>
      ) : (
        <>
          {/* ── Summary stats ── */}
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5 pb-6 mb-8 border-b" style={{ borderColor:'var(--border)' }}>
            {stats.map(s => (
              <div key={s.label} className="min-w-0">
                <dt className="text-xs mb-1" style={{ color:'var(--text-3)' }}>{s.label}</dt>
                <dd className="text-[1.6rem] sm:text-[2rem] font-bold num leading-tight truncate" style={{ color: s.c || 'var(--text-1)' }}>{s.value}</dd>
                {s.sub && <div className="text-sm num font-semibold mt-0.5" style={{ color: s.c || 'var(--text-3)' }}>{s.sub}</div>}
              </div>
            ))}
          </dl>

          {/* ── Holdings table ── */}
          <section className="mb-10" aria-label="Holdings">
            <h2 className="section-title mb-1">Holdings</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b" style={{ borderColor:'var(--border)' }}>
                    {['Symbol','Shares','Avg cost','Last price','Market value','Gain/loss','Gain/loss %','Allocation'].map((h, i) => (
                      <th key={h} scope="col" className={`th whitespace-nowrap ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                    <th scope="col" className="th w-12"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map(h => {
                    const value    = h.shares * h.currentPrice
                    const cost     = h.shares * h.avgCost
                    const gainLoss = value - cost
                    const gainPct  = ((gainLoss / cost) * 100)
                    const alloc    = (value / totalValue) * 100
                    return (
                      <tr key={h.symbol} className="asset-row border-b" style={{ borderColor:'var(--border)' }}>
                        <td className="td">
                          <Link to={`/stock/${h.symbol}`} className="link font-bold">{h.symbol}</Link>
                          <div className="text-xs truncate max-w-[200px]" style={{ color:'var(--text-3)' }}>{h.name}</div>
                        </td>
                        <td className="td text-right num whitespace-nowrap" style={{ color:'var(--text-2)' }}>{h.shares}</td>
                        <td className="td text-right num whitespace-nowrap" style={{ color:'var(--text-2)' }}>${h.avgCost.toFixed(2)}</td>
                        <td className="td text-right num whitespace-nowrap font-semibold">${h.currentPrice.toFixed(2)}</td>
                        <td className="td text-right num whitespace-nowrap font-semibold">${money(value)}</td>
                        <td className="td text-right num whitespace-nowrap" style={{ color: tone(gainLoss) }}>{signedMoney(gainLoss)}</td>
                        <td className="td text-right num whitespace-nowrap font-semibold" style={{ color: tone(gainPct) }}>{signedPct(gainPct)}</td>
                        <td className="td text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background:'var(--bg-3)' }}>
                              <div className="h-1 rounded-full" style={{ width:`${Math.min(alloc, 100)}%`, background:'var(--text-3)' }}/>
                            </div>
                            <span className="num text-xs w-10 text-right" style={{ color:'var(--text-2)' }}>{alloc.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="td text-right">
                          <button onClick={() => removeHolding(h.symbol)} aria-label={`Remove ${h.symbol}`}
                            className="w-7 h-7 rounded-full inline-flex items-center justify-center transition-colors hover:bg-[var(--bg-3)]"
                            style={{ color:'var(--text-3)' }}>
                            <X size={13}/>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="td text-xs" style={{ color:'var(--text-3)' }}>
                      {holdings.length} position{holdings.length !== 1 ? 's' : ''}
                    </td>
                    <td colSpan={3} className="td text-right text-xs" style={{ color:'var(--text-3)' }}>Total</td>
                    <td className="td text-right num font-bold whitespace-nowrap">${money(totalValue)}</td>
                    <td className="td text-right num font-bold whitespace-nowrap" style={{ color: tone(totalGain) }}>{signedMoney(totalGain)}</td>
                    <td className="td text-right num font-bold whitespace-nowrap" style={{ color: tone(totalGainPct) }}>{signedPct(totalGainPct)}</td>
                    <td colSpan={2}/>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-xs mt-3" style={{ color:'var(--text-3)' }}>
              Last price is live where a quote is available; otherwise it is the price saved when the position was added.
            </p>
          </section>

          {/* ── Performance + allocation ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-x-10 gap-y-10">
            <section aria-label="Holdings value history">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 className="section-title">Value of these holdings</h2>
                <div className="flex gap-1" role="group" aria-label="History range">
                  {['1M','6M','1Y'].map(r => (
                    <button key={r} onClick={() => setHistRange(r)} aria-pressed={histRange === r}
                      className="text-xs px-3 py-1.5 rounded-full font-semibold transition-colors"
                      style={histRange === r ? { background:'var(--btn-bg)', color:'var(--btn-fg)' } : { color:'var(--text-2)' }}>{r}</button>
                  ))}
                </div>
              </div>
              {historyLoading && !history.length ? (
                <div className="h-[220px] rounded-lg shimmer" />
              ) : history.length > 1 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={history} margin={{ top:5, right:5, bottom:0, left:5 }}>
                    <defs>
                      <linearGradient id="holdGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={histUp ? 'rgb(var(--up))' : 'rgb(var(--down))'} stopOpacity={0.14}/>
                        <stop offset="95%" stopColor={histUp ? 'rgb(var(--up))' : 'rgb(var(--down))'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" vertical={false}/>
                    <XAxis dataKey="date" tick={{ fontSize:11, fill:'var(--text-3)' }} interval={Math.max(0, Math.floor(history.length / 5))} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:11, fill:'var(--text-3)' }} domain={['auto','auto']} axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${v.toFixed(0)}`} width={52}/>
                    <Tooltip content={<ChartTip/>}/>
                    <Area type="monotone" dataKey="value" stroke={histUp ? 'rgb(var(--up))' : 'rgb(var(--down))'} strokeWidth={1.75} fill="url(#holdGrad)"/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="h-[120px] flex items-center text-sm" style={{ color:'var(--text-3)' }}>Price history isn’t available right now. Try again in a minute.</p>
              )}
              <p className="text-xs mt-2" style={{ color:'var(--text-3)' }}>
                Each day’s real closing prices × the shares you hold today — how this mix has moved, not a record of when you bought.
                {historyMissing.length > 0 && ` Not included (no price history): ${historyMissing.join(', ')}.`}
              </p>
            </section>

            <section aria-label="Sector allocation">
              <h2 className="section-title mb-3">Allocation</h2>
              <ResponsiveContainer width="100%" height={140}>
                <RPie>
                  <Pie data={sectorData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={2} dataKey="value" stroke="none">
                    {sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={v => [`${v}%`, 'Allocation']}
                    contentStyle={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8, fontSize:11 }}/>
                </RPie>
              </ResponsiveContainer>
              <ul className="mt-2">
                {sectorData.map((s, i) => (
                  <li key={s.name} className="flex items-center justify-between text-sm py-2 border-t" style={{ borderColor:'var(--border)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background:COLORS[i % COLORS.length] }}/>
                      <span className="truncate" style={{ color:'var(--text-2)' }}>{s.name}</span>
                    </div>
                    <span className="num font-semibold" style={{ color:'var(--text-1)' }}>{s.value}%</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
