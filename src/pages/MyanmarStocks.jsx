import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Info, ExternalLink, Search, AlertTriangle, BarChart2 } from 'lucide-react'
import PageHeader, { StatusPill } from '../components/PageHeader'
import { ysxStocks, ysxMarketStats } from '../data/myanmarStocks'

/* ── Helpers ─────────────────────────────────────────────────── */
function fmtMMK(v) {
  if (v >= 1e12) return `${(v/1e12).toFixed(2)}T MMK`
  if (v >= 1e9)  return `${(v/1e9).toFixed(1)}B MMK`
  if (v >= 1e6)  return `${(v/1e6).toFixed(1)}M MMK`
  return `${v.toLocaleString()} MMK`
}

const SECTOR_COLORS = {
  'Diversified':     { bg:'rgba(201,138,107,.1)',  color:'#c98a6b' },
  'Industrials':     { bg:'rgba(111,163,184,.1)',  color:'#6fa3b8' },
  'Financials':      { bg:'rgba(143,179,138,.1)',  color:'#8fb38a' },
  'Communication':   { bg:'rgba(232,164,62,.1)',   color:'#e8a43e' },
  'Consumer Staples':{ bg:'rgba(216,199,166,.1)',  color:'#d8c7a6' },
}

function SectorBadge({ sector }) {
  const c = SECTOR_COLORS[sector] || { bg:'var(--bg-3)', color:'var(--text-2)' }
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
      style={{ background:c.bg, color:c.color }}>{sector}</span>
  )
}

function VerdictBadge({ verdict }) {
  const cfg = {
    'Buy':     { bg:'rgb(var(--up) / .1)',      color:'rgb(var(--up))',      border:'rgb(var(--up) / .25)' },
    'Hold':    { bg:'rgb(var(--caution) / .1)', color:'rgb(var(--caution))', border:'rgb(var(--caution) / .25)' },
    'Sell':    { bg:'rgb(var(--down) / .1)',    color:'rgb(var(--down))',    border:'rgb(var(--down) / .25)' },
    'Caution': { bg:'rgb(var(--down) / .1)',    color:'rgb(var(--down))',    border:'rgb(var(--down) / .25)' },
  }[verdict] || { bg:'var(--bg-3)', color:'var(--text-2)', border:'var(--border)' }
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-md border"
      style={{ background:cfg.bg, color:cfg.color, borderColor:cfg.border }}>{verdict}</span>
  )
}

