import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Clock, Loader2 } from 'lucide-react'
import { usStocks, euStocks, asiaStocks, commodities, currencies, cryptos } from '../data/mockData'
import { ysxStocks, ysxMarketStats, fmtMktCap, YSX_URL } from '../data/myanmarStocks'
import { useYsxQuotes, withQuote } from '../hooks/useYsx'
import { api } from '../services/api'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import { fmtPrice as fmtPriceLive, fmtPct, fmtChange, changeColor } from '../utils/formatLive'
import PageHeader, { StatusPill } from '../components/PageHeader'

/* ── Shared helpers ──────────────────────────────────────────── */
const fmtNum = (n, dec = 2) => (typeof n === 'number' ? n.toFixed(dec) : '—')
const fmtPrice = (n, dec = 2) => (typeof n === 'number' ? n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '—')

function StatusBadge({ status, isLive }) {
  if (isLive === true || status === 'live')
    return <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background:'rgb(var(--up) / .1)', color:'rgb(var(--up))', border:'1px solid rgb(var(--up) / .2)' }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:'rgb(var(--up))' }}/>Live
    </span>
  if (status === 'latest_available')
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background:'rgb(var(--caution) / .08)', color:'rgb(var(--caution))', border:'1px solid rgb(var(--caution) / .2)' }}>Latest</span>
  if (status === 'mock' || isLive === false)
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background:'var(--bg-3)', color:'var(--text-3)', border:'1px solid var(--border)' }}>Ref</span>
  return null
}

function ChangeCell({ change, changePct }) {
  if (change == null && changePct == null) return <span style={{ color:'var(--text-3)' }}>—</span>
  const up = (changePct ?? change ?? 0) >= 0
  return (
    <div className={`text-right ${up ? 'text-emerald-400' : 'text-red-400'}`}>
      <div className="font-bold text-sm font-mono">{up ? '+' : ''}{fmtNum(changePct)}%</div>
      {change != null && <div className="text-xs font-mono opacity-70">{up ? '+' : ''}{fmtNum(change)}</div>}
    </div>
  )
}

/* ── Asset card (for commodities / crypto / forex) ───────────── */
function AssetCard({ asset, priceDecimals = 2 }) {
  const up = (asset.changePct ?? asset.change ?? 0) >= 0
  const unavailable = asset.status === 'unavailable' || asset.price == null
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      className="rounded-xl border p-4 flex flex-col gap-2"
      style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-black text-sm" style={{ color:'var(--text-1)' }}>{asset.name || asset.symbol}</div>
          <div className="text-xs font-mono" style={{ color:'var(--text-3)' }}>{asset.symbol}</div>
        </div>
        <StatusBadge status={asset.status} isLive={asset.status === 'live'} />
      </div>
      {unavailable ? (
        <div className="text-xs" style={{ color:'var(--text-3)' }}>Data unavailable</div>
      ) : (
        <>
          <div className="font-black font-mono text-lg" style={{ color:'var(--text-1)' }}>
            {fmtPrice(asset.price, priceDecimals)}
          </div>
          <ChangeCell change={asset.change} changePct={asset.changePct} />
        </>
      )}
      {asset.unit && <div className="text-[10px]" style={{ color:'var(--text-3)' }}>{asset.unit}</div>}
      {asset.lastUpdated && (
        <div className="text-[10px] flex items-center gap-1" style={{ color:'var(--text-3)' }}>
          <Clock size={9}/>{new Date(asset.lastUpdated).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
        </div>
      )}
    </motion.div>
  )
}

