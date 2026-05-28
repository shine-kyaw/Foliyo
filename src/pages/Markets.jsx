import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, TrendingUp, TrendingDown, BarChart2, Filter, Flame, Activity, Wifi } from 'lucide-react'
import { stocks as baseStocks, indices, sectorPerformance } from '../data/mockData'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import { fmtPrice, fmtPct, fmtChange, changeColor } from '../utils/formatLive'

const SECTORS = ['All','Technology','Healthcare','Financials','Cons. Disc.','Communication','Energy']

export default function Markets() {
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('All')
  const [sortBy, setSortBy] = useState('mktCap')

  /* Live prices for every stock in our universe */
  const symbols = useMemo(() => baseStocks.map(s => s.symbol), [])
  const { quotes, lastUpdated } = useBatchQuotes(symbols, 60_000)
  const isLive = Object.keys(quotes).length > 0

  /* Overlay live prices — null out mock values so we never show stale numbers */
  const stocks = useMemo(() => baseStocks.map(s => {
    const q = quotes[s.symbol]
    return q
      ? { ...s, price: q.price, change: q.change, changePct: q.changePct }
      : { ...s, price: null, change: null, changePct: null }
  }), [quotes])

  const filtered = stocks
    .filter(s =>
      (sector === 'All' || s.sector === sector) &&
      (s.symbol.toLowerCase().includes(search.toLowerCase()) ||
       s.name.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) =>
      sortBy === 'changePct' ? (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity) :
      sortBy === 'price'     ? (b.price ?? -Infinity) - (a.price ?? -Infinity) : 0
    )

  /* Only rank stocks with live data so we never show "Top Gainers" with mock pcts */
  const ranked = stocks.filter(s => s.changePct != null)
  const gainers = [...ranked].sort((a,b) => b.changePct - a.changePct).slice(0,5)
  const losers  = [...ranked].sort((a,b) => a.changePct - b.changePct).slice(0,5)
  const mostActive = [...ranked].sort((a,b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0,4)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 page-enter">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2.5" style={{ color:'var(--text-1)' }}>
            <BarChart2 size={21} style={{ color:'var(--accent)' }}/>
            Markets
          </h1>
          <p className="text-sm mt-0.5" style={{ color:'var(--text-3)' }}>
            Global equities across US, EU, and Asia Pacific
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isLive && (
            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
              style={{ color:'var(--accent)', background:'rgba(var(--accent-rgb),.08)', border:'1px solid rgba(var(--accent-rgb),.18)' }}>
              <Wifi size={11}/> Live · Finnhub
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
            style={{ color:'#10b981', background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.18)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
            Market Open
          </div>
        </div>
      </div>

      {/* ── Index cards ── */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {indices.slice(0,6).map((idx, i) => (
          <motion.div
            key={idx.name}
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
            transition={{ delay: i * 0.05 }}
            className="idx-card"
          >
            <div className="section-label mb-1.5 truncate">{idx.name}</div>
            <div className="font-black font-mono text-base tracking-tight" style={{ color:'var(--text-1)' }}>
              {idx.value}
            </div>
            <div className={`text-xs font-bold mt-0.5 ${idx.up ? 'text-emerald-400' : 'text-red-400'}`}>
              {idx.change}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Movers + Sector ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Gainers */}
        <div className="card-flat rounded-2xl overflow-hidden border" style={{ borderColor:'var(--border)', padding:0 }}>
          <div className="px-4 py-3 border-b flex items-center gap-2"
            style={{ borderColor:'var(--border)', background:'var(--bg-2)' }}>
            <TrendingUp size={14} className="text-emerald-400"/>
            <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Top Gainers</span>
          </div>
          <div style={{ background:'var(--bg-1)' }}>
            {gainers.map((s, i) => (
              <Link key={s.symbol} to={`/stock/${s.symbol}`}
                className="flex items-center justify-between px-4 py-2.5 border-b transition-colors hover:bg-emerald-400/5 group"
                style={{ borderColor:'var(--border)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                    style={{ background:'rgba(16,185,129,.1)', color:'#10b981' }}>
                    {s.symbol.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold group-hover:text-emerald-400 transition-colors"
                      style={{ color:'var(--text-1)' }}>{s.symbol}</div>
                    <div className="text-xs truncate max-w-[110px]" style={{ color:'var(--text-3)' }}>{s.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-semibold" style={{ color:'var(--text-1)' }}>
                    {fmtPrice(s.price)}
                  </div>
                  <span className="badge-green text-xs">{fmtPct(s.changePct)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Losers */}
        <div className="card-flat rounded-2xl overflow-hidden border" style={{ borderColor:'var(--border)', padding:0 }}>
          <div className="px-4 py-3 border-b flex items-center gap-2"
            style={{ borderColor:'var(--border)', background:'var(--bg-2)' }}>
            <TrendingDown size={14} className="text-red-400"/>
            <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Top Losers</span>
          </div>
          <div style={{ background:'var(--bg-1)' }}>
            {losers.map((s, i) => (
              <Link key={s.symbol} to={`/stock/${s.symbol}`}
                className="flex items-center justify-between px-4 py-2.5 border-b transition-colors hover:bg-red-400/5 group"
                style={{ borderColor:'var(--border)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                    style={{ background:'rgba(239,68,68,.1)', color:'#ef4444' }}>
                    {s.symbol.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold group-hover:text-red-400 transition-colors"
                      style={{ color:'var(--text-1)' }}>{s.symbol}</div>
                    <div className="text-xs truncate max-w-[110px]" style={{ color:'var(--text-3)' }}>{s.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-semibold" style={{ color:'var(--text-1)' }}>
                    {fmtPrice(s.price)}
                  </div>
                  <span className="badge-red text-xs">{fmtPct(s.changePct)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Sector Performance */}
        <div className="card border" style={{ borderColor:'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} style={{ color:'var(--accent)' }}/>
            <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Sector Performance</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sectorPerformance} layout="vertical" margin={{ left:0, right:28 }}>
              <XAxis type="number" tick={{ fontSize:10, fill:'var(--text-3)' }}
                tickFormatter={v=>`${v>0?'+':''}${v}%`} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:'var(--text-2)' }}
                width={94} axisLine={false} tickLine={false}/>
              <Tooltip
                formatter={v => [`${v > 0 ? '+' : ''}${v.toFixed(2)}%`, 'Change']}
                contentStyle={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:10, fontSize:12, color:'var(--text-1)' }}
              />
              <Bar dataKey="change" radius={[0,5,5,0]}>
                {sectorPerformance.map((e,i) => <Cell key={i} fill={e.change >= 0 ? '#10b981' : '#ef4444'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Stock table ── */}
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor:'var(--border)' }}>
        {/* Controls */}
        <div className="px-4 py-3 border-b flex flex-col sm:flex-row gap-3 flex-wrap"
          style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-3)' }}/>
            <input className="input text-sm pl-9 py-2" placeholder="Search symbol or name…"
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Filter size={12} style={{ color:'var(--text-3)' }}/>
            {SECTORS.map(s => (
              <button key={s} onClick={() => setSector(s)}
                className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all"
                style={sector === s
                  ? { background:`rgba(var(--accent-rgb),.12)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.2)` }
                  : { color:'var(--text-3)', border:'1px solid transparent' }
                }>{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <span className="text-xs" style={{ color:'var(--text-3)' }}>Sort</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer"
              style={{ background:'var(--bg-1)', borderColor:'var(--border)', color:'var(--text-2)' }}>
              <option value="mktCap">Mkt Cap</option>
              <option value="changePct">% Change</option>
              <option value="price">Price</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto" style={{ background:'var(--bg-1)' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor:'var(--border)', background:'var(--bg-2)' }}>
                {['Asset','Price','Change','Volume','Mkt Cap','Sector','P/E'].map((h, i) => (
                  <th key={h} className={`th ${i === 0 ? 'text-left' : 'text-right'}
                    ${['Volume','Sector'].includes(h) ? 'hidden sm:table-cell' : ''}
                    ${['Mkt Cap','P/E'].includes(h) ? 'hidden md:table-cell' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <motion.tr key={s.symbol}
                  initial={{ opacity:0 }} animate={{ opacity:1 }}
                  transition={{ delay: Math.min(i * 0.015, 0.4) }}
                  className="tr border-b" style={{ borderColor:'var(--border)' }}>
                  <td className="td">
                    <Link to={`/stock/${s.symbol}`} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                        style={{ background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.15)` }}>
                        {s.symbol.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm group-hover:text-accent transition-colors" style={{ color:'var(--text-1)' }}>
                          {s.symbol}
                          {s.region && s.region !== 'US' && (
                            <span className="ml-1.5 text-xs font-normal" style={{ color:'var(--text-3)' }}>
                              {s.exchange}
                            </span>
                          )}
                        </div>
                        <div className="text-xs truncate max-w-[150px]" style={{ color:'var(--text-3)' }}>
                          {s.name}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="td text-right">
                    <span className="font-mono font-bold text-sm" style={{ color: s.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
                      {fmtPrice(s.price)}
                    </span>
                  </td>
                  <td className="td text-right">
                    <div className={`text-sm font-bold font-mono ${changeColor(s.changePct)}`}>
                      {fmtPct(s.changePct)}
                    </div>
                    {s.change != null && (
                      <div className={`text-xs ${s.change >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                        {fmtChange(s.change)}
                      </div>
                    )}
                  </td>
                  <td className="td text-right hidden sm:table-cell">
                    <span className="text-sm font-mono" style={{ color:'var(--text-2)' }}>{s.volume}</span>
                  </td>
                  <td className="td text-right hidden md:table-cell">
                    <span className="text-sm font-mono font-semibold" style={{ color:'var(--text-1)' }}>{s.mktCap}</span>
                  </td>
                  <td className="td text-right hidden sm:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background:'var(--bg-3)', color:'var(--text-3)' }}>
                      {s.sector}
                    </span>
                  </td>
                  <td className="td text-right hidden md:table-cell">
                    <span className="text-sm font-mono" style={{ color:'var(--text-2)' }}>
                      {s.pe ? `${s.pe}x` : '—'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 flex items-center justify-between"
          style={{ background:'var(--bg-2)', borderTop:`1px solid var(--border)` }}>
          <span className="text-xs" style={{ color:'var(--text-3)' }}>
            {filtered.length} securities · {stocks.filter(s => s.changePct != null && s.changePct >= 0).length} advancing · {stocks.filter(s => s.changePct != null && s.changePct < 0).length} declining
          </span>
          <span className="text-xs" style={{ color:'var(--text-3)' }}>Updated just now</span>
        </div>
      </div>

    </div>
  )
}