/* ── Stock row card ──────────────────────────────────────────── */
function StockCard({ stock, index }) {
  const up = stock.changePct >= 0
  return (
    <motion.div
      initial={{ opacity:0, y:12 }}
      animate={{ opacity:1, y:0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Link to={`/myanmar-stocks/${stock.code}`} className="card block !p-4">

        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
              style={{ background:'rgba(var(--accent-rgb),.1)', color:'var(--accent)' }}>
              {stock.code.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm font-mono" style={{ color:'var(--text-1)' }}>{stock.code}</span>
                <SectorBadge sector={stock.sector}/>
              </div>
              <div className="text-xs mt-0.5 leading-tight" style={{ color:'var(--text-3)' }}>
                {stock.shortName}
              </div>
            </div>
          </div>
          <VerdictBadge verdict={stock.aiInsights.verdict}/>
        </div>

        {/* Price + change */}
        <div className="flex items-end justify-between">
          <div>
            <div className="font-black font-mono text-base" style={{ color:'var(--text-1)' }}>
              {stock.price.toLocaleString()} MMK
            </div>
            <div className="text-xs font-mono" style={{ color:'var(--text-3)' }}>≈ ${stock.priceUSD.toFixed(2)} USD</div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-bold font-mono flex items-center justify-end gap-1 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
              {up ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
              {up ? '+' : ''}{stock.changePct.toFixed(2)}%
            </div>
            <div className={`text-xs font-mono ${up ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
              {up ? '+' : ''}{stock.change.toLocaleString()} MMK
            </div>
          </div>
        </div>

        {/* Volume + market cap */}
        <div className="mt-3 flex items-center gap-4 text-xs" style={{ color:'var(--text-3)' }}>
          <span>Vol: <span className="font-mono">{stock.volume.toLocaleString()}</span></span>
          <span>Cap: <span className="font-mono">{stock.mktCap}</span></span>
        </div>
      </Link>
    </motion.div>
  )
}

/* ── Main page ───────────────────────────────────────────────── */
export default function MyanmarStocks() {
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('All')

  const sectors = ['All', ...new Set(ysxStocks.map(s => s.sector))]

  const filtered = ysxStocks.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.shortName.toLowerCase().includes(q)
    const matchSector = sector === 'All' || s.sector === sector
    return matchSearch && matchSector
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">

      {/* Header */}
      <PageHeader className="mb-6" title="Myanmar Stocks"
        subtitle={`Yangon Stock Exchange — all ${ysxStocks.length} listed companies`}>
        <StatusPill tone="muted">YSX · delayed</StatusPill>
      </PageHeader>

      {/* Data freshness disclaimer */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border text-xs mb-6"
        style={{ background:'rgb(var(--caution) / .06)', borderColor:'rgb(var(--caution) / .2)', color:'rgb(var(--caution))' }}>
        <AlertTriangle size={13} className="shrink-0 mt-0.5"/>
        <span>YSX data may be delayed. Prices reflect latest available YSX publications. Not real-time.</span>
      </div>

      {/* Market overview strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label:'Exchange',    value:ysxMarketStats.exchange.split(' ').slice(0,3).join(' '), sub:'Myanmar' },
          { label:'Listed Cos', value:ysxMarketStats.totalListings, sub:'all sectors' },
          { label:'Market Cap',  value:ysxMarketStats.totalMktCap, sub:'approx.' },
          { label:'Trading Hours', value:'09:30 – 12:30', sub:'ICT (UTC+6:30)' },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}
            className="card-flat !px-4 !py-3">
            <div className="text-xs" style={{ color:'var(--text-3)' }}>{c.label}</div>
            <div className="font-black text-sm font-mono mt-0.5" style={{ color:'var(--text-1)' }}>{c.value}</div>
            <div className="text-xs" style={{ color:'var(--text-3)' }}>{c.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* MMI Index bar */}
      <div className="card-flat !p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart2 size={16} style={{ color:'var(--accent)' }}/>
          <div>
            <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Myanmar Market Index (MMI)</span>
            <span className="text-xs ml-3 font-mono font-bold" style={{ color:'var(--text-1)' }}>{ysxMarketStats.indexValue}</span>
            <span className="text-xs ml-2 font-mono font-bold text-emerald-400">{ysxMarketStats.indexChange}</span>
          </div>
        </div>
        <a href="https://www.ysx.com.mm" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold transition-colors hover:underline"
          style={{ color:'var(--text-2)' }}>
          <ExternalLink size={12}/> Official YSX website
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-3)' }}/>
          <input className="input pl-9 w-full text-sm" placeholder="Search by code or company name…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        {/* Sector tabs */}
        <div className="flex gap-1 flex-wrap">
          {sectors.map(s => (
            <button key={s} onClick={() => setSector(s)}
              className="text-xs px-3 py-2 rounded-md font-semibold border transition-colors"
              style={sector === s
                ? { background:'rgba(var(--accent-rgb),.12)', color:'var(--text-1)', borderColor:'rgba(var(--accent-rgb),.25)' }
                : { background:'transparent', color:'var(--text-2)', borderColor:'transparent' }
              }>{s}</button>
          ))}
        </div>
      </div>

      {/* Stock grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {filtered.map((s, i) => <StockCard key={s.code} stock={s} index={i}/>)}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16" style={{ color:'var(--text-3)' }}>
            <Search size={32} className="mx-auto mb-3 opacity-20"/>
            <p className="text-sm">No results for "{search}"</p>
          </div>
        )}
      </div>

      {/* About YSX section */}
      <div className="card-flat !p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Info size={15} style={{ color:'var(--accent)' }}/>
          <span className="font-bold text-sm" style={{ color:'var(--text-1)' }}>About the Yangon Stock Exchange</span>
        </div>
        <div className="text-sm leading-relaxed space-y-2" style={{ color:'var(--text-2)' }}>
          <p>The Yangon Stock Exchange (YSX) was established on December 9, 2015, making it one of Southeast Asia's newest stock exchanges. It is a joint venture between the Myanmar government (Myanma Economic Bank), Daiwa Securities Group, and Japan Exchange Group.</p>
          <p>YSX currently has {ysxMarketStats.totalListings} listed companies across sectors including diversified conglomerates, banking, industrials, telecommunications, consumer goods, and agricultural exchange services.</p>
          <p>Trading takes place Monday to Friday from 09:30 to 12:30 ICT. The exchange is smaller and less liquid than major regional exchanges, so prices can be less frequently updated than those on major US or Asian markets.</p>
        </div>
        <div className="mt-4 p-3 rounded-lg text-xs"
          style={{ background:'rgb(var(--caution) / .06)', border:'1px solid rgb(var(--caution) / .2)', color:'rgb(var(--caution))' }}>
          <strong>Data disclaimer:</strong> Myanmar stock data shown here may be delayed or based on the most recently available YSX publication.
          It is not guaranteed to reflect real-time market prices. Always verify with official YSX publications at{' '}
          <a href="https://www.ysx.com.mm" target="_blank" rel="noopener noreferrer"
            className="underline font-semibold">ysx.com.mm</a>.
          This is informational only and not financial advice.
        </div>
      </div>
    </div>
  )
}
