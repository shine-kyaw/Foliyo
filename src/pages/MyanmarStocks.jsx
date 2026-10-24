import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Search, AlertTriangle } from 'lucide-react'
import PageHeader, { StatusPill } from '../components/PageHeader'
import { ysxStocks, ysxMarketStats, ysxPreListing, fmtMktCap, YSX_URL } from '../data/myanmarStocks'
import { useYsxQuotes, withQuote } from '../hooks/useYsx'

/* ── Helpers ─────────────────────────────────────────────────── */
const tone = v => v == null ? 'var(--text-3)' : v >= 0 ? 'rgb(var(--up))' : 'rgb(var(--down))'

function SectionHead({ children }) {
  return <div className="mb-3"><span className="section-title">{children}</span></div>
}

/* ── Board row ───────────────────────────────────────────────── */
function StockRow({ stock }) {
  const hasChange = stock.changePct != null
  const up = (stock.changePct ?? 0) >= 0
  const color = tone(hasChange ? stock.changePct : null)
  return (
    <tr className="asset-row border-t" style={{ borderColor:'var(--border)' }}>
      <td className="td whitespace-nowrap">
        <Link to={`/myanmar-stocks/${stock.code}`} className="font-bold link num">{stock.code}</Link>
      </td>
      <td className="td min-w-[180px]">
        <Link to={`/myanmar-stocks/${stock.code}`} className="hover:underline" style={{ color:'var(--text-1)' }}>{stock.shortName}</Link>
        <div className="text-xs truncate max-w-[280px]" style={{ color:'var(--text-3)' }}>{stock.name}</div>
      </td>
      <td className="td whitespace-nowrap" style={{ color:'var(--text-2)' }}>{stock.sector}</td>
      <td className="td text-right num font-bold whitespace-nowrap">{stock.price.toLocaleString()}</td>
      <td className="td text-right num font-semibold whitespace-nowrap" style={{ color }}>
        {hasChange
          ? <>{up ? '+' : ''}{stock.change != null ? `${stock.change.toLocaleString()} ` : ''}({up ? '+' : ''}{stock.changePct.toFixed(2)}%)</>
          : <span className="font-normal" style={{ color:'var(--text-3)' }} title={stock.live ? 'No change data' : 'Live change unavailable'}>—</span>}
      </td>
      <td className="td text-right num whitespace-nowrap">{stock.volume != null ? stock.volume.toLocaleString() : '—'}</td>
      <td className="td text-right num whitespace-nowrap">{stock.mktCap}</td>
      <td className="td text-right num whitespace-nowrap" style={{ color:'var(--text-3)' }}>
        {stock.date}{!stock.live && <span className="block text-[11px]">last known</span>}
      </td>
    </tr>
  )
}