/* ── Stock row (for US / EU / Asia) ──────────────────────────── */
function StockRow({ stock, i }) {
  return (
    <motion.tr initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i * 0.02 }}
      className="border-b" style={{ borderColor:'var(--border)' }}>
      <td className="td">
        <Link to={`/stock/${stock.symbol}`} className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-black shrink-0"
            style={{ background:'rgba(var(--accent-rgb),.1)', color:'var(--accent)' }}>
            {stock.symbol.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-sm group-hover:text-accent transition-colors" style={{ color:'var(--text-1)' }}>
              {stock.symbol}
            </div>
            <div className="text-xs truncate max-w-[140px]" style={{ color:'var(--text-3)' }}>{stock.name}</div>
          </div>
        </Link>
      </td>
      <td className="td text-right font-mono font-bold text-sm" style={{ color: stock.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
        {fmtPriceLive(stock.price)}
      </td>
      <td className="td text-right">
        <div className={`font-bold text-sm font-mono ${changeColor(stock.changePct)}`}>
          {fmtPct(stock.changePct)}
        </div>
        {stock.change != null && (
          <div className={`text-xs font-mono ${stock.change >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
            {fmtChange(stock.change)}
          </div>
        )}
      </td>
      <td className="td text-right hidden sm:table-cell">
        <span className="text-sm font-mono" style={{ color:'var(--text-2)' }}>{stock.volume}</span>
      </td>
      <td className="td text-right hidden md:table-cell">
        <span className="text-sm font-mono font-semibold" style={{ color:'var(--text-1)' }}>{stock.mktCap}</span>
      </td>
      <td className="td text-right hidden lg:table-cell">
        <span className="text-xs px-2 py-0.5 rounded-md" style={{ background:'var(--bg-3)', color:'var(--text-3)' }}>
          {stock.sector}
        </span>
      </td>
      <td className="td text-right hidden md:table-cell">
        <StatusBadge status={stock._live ? 'live' : 'mock'} />
      </td>
    </motion.tr>
  )
}

/* ── Tab: US / EU / Asia stocks ──────────────────────────────── */
function StockTab({ stocks: data, region }) {
  const REGION_LABELS = { us:'United States', europe:'Europe', asia:'Asia Pacific', japan:'Japan', china:'China / HK', singapore:'Singapore' }

  /* Live-overlay all symbols in this region.
   * Null out mock prices while waiting so we never briefly flash wrong data. */
  const symbols = data.map(s => s.symbol)
  const { quotes } = useBatchQuotes(symbols, 60_000)
  const live = data.map(s => {
    const q = quotes[s.symbol]
    return q
      ? { ...s, price: q.price, change: q.change, changePct: q.changePct, _live: true }
      : { ...s, price: null, change: null, changePct: null, _live: false }
  })
  const liveCount = live.filter(s => s._live).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-bold" style={{ color:'var(--text-1)' }}>{REGION_LABELS[region] || region}</div>
          <div className="text-xs mt-0.5" style={{ color:'var(--text-3)' }}>
            {data.length} securities · {liveCount} live · {data.length - liveCount} reference
          </div>
        </div>
        {liveCount > 0
          ? <StatusPill tone="live" pulse>Live · Finnhub</StatusPill>
          : <StatusPill tone="muted">Reference data</StatusPill>}
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor:'var(--border)' }}>
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor:'var(--border)', background:'var(--bg-2)' }}>
              {['Asset','Price','Change','Volume','Mkt Cap','Sector','Data'].map((h, i) => (
                <th key={h} className={`th ${i === 0 ? 'text-left' : 'text-right'}
                  ${['Volume'].includes(h) ? 'hidden sm:table-cell' : ''}
                  ${['Mkt Cap','Data'].includes(h) ? 'hidden md:table-cell' : ''}
                  ${['Sector'].includes(h) ? 'hidden lg:table-cell' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody style={{ background:'var(--bg-1)' }}>
            {live.map((s, i) => <StockRow key={s.symbol} stock={s} i={i} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Tab: Commodities / Crypto / Forex ───────────────────────── */
function LiveAssetTab({ fetcher, mockFallback, priceDecimals = 2, label, note, ttl = 3 * 60_000 }) {
  const [assets, setAssets]   = useState(null)
  const [isLive, setIsLive]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastFetched, setLF]  = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const result = await fetcher()
      setAssets(result.assets || result)
      setIsLive(result.isLive ?? false)
      setLF(new Date())
    } catch {
      setAssets(mockFallback)
      setIsLive(false)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="text-sm font-bold" style={{ color:'var(--text-1)' }}>{label}</div>
          {note && <div className="text-xs mt-0.5" style={{ color:'var(--text-3)' }}>{note}</div>}
        </div>
        <div className="flex items-center gap-2">
          {isLive
            ? <StatusPill tone="live" pulse>Live · Twelve Data</StatusPill>
            : <StatusPill tone="muted">Reference data</StatusPill>}
          <button onClick={load} disabled={loading} aria-label="Refresh prices"
            className="p-1.5 rounded-md border transition-all hover:opacity-80"
            style={{ borderColor:'var(--border)', color:'var(--text-3)' }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/>
          </button>
        </div>
      </div>
      {!loading && assets && !isLive && (
        <p className="text-xs mb-3" style={{ color:'var(--text-3)' }}>
          Showing reference values, not live prices. Refresh to try again.
        </p>
      )}
      {loading && !assets ? (
        <div className="flex items-center justify-center py-20" style={{ color:'var(--text-3)' }}>
          <Loader2 size={20} className="animate-spin mr-2"/><span className="text-sm">Loading prices</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {(assets || mockFallback).map((asset, i) => (
            <AssetCard key={asset.symbol} asset={asset} priceDecimals={priceDecimals} />
          ))}
        </div>
      )}
      {lastFetched && (
        <div className="mt-3 text-xs flex items-center gap-1" style={{ color:'var(--text-3)' }}>
          <Clock size={10}/>Last updated <span className="font-mono">{lastFetched.toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  )
}

/* ── Tab: Myanmar / YSX ──────────────────────────────────────── */
const SECTOR_COLORS = {
  'Diversified':      '#c98a6b','Industrials':'#6fa3b8','Financials':'#8fb38a',
  'Communication':    '#e8a43e','Consumer Staples':'#d8c7a6',
}
function MyanmarTab() {
  const { quotes, asOf, loading } = useYsxQuotes()
  const merged = ysxStocks.map(s => withQuote(s, quotes[s.code]))
  const isLive = merged.some(s => s.live)
  const totalCap = fmtMktCap(merged.reduce((sum, s) => sum + s.shares * s.price, 0), 1)
  return (
    <div>
      {/* Disclaimer banner */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border text-xs mb-5"
        style={{ background:'rgb(var(--caution) / .06)', borderColor:'rgb(var(--caution) / .2)', color:'rgb(var(--caution))' }}>
        <AlertTriangle size={13} className="shrink-0 mt-0.5"/>
        <span>
          {isLive
            ? <>End-of-day closes from the Yangon Stock Exchange (latest session <span className="font-mono">{asOf}</span>), not real-time.</>
            : <>{loading ? 'Loading closes from the Yangon Stock Exchange. ' : 'Couldn’t load live closes from the Yangon Stock Exchange. '}Showing the last known closes (<span className="font-mono">{merged[0].date}</span>), which may be out of date.</>}
          {' '}Verify at <a href={YSX_URL} target="_blank" rel="noopener noreferrer" className="underline font-semibold">ysx-mm.com</a>.
          This is informational only, not financial advice.
        </span>
      </div>

      {/* Market stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label:'Listed companies', value:ysxMarketStats.totalListings, sub:'all sectors' },
          { label:'Latest session', value:isLive ? asOf : merged[0].date, sub:isLive ? 'live from YSX' : 'saved snapshot' },
          { label:'Market cap', value:totalCap, sub:'shares × close' },
          { label:'Trading hours', value:'09:30 – 12:30', sub:'MMT (UTC+6:30)' },
        ].map(c => (
          <div key={c.label} className="rounded-xl border px-4 py-3"
            style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
            <div className="text-xs" style={{ color:'var(--text-3)' }}>{c.label}</div>
            <div className="font-black font-mono text-base mt-0.5" style={{ color:'var(--text-1)' }}>{c.value}</div>
            <div className="text-xs font-mono" style={{ color:'var(--text-3)' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* YSX stock grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {merged.map((stock, i) => {
          const hasChange = stock.changePct != null
          const up = (stock.changePct ?? 0) >= 0
          const sectorColor = SECTOR_COLORS[stock.sector] || '#857f73'
          return (
            <motion.div key={stock.code} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/myanmar-stocks/${stock.code}`}
                className="block rounded-xl border p-4 transition-colors"
                style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `rgba(var(--accent-rgb),.4)`}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
                      style={{ background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)' }}>
                      {stock.code.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm" style={{ color:'var(--text-1)' }}>{stock.code}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background:`${sectorColor}18`, color: sectorColor }}>{stock.sector}</span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color:'var(--text-3)' }}>{stock.shortName}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                    style={{ background:'rgba(var(--accent-rgb),.08)', color:'var(--accent)', border:'1px solid rgba(var(--accent-rgb),.2)' }}>
                    YSX
                  </span>
                </div>
                <div className="font-black font-mono text-base" style={{ color:'var(--text-1)' }}>
                  {stock.price.toLocaleString()} MMK
                </div>
                <div className="text-xs mb-2" style={{ color:'var(--text-3)' }}>
                  {stock.live ? 'Close' : 'Last known close'} <span className="font-mono">{stock.date}</span>
                </div>
                {hasChange ? (
                  <div className={`text-sm font-bold font-mono flex items-center gap-1 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                    {up ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                    {up ? '+' : ''}{stock.changePct.toFixed(2)}%
                  </div>
                ) : (
                  <div className="text-xs" style={{ color:'var(--text-3)' }}>{stock.live ? 'No change data' : 'Live change unavailable'}</div>
                )}
                <div className="mt-2 text-xs font-mono" style={{ color:'var(--text-3)' }}>
                  {stock.volume != null && <>Vol: {stock.volume.toLocaleString()} · </>}Cap: {stock.mktCap}
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Tab config ──────────────────────────────────────────────── */
const TABS = [
  { key:'us',          label:'United States' },
  { key:'europe',      label:'Europe'        },
  { key:'asia',        label:'Asia Pacific'  },
  { key:'myanmar',     label:'Myanmar (YSX)' },
  { key:'commodities', label:'Commodities'   },
  { key:'crypto',      label:'Crypto'        },
  { key:'forex',       label:'Forex'         },
]

/* ── Asia Pacific: filter relevant from asiaStocks ───────────── */
const asiaFiltered = asiaStocks.filter(s => ['JP','CN','TW','KR','SG','HK'].includes(s.region))

/* ── Mock commodities/crypto/forex for fallback ─────────────── */
const mockCommodities = commodities.map(c => ({ ...c, status: 'mock', source: 'Reference Data' }))
const mockCrypto      = cryptos ? cryptos.map(c => ({ ...c, status: 'mock', source: 'Reference Data' })) : []
const mockForex       = currencies.map(c => ({ ...c, status: 'mock', source: 'Reference Data' }))

/* ── Main page ───────────────────────────────────────────────── */
export default function GlobalMarkets() {
  const [searchParams, setSearchParams] = useSearchParams()
  const region = searchParams.get('region') || 'us'
  const setRegion = (r) => setSearchParams({ region: r })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">

      {/* Header */}
      <PageHeader className="mb-6" title="Global markets"
        subtitle="Equities, commodities, crypto and forex by region. Each board shows whether its prices are live or reference values.">
        <StatusPill tone="muted">
          <span className="font-mono">{new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', timeZone:'UTC' })}</span> UTC
        </StatusPill>
      </PageHeader>

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap mb-6 p-1 rounded-lg border overflow-x-auto"
        style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setRegion(t.key)}
            className="text-sm px-3 py-2 rounded-md font-semibold transition-colors whitespace-nowrap"
            style={region === t.key
              ? { background:'rgba(var(--accent-rgb),.12)', color:'var(--text-1)', border:'1px solid rgba(var(--accent-rgb),.25)' }
              : { background:'transparent', color:'var(--text-2)', border:'1px solid transparent' }
            }>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={region} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.18 }}>
          {region === 'us'          && <StockTab stocks={usStocks} region="us" />}
          {region === 'europe'      && <StockTab stocks={euStocks} region="europe" />}
          {region === 'asia'        && <StockTab stocks={asiaFiltered} region="asia" />}
          {region === 'myanmar'     && <MyanmarTab />}
          {region === 'commodities' && (
            <LiveAssetTab
              fetcher={api.commodities}
              mockFallback={mockCommodities}
              priceDecimals={2}
              label="Commodities"
              note="Gold, silver, crude oil, natural gas and copper, priced via Twelve Data"
            />
          )}
          {region === 'crypto'      && (
            <LiveAssetTab
              fetcher={api.crypto}
              mockFallback={mockCrypto}
              priceDecimals={2}
              label="Cryptocurrency"
              note="BTC, ETH, SOL and DOGE, priced via Twelve Data"
            />
          )}
          {region === 'forex'       && (
            <LiveAssetTab
              fetcher={api.forex}
              mockFallback={mockForex}
              priceDecimals={4}
              label="Foreign exchange"
              note="Major currency pairs, with rates via Twelve Data"
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
