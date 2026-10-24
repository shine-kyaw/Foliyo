import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useIndices } from '../hooks/useIndices'
import { useAssetQuotes } from '../hooks/useAssetQuotes'
import { useChart } from '../hooks/useChart'
import { usSession } from '../utils/marketHours'
import Sparkline from './Sparkline'

/* ── Market strip — the row of live benchmarks under the header ── */
const ITEMS = [
  { key:'^GSPC',   label:'S&P 500',  spark:'SPY',     to:'/markets' },
  { key:'^DJI',    label:'Dow 30',   spark:'DIA',     to:'/markets' },
  { key:'^IXIC',   label:'Nasdaq',   spark:'QQQ',     to:'/markets' },
  { key:'XAU/USD', label:'Gold',     spark:'XAU/USD', to:'/global-markets?region=commodities', asset:true },
  { key:'BTC/USD', label:'Bitcoin',  spark:'BTC/USD', to:'/global-markets?region=crypto',      asset:true },
  { key:'EUR/USD', label:'EUR/USD',  spark:'EUR/USD', to:'/global-markets?region=forex',       asset:true, fx:true },
]

const fmt = (v, fx) => v == null ? '—'
  : v.toLocaleString('en-US', { minimumFractionDigits: fx ? 4 : 2, maximumFractionDigits: fx ? 4 : 2 })

function StripItem({ item, quote: live, index }) {
  const { data, loading, refetch } = useChart(item.spark, '1D', null)
  // The chart provider allows ~8 calls a minute; a cold start can miss some — retry staggered
  useEffect(() => {
    if (loading || data?.length) return
    const id = setTimeout(refetch, 30_000 + index * 9_000)
    return () => clearTimeout(id)
  }, [loading, data, refetch, index])
  // Crypto/FX/gold feeds can be rate-limited; fall back to the intraday series' last print
  const quote = live || (item.asset && data?.length > 1 ? (() => {
    const first = data[0].price, last = data.at(-1).price
    return { price: last, change: last - first, changePct: (last - first) / first * 100 }
  })() : null)
  const up = (quote?.changePct ?? 0) >= 0
  const tone = quote?.changePct == null ? 'var(--text-3)' : up ? 'rgb(var(--up))' : 'rgb(var(--down))'
  return (
    <Link to={item.to}
      className="flex items-center gap-3 pl-4 pr-3 py-2 border-l first:border-l-0 shrink-0 transition-colors hover:bg-[var(--bg-1)]"
      style={{ borderColor:'var(--border)' }}>
      <div className="min-w-[96px]">
        <div className="text-[13px] font-semibold link leading-tight">{item.label}</div>
        <div className="text-[13px] font-bold num leading-tight mt-0.5" style={{ color:'var(--text-1)' }}>{fmt(quote?.price, item.fx)}</div>
        <div className="text-[11px] font-semibold num leading-tight mt-0.5" style={{ color: tone }}>
          {quote?.changePct == null ? '—' : `${up ? '+' : ''}${fmt(quote.change, item.fx)} ${up ? '+' : ''}${quote.changePct.toFixed(2)}%`}
        </div>
      </div>
      <Sparkline data={data} up={up} />
    </Link>
  )
}

export default function MarketStrip() {
  const { indices } = useIndices()
  const { quotes: assets } = useAssetQuotes()
  const session = usSession()
  const byKey = Object.fromEntries(indices.map(i => [i.symbol, i]))

  return (
    <div className="border-b" style={{ borderColor:'var(--border)', background:'var(--bg-0)' }}>
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 flex items-stretch">
        <Link to="/global-markets" className="hidden lg:flex items-center gap-2 pr-4 mr-1 shrink-0 text-[13px] font-semibold"
          style={{ color:'var(--text-1)' }}>
          <span className={`w-2 h-2 rounded-full ${session.open ? 'animate-pulse' : ''}`}
            style={{ background: session.open ? 'rgb(var(--up))' : 'var(--text-3)' }} />
          {session.open ? 'US markets open' : 'US markets closed'}
          <ChevronRight size={14} style={{ color:'var(--text-3)' }}/>
        </Link>
        <div className="flex overflow-x-auto no-scrollbar flex-1" style={{ scrollbarWidth:'none' }}>
          {ITEMS.map((item, index) => (
            <StripItem key={item.key} item={item} index={index} quote={item.asset ? assets[item.key] : byKey[item.key]} />
          ))}
        </div>
      </div>
    </div>
  )
}