/* ── Main page ───────────────────────────────────────────────── */
export default function MyanmarStocks() {
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('All')

  const { quotes, asOf, error, loading } = useYsxQuotes()
  const merged = ysxStocks.map(s => withQuote(s, quotes[s.code]))
  const isLive = merged.some(s => s.live)
  const totalCap = fmtMktCap(merged.reduce((sum, s) => sum + s.shares * s.price, 0), 1)
  const preListing = ysxPreListing.map(p => ({ ...p, quote: quotes[p.code] }))

  const sectors = ['All', ...new Set(ysxStocks.map(s => s.sector))]

  const filtered = merged.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.shortName.toLowerCase().includes(q)
    const matchSector = sector === 'All' || s.sector === sector
    return matchSearch && matchSector
  })

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 page-enter">

      {/* Header */}
      <PageHeader className="mb-5" title="Myanmar Stocks"
        subtitle={`Yangon Stock Exchange — all ${ysxStocks.length} listed companies`}>
        {isLive
          ? <StatusPill tone="live">YSX · end of day</StatusPill>
          : <StatusPill tone="muted">YSX · {loading ? 'loading' : 'snapshot'}</StatusPill>}
      </PageHeader>

      {/* Data freshness disclaimer */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-[10px] border text-xs mb-5"
        style={{ background:'rgb(var(--caution) / .06)', borderColor:'rgb(var(--caution) / .2)', color:'rgb(var(--caution))' }}>
        <AlertTriangle size={13} className="shrink-0 mt-0.5"/>
        <span>
          {isLive
            ? <>Prices are end-of-day closes published by the Yangon Stock Exchange after each session, not real-time. Latest session: <span className="num">{asOf}</span>.</>
            : <>{loading ? 'Loading closes from the Yangon Stock Exchange. ' : 'Couldn’t load live closes from the Yangon Stock Exchange. '}Showing the last known closes (<span className="num">{merged[0].date}</span>), which may be out of date. Not real-time.</>}
        </span>
      </div>

      {/* Market overview strip */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 mb-5 border-y" style={{ borderColor:'var(--border)' }}>
        {[
          { label:'Exchange',         value:ysxMarketStats.exchange.split(' ').slice(0,3).join(' '), sub:'Myanmar' },
          { label:'Listed companies', value:ysxMarketStats.totalListings, sub:'all sectors' },
          { label:'Market cap',       value:totalCap, sub:'shares × close' },
          { label:'Trading hours',    value:'09:30 – 13:00', sub:'MMT (UTC+6:30)' },
        ].map(c => (
          <div key={c.label} className="py-3 pr-4">
            <dt className="text-xs" style={{ color:'var(--text-3)' }}>{c.label}</dt>
            <dd className="font-bold text-[15px] num mt-0.5" style={{ color:'var(--text-1)' }}>{c.value}</dd>
            <dd className="text-xs" style={{ color:'var(--text-3)' }}>{c.sub}</dd>
          </div>
        ))}
      </dl>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:'var(--text-3)' }}/>
          <input className="input !rounded-full !pl-9 text-sm" aria-label="Search Myanmar stocks" placeholder="Search by code or company name…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="flex gap-1 flex-wrap" role="tablist" aria-label="Sector">
          {sectors.map(s => (
            <button key={s} role="tab" aria-selected={sector === s} onClick={() => setSector(s)}
              className="text-[13px] px-3 py-1.5 rounded-full font-semibold transition-colors"
              style={sector === s ? { background:'var(--btn-bg)', color:'var(--btn-fg)' } : { color:'var(--text-2)' }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="rounded-[10px] border overflow-x-auto mb-4" style={{ borderColor:'var(--border)', background:'var(--bg-2)' }}>
        <table className="w-full text-left" style={{ minWidth:820 }}>
          <thead>
            <tr>
              {[['Symbol',''],['Name',''],['Sector',''],['Close (MMK)','text-right'],['Change','text-right'],['Volume','text-right'],['Market cap','text-right'],['As of','text-right']].map(([h, a]) => (
                <th key={h} scope="col" className={`th ${a}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => <StockRow key={s.code} stock={s}/>)}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-14 text-sm" style={{ color:'var(--text-3)' }}>
                No results for "{search}"
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Source line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-10 text-xs" style={{ color:'var(--text-3)' }}>
        <span>
          Latest YSX session <span className="num font-semibold" style={{ color:'var(--text-1)' }}>{isLive ? asOf : merged[0].date}</span>
          {' · '}{isLive ? 'live from ysx-mm.com' : 'saved snapshot'}
        </span>
        <a href={YSX_URL} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-semibold link">
          <ExternalLink size={12}/> Official YSX website
        </a>
      </div>

      {/* ── Pre-Listing Board ── */}
      <section className="mb-10">
        <SectionHead>Pre-Listing Board</SectionHead>
        <p className="text-xs mb-3 max-w-2xl" style={{ color:'var(--text-3)' }}>
          Registered with the YSX but not formally listed, so they are not part of the {ysxMarketStats.totalListings} listed companies above.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {preListing.map(p => (
            <div key={p.code} className="rounded-[10px] border px-4 py-3" style={{ borderColor:'var(--border)', background:'var(--bg-2)' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm num" style={{ color:'var(--text-1)' }}>{p.code}</span>
                <span className="text-sm font-bold num" style={{ color:'var(--text-1)' }}>
                  {p.quote ? `${p.quote.close.toLocaleString()} MMK` : '—'}
                </span>
              </div>
              <div className="text-xs mt-0.5" style={{ color:'var(--text-2)' }}>{p.name}</div>
              <div className="text-xs mt-1" style={{ color:'var(--text-3)' }}>
                Registered <span className="num">{p.registered}</span>
                {p.quote && <> · latest close <span className="num">{p.quote.date}</span></>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── About YSX ── */}
      <section className="max-w-3xl mb-6">
        <SectionHead>About the Yangon Stock Exchange</SectionHead>
        <div className="text-sm leading-relaxed space-y-2" style={{ color:'var(--text-2)' }}>
          <p>The Yangon Stock Exchange (YSX) was established on December 9, 2015, making it one of Southeast Asia's newest stock exchanges. It is a joint venture between the Myanmar government (Myanma Economic Bank), Daiwa Securities Group, and Japan Exchange Group.</p>
          <p>YSX currently has {ysxMarketStats.totalListings} listed companies across sectors including diversified conglomerates, banking, industrials, telecommunications, consumer goods, and agricultural exchange services.</p>
          <p>The exchange accepts orders Monday to Friday from 09:30 to 13:00 MMT and matches them every 30 minutes from 10:00. It is smaller and less liquid than major regional exchanges, so prices can be less frequently updated than those on major US or Asian markets.</p>
        </div>
        <div className="mt-4 p-3 rounded-[10px] text-xs"
          style={{ background:'rgb(var(--caution) / .06)', border:'1px solid rgb(var(--caution) / .2)', color:'rgb(var(--caution))' }}>
          <strong>Data disclaimer:</strong> Myanmar prices are end-of-day closes taken from the Yangon Stock Exchange website after each session.
          They are not real-time and may lag the exchange. Always verify with official YSX publications at{' '}
          <a href={YSX_URL} target="_blank" rel="noopener noreferrer"
            className="underline font-semibold">ysx-mm.com</a>.
          This is informational only and not financial advice.
        </div>
      </section>
    </div>
  )
}
