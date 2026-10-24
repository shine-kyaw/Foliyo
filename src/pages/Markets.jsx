import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { stocks as baseStocks, sectorPerformance } from '../data/mockData'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import { useLiveIndices } from '../hooks/useLiveIndices'
import { fmtPrice, fmtPct, fmtChange } from '../utils/formatLive'
import { usSession } from '../utils/marketHours'
import PageHeader, { StatusPill } from '../components/PageHeader'

const SECTORS = ['All','Technology','Healthcare','Financials','Cons. Disc.','Communication','Energy']
const tone = v => v == null ? 'var(--text-3)' : v >= 0 ? 'rgb(var(--up))' : 'rgb(var(--down))'

/* ── Screener pieces ─────────────────────────────────────────── */
function SectionHead({ children, aside }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
      <span className="section-title">{children}<ChevronRight size={18} style={{ color:'var(--text-3)' }}/></span>
      {aside}
    </div>
  )
}

const MOVER_COLS = ['Symbol','Name','Price','Change','Change %']

function MoversTable({ rows, empty }) {
  if (!rows.length) return <p className="py-8 text-sm text-center border-y" style={{ color:'var(--text-3)', borderColor:'var(--border)' }}>{empty}</p>
  return (
    <div className="overflow-x-auto border-t" style={{ borderColor:'var(--border)' }}>
      <table className="w-full min-w-[520px]">
        <thead>
          <tr className="border-b" style={{ borderColor:'var(--border)' }}>
            {MOVER_COLS.map((h, i) => (
              <th key={h} scope="col" className={`th whitespace-nowrap ${i < 2 ? 'text-left' : 'text-right'}`}
                style={{ paddingLeft: i === 0 ? 0 : undefined }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(s => (
            <tr key={s.symbol} className="asset-row border-b" style={{ borderColor:'var(--border)' }}>
              <td className="td whitespace-nowrap" style={{ paddingLeft:0 }}>
                <Link to={`/stock/${s.symbol}`} className="link font-bold text-[13px]">{s.symbol}</Link>
              </td>
              <td className="td text-[13px] truncate max-w-[180px]" style={{ color:'var(--text-2)' }}>{s.name}</td>
              <td className="td text-right num font-bold text-[13px] whitespace-nowrap">{fmtPrice(s.price)}</td>
              <td className="td text-right num text-[13px] font-semibold whitespace-nowrap" style={{ color: tone(s.change) }}>{fmtChange(s.change)}</td>
              <td className="td text-right num text-[13px] font-semibold whitespace-nowrap" style={{ color: tone(s.changePct) }}>{fmtPct(s.changePct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Markets() {
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('All')
  const [sortBy, setSortBy] = useState('mktCap')
  const [moversTab, setMoversTab] = useState('gainers')

  /* Live prices for every stock in our universe */
  const symbols = useMemo(() => baseStocks.map(s => s.symbol), [])
  const { quotes, lastUpdated } = useBatchQuotes(symbols, 60_000)
  const isLive = Object.keys(quotes).length > 0
  const session = usSession()

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

  /* Only rank stocks with live data so we never show "Top gainers" with mock pcts */
  const ranked = stocks.filter(s => s.changePct != null)
  const gainers = [...ranked].sort((a,b) => b.changePct - a.changePct).slice(0,5)
  const losers  = [...ranked].sort((a,b) => a.changePct - b.changePct).slice(0,5)
  const mostActive = [...ranked].sort((a,b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0,5)

  /* Live index proxies (SPY/QQQ/DIA); names with a dash until they load */
  const { indices: liveIndices, isLive: indicesLive } = useLiveIndices(60_000)
  const indexCards = indicesLive
    ? liveIndices.map(i => ({
        name: i.name,
        value: i.price.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }),
        change: `${i.changePct >= 0 ? '+' : ''}${i.changePct.toFixed(2)}%`,
        up: i.changePct >= 0,
      }))
    : ['S&P 500', 'NASDAQ', 'Dow Jones'].map(name => ({ name, value:'—', change:'', up:true }))

  const MOVERS = {
    gainers:    { label:'Top gainers',    rows:gainers,    empty:'No live prices yet. Gainers appear once quotes load.' },
    losers:     { label:'Top losers',     rows:losers,     empty:'No live prices yet. Losers appear once quotes load.' },
    mostActive: { label:'Biggest movers', rows:mostActive, empty:'No live prices yet. Movers appear once quotes load.' },
  }
  const mv = MOVERS[moversTab]
  const advancing = stocks.filter(s => s.changePct != null && s.changePct >= 0).length
  const declining = stocks.filter(s => s.changePct != null && s.changePct < 0).length

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-8 page-enter">

      {/* ── Header ── */}
      <PageHeader title="Markets" subtitle="Equities across the US, Europe and Asia Pacific, ranked by today's move.">
        {isLive && <StatusPill tone="accent">Live · Finnhub</StatusPill>}
        <StatusPill tone={session.open ? 'live' : 'muted'} pulse={session.open}>{session.label}</StatusPill>
      </PageHeader>

      {/* ── Indices ── */}
      <section aria-label="Indices">
        <div className="grid grid-cols-1 sm:grid-cols-3 border-y" style={{ borderColor:'var(--border)' }}>
          {indexCards.map((idx, i) => (
            <div key={idx.name} className={`py-3 ${i > 0 ? 'border-t sm:border-t-0 sm:border-l sm:pl-4' : ''} sm:pr-4`}
              style={{ borderColor:'var(--border)' }}>
              <div className="text-[13px] font-semibold link truncate">{idx.name}</div>
              <div className="num font-bold text-xl mt-0.5" style={{ color:'var(--text-1)' }}>{idx.value}</div>
              <div className="num text-[13px] font-semibold mt-0.5"
                style={{ color: idx.change ? (idx.up ? 'rgb(var(--up))' : 'rgb(var(--down))') : 'var(--text-3)' }}>
                {idx.change || 'Waiting for prices'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Movers + Sector ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-8">

        {/* Movers screener */}
        <section aria-label="Market movers" className="min-w-0">
          <SectionHead aside={
            <div className="flex gap-1 flex-wrap" role="tablist">
              {Object.entries(MOVERS).map(([k, m]) => (
                <button key={k} role="tab" aria-selected={moversTab === k} onClick={() => setMoversTab(k)}
                  className="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors"
                  style={moversTab === k ? { background:'var(--btn-bg)', color:'var(--btn-fg)' } : { color:'var(--text-2)' }}>
                  {m.label}
                </button>
              ))}
            </div>
          }>{mv.label}</SectionHead>
          <MoversTable rows={mv.rows} empty={mv.empty}/>
          {moversTab === 'mostActive' && mv.rows.length > 0 && (
            <p className="text-[11px] mt-2" style={{ color:'var(--text-3)' }}>Ranked by the size of today's move, up or down.</p>
          )}
        </section>

        {/* Sector performance */}
        <section aria-label="Sector performance" className="min-w-0">
          <SectionHead aside={<span className="text-[11px]" style={{ color:'var(--text-3)' }}>Sample figures</span>}>Sector performance</SectionHead>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sectorPerformance} layout="vertical" margin={{ left:0, right:44 }} barCategoryGap={9}>
              <XAxis type="number" hide domain={['dataMin - 0.3', 'dataMax + 0.3']}/>
              <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:'var(--text-3)' }}
                width={92} axisLine={false} tickLine={false}/>
              <Tooltip cursor={{ fill:'var(--bg-1)' }}
                formatter={v => [`${v > 0 ? '+' : ''}${v.toFixed(2)}%`, 'Change']}
                contentStyle={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, color:'var(--text-1)' }}
              />
              <Bar dataKey="change" barSize={6} radius={3}
                label={{ position:'right', fontSize:11, fill:'var(--text-2)', formatter: v => `${v > 0 ? '+' : ''}${v.toFixed(2)}%` }}>
                {sectorPerformance.map((e,i) => <Cell key={i} fill={e.change >= 0 ? 'rgb(var(--up))' : 'rgb(var(--down))'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* ── All stocks ── */}
      <section aria-label="All stocks">
        <SectionHead>All stocks</SectionHead>

        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
          <div className="relative w-full md:max-w-xs">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--text-3)' }}/>
            <input aria-label="Search stocks" className="input text-sm pl-9 py-2 rounded-full" placeholder="Search symbol or name"
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto md:flex-wrap pb-1 md:pb-0">
            {SECTORS.map(s => (
              <button key={s} onClick={() => setSector(s)} aria-pressed={sector === s}
                className="text-[13px] px-3 py-1.5 rounded-full font-semibold transition-colors whitespace-nowrap shrink-0"
                style={sector === s
                  ? { background:'var(--btn-bg)', color:'var(--btn-fg)', border:'1px solid var(--btn-bg)' }
                  : { background:'transparent', color:'var(--text-2)', border:'1px solid var(--border-light)' }
                }>{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 md:ml-auto shrink-0">
            <label htmlFor="markets-sort" className="text-xs" style={{ color:'var(--text-3)' }}>Sort by</label>
            <select id="markets-sort" value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="text-[13px] font-semibold px-3 py-1.5 rounded-full border outline-none cursor-pointer"
              style={{ background:'var(--bg-2)', borderColor:'var(--border-light)', color:'var(--text-1)' }}>
              <option value="mktCap">Mkt Cap</option>
              <option value="changePct">% Change</option>
              <option value="price">Price</option>
            </select>
          </div>
        </div>

        <div className="overflow-auto max-h-[75vh] border-y" style={{ borderColor:'var(--border)' }}>
          <table className="w-full min-w-[820px]">
            <thead>
              <tr>
                {['Symbol','Name','Price','Change','Change %','Sector'].map((h, i) => (
                  <th key={h} scope="col"
                    className={`th whitespace-nowrap sticky top-0 z-10 border-b ${i < 2 || h === 'Sector' ? 'text-left' : 'text-right'}`}
                    style={{ background:'var(--bg-0)', borderColor:'var(--border)', paddingLeft: i === 0 ? 0 : undefined }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.symbol} className="asset-row border-b" style={{ borderColor:'var(--border)' }}>
                  <td className="td whitespace-nowrap" style={{ paddingLeft:0 }}>
                    <Link to={`/stock/${s.symbol}`} className="link font-bold text-[13px]">{s.symbol}</Link>
                    {s.region && s.region !== 'US' && (
                      <span className="ml-1.5 text-xs font-normal" style={{ color:'var(--text-3)' }}>{s.exchange}</span>
                    )}
                  </td>
                  <td className="td text-[13px] truncate max-w-[200px]" style={{ color:'var(--text-2)' }}>{s.name}</td>
                  <td className="td text-right num font-bold text-[13px] whitespace-nowrap" style={{ color: s.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
                    {fmtPrice(s.price)}
                  </td>
                  <td className="td text-right num text-[13px] font-semibold whitespace-nowrap" style={{ color: tone(s.change) }}>{fmtChange(s.change)}</td>
                  <td className="td text-right num text-[13px] font-semibold whitespace-nowrap" style={{ color: tone(s.changePct) }}>{fmtPct(s.changePct)}</td>
                  <td className="td text-[13px] whitespace-nowrap" style={{ color:'var(--text-3)' }}>{s.sector}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="px-4 py-12 text-sm text-center" style={{ color:'var(--text-3)' }}>
              No securities match. Clear the search or pick another sector.
            </p>
          )}
        </div>

        <div className="pt-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs" style={{ color:'var(--text-3)' }}>
            {filtered.length} securities · {advancing} advancing · {declining} declining
          </span>
          <span className="text-xs num" style={{ color:'var(--text-3)' }}>
            {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}` : isLive ? 'Showing last saved prices' : 'Waiting for prices'}
          </span>
        </div>
      </section>

    </div>
  )
}
