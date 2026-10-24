import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Clock, Loader2 } from 'lucide-react'
import { usStocks, euStocks, asiaStocks, commodities, currencies, cryptos } from '../data/mockData'
import { ysxStocks, ysxMarketStats, fmtMktCap, YSX_URL } from '../data/myanmarStocks'
import { useYsxQuotes, withQuote } from '../hooks/useYsx'
import { api } from '../services/api'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import { fmtPrice as fmtPriceLive, fmtPct, fmtChange } from '../utils/formatLive'
import PageHeader, { StatusPill } from '../components/PageHeader'

/* ── Shared helpers ──────────────────────────────────────────── */
const fmtPrice = (n, dec = 2) => (typeof n === 'number' ? n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '—')
const tone = v => v == null ? 'var(--text-3)' : v >= 0 ? 'rgb(var(--up))' : 'rgb(var(--down))'
const signed = (v, dec = 2) => (typeof v === 'number' ? `${v >= 0 ? '+' : ''}${v.toFixed(dec)}` : '—')

function StatusBadge({ status, isLive }) {
  if (isLive === true || status === 'live')
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
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

/* Block heading for a board: bold title, grey note, status on the right */
function BoardHead({ title, note, children }) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap mb-3">
      <div>
        <div className="section-title">{title}</div>
        {note && <div className="text-xs mt-0.5" style={{ color:'var(--text-3)' }}>{note}</div>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

/* Thin-ruled screener table inside a horizontal scroller */
function Screener({ cols, children, minWidth = 640 }) {
  return (
    <div className="overflow-x-auto border-y" style={{ borderColor:'var(--border)' }}>
      <table className="w-full" style={{ minWidth }}>
        <thead>
          <tr className="border-b" style={{ borderColor:'var(--border)' }}>
            {cols.map(([h, align], i) => (
              <th key={h} scope="col" className={`th whitespace-nowrap ${align === 'l' ? 'text-left' : 'text-right'}`}
                style={{ paddingLeft: i === 0 ? 0 : undefined }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

const rowCls = 'asset-row border-b last:border-b-0'
const rowStyle = { borderColor:'var(--border)' }
const numCell = 'td text-right num text-[13px] whitespace-nowrap'

/* ── Asset table (commodities / crypto / forex) ──────────────── */
const ASSET_COLS = [['Name','l'],['Symbol','l'],['Price','r'],['Change','r'],['Change %','r'],['Data','r'],['Updated','r']]

function AssetRow({ asset, priceDecimals = 2 }) {
  const unavailable = asset.status === 'unavailable' || asset.price == null
  const dir = asset.changePct ?? asset.change
  return (
    <tr className={rowCls} style={rowStyle}>
      <td className="td" style={{ paddingLeft:0 }}>
        <div className="font-bold text-[13px]" style={{ color:'var(--text-1)' }}>{asset.name || asset.symbol}</div>
        {asset.unit && <div className="text-[11px]" style={{ color:'var(--text-3)' }}>{asset.unit}</div>}
      </td>
      <td className="td text-[13px] whitespace-nowrap" style={{ color:'var(--text-2)' }}>{asset.symbol}</td>
      {unavailable ? (
        <td colSpan={3} className="td text-right text-xs" style={{ color:'var(--text-3)' }}>Data unavailable</td>
      ) : (
        <>
          <td className={`${numCell} font-bold`} style={{ color:'var(--text-1)' }}>{fmtPrice(asset.price, priceDecimals)}</td>
          <td className={`${numCell} font-semibold`} style={{ color: tone(dir) }}>{signed(asset.change, priceDecimals)}</td>
          <td className={`${numCell} font-semibold`} style={{ color: tone(dir) }}>{typeof asset.changePct === 'number' ? `${signed(asset.changePct)}%` : '—'}</td>
        </>
      )}
      <td className="td text-right"><StatusBadge status={asset.status} isLive={asset.status === 'live'} /></td>
      <td className={numCell} style={{ color:'var(--text-3)' }}>
        {asset.lastUpdated ? new Date(asset.lastUpdated).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '—'}
      </td>
    </tr>
  )
}

/* ── Stock row (for US / EU / Asia) ──────────────────────────── */
const STOCK_COLS = [['Symbol','l'],['Name','l'],['Price','r'],['Change','r'],['Change %','r'],['Sector','l'],['Data','r']]

function StockRow({ stock }) {
  return (
    <tr className={rowCls} style={rowStyle}>
      <td className="td whitespace-nowrap" style={{ paddingLeft:0 }}>
        <Link to={`/stock/${stock.symbol}`} className="link font-bold text-[13px]">{stock.symbol}</Link>
      </td>
      <td className="td text-[13px] truncate max-w-[200px]" style={{ color:'var(--text-2)' }}>{stock.name}</td>
      <td className={`${numCell} font-bold`} style={{ color: stock.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
        {fmtPriceLive(stock.price)}
      </td>
      <td className={`${numCell} font-semibold`} style={{ color: tone(stock.change) }}>{fmtChange(stock.change)}</td>
      <td className={`${numCell} font-semibold`} style={{ color: tone(stock.changePct) }}>{fmtPct(stock.changePct)}</td>
      <td className="td text-[13px] whitespace-nowrap" style={{ color:'var(--text-3)' }}>{stock.sector}</td>
      <td className="td text-right"><StatusBadge status={stock._live ? 'live' : 'mock'} /></td>
    </tr>
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
      <BoardHead title={REGION_LABELS[region] || region}
        note={`${data.length} securities · ${liveCount} live · ${data.length - liveCount} reference`}>
        {liveCount > 0
          ? <StatusPill tone="live" pulse>Live · Finnhub</StatusPill>
          : <StatusPill tone="muted">Reference data</StatusPill>}
      </BoardHead>
      <Screener cols={STOCK_COLS} minWidth={860}>
        {live.map(s => <StockRow key={s.symbol} stock={s} />)}
      </Screener>
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
      <BoardHead title={label} note={note}>
        {isLive
          ? <StatusPill tone="live" pulse>Live · Twelve Data</StatusPill>
          : <StatusPill tone="muted">Reference data</StatusPill>}
        <button onClick={load} disabled={loading} aria-label="Refresh prices"
          className="p-1.5 rounded-full border transition-colors hover:bg-[var(--bg-1)]"
          style={{ borderColor:'var(--border-light)', color:'var(--text-2)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/>
        </button>
      </BoardHead>
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
        <Screener cols={ASSET_COLS} minWidth={640}>
          {(assets || mockFallback).map(asset => (
            <AssetRow key={asset.symbol} asset={asset} priceDecimals={priceDecimals} />
          ))}
        </Screener>
      )}
      {lastFetched && (
        <div className="mt-3 text-xs flex items-center gap-1" style={{ color:'var(--text-3)' }}>
          <Clock size={10}/>Last updated <span className="num">{lastFetched.toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  )
}

/* ── Tab: Myanmar / YSX ──────────────────────────────────────── */
const YSX_COLS = [['Code','l'],['Company','l'],['Sector','l'],['Close (MMK)','r'],['Change %','r'],['Volume','r'],['Mkt Cap','r'],['Close date','r']]

function MyanmarTab() {
  const { quotes, asOf, loading } = useYsxQuotes()
  const merged = ysxStocks.map(s => withQuote(s, quotes[s.code]))
  const isLive = merged.some(s => s.live)
  const totalCap = fmtMktCap(merged.reduce((sum, s) => sum + s.shares * s.price, 0), 1)
  return (
    <div>
      {/* Disclaimer banner */}
      <div className="flex items-start gap-2 px-3.5 py-3 rounded-[10px] border text-xs mb-6"
        style={{ background:'rgb(var(--caution) / .06)', borderColor:'rgb(var(--caution) / .25)', color:'rgb(var(--caution))' }}>
        <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
        <span>
          {isLive
            ? <>End-of-day closes from the Yangon Stock Exchange (latest session <span className="num">{asOf}</span>), not real-time.</>
            : <>{loading ? 'Loading closes from the Yangon Stock Exchange. ' : 'Couldn’t load live closes from the Yangon Stock Exchange. '}Showing the last known closes (<span className="num">{merged[0].date}</span>), which may be out of date.</>}
          {' '}Verify at <a href={YSX_URL} target="_blank" rel="noopener noreferrer" className="underline font-semibold">ysx-mm.com</a>.
          This is informational only, not financial advice.
        </span>
      </div>

      {/* Market stats */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 border-y mb-6" style={{ borderColor:'var(--border)' }}>
        {[
          { label:'Listed companies', value:ysxMarketStats.totalListings, sub:'all sectors' },
          { label:'Latest session', value:isLive ? asOf : merged[0].date, sub:isLive ? 'live from YSX' : 'saved snapshot' },
          { label:'Market cap', value:totalCap, sub:'shares × close' },
          { label:'Trading hours', value:'09:30 – 13:00', sub:'MMT (UTC+6:30)' },
        ].map((c, i) => (
          <div key={c.label} className={`py-3 pr-3 ${i % 2 ? 'pl-3 border-l' : ''} ${i > 0 ? 'sm:pl-4 sm:border-l' : ''} ${i > 1 ? 'border-t sm:border-t-0' : ''}`}
            style={{ borderColor:'var(--border)' }}>
            <dt className="text-xs" style={{ color:'var(--text-3)' }}>{c.label}</dt>
            <dd className="num font-bold text-lg mt-0.5" style={{ color:'var(--text-1)' }}>{c.value}</dd>
            <dd className="text-xs num" style={{ color:'var(--text-3)' }}>{c.sub}</dd>
          </div>
        ))}
      </dl>

      {/* YSX stock table */}
      <Screener cols={YSX_COLS} minWidth={820}>
        {merged.map(stock => {
          const hasChange = stock.changePct != null
          return (
            <tr key={stock.code} className={rowCls} style={rowStyle}>
              <td className="td whitespace-nowrap" style={{ paddingLeft:0 }}>
                <Link to={`/myanmar-stocks/${stock.code}`} className="link font-bold text-[13px]">{stock.code}</Link>
                <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded align-middle"
                  style={{ background:'rgba(var(--accent-rgb),.08)', color:'var(--accent)', border:'1px solid rgba(var(--accent-rgb),.2)' }}>YSX</span>
              </td>
              <td className="td text-[13px]" style={{ color:'var(--text-2)' }}>{stock.shortName}</td>
              <td className="td text-[13px] whitespace-nowrap" style={{ color:'var(--text-3)' }}>{stock.sector}</td>
              <td className={`${numCell} font-bold`} style={{ color:'var(--text-1)' }}>{stock.price.toLocaleString()}</td>
              <td className={`${numCell} font-semibold`} style={{ color: hasChange ? tone(stock.changePct) : 'var(--text-3)' }}>
                {hasChange
                  ? `${stock.changePct >= 0 ? '+' : ''}${stock.changePct.toFixed(2)}%`
                  : <span className="text-xs font-normal">{stock.live ? 'No change data' : 'Live change unavailable'}</span>}
              </td>
              <td className={numCell} style={{ color:'var(--text-2)' }}>{stock.volume != null ? stock.volume.toLocaleString() : '—'}</td>
              <td className={numCell} style={{ color:'var(--text-1)' }}>{stock.mktCap}</td>
              <td className={numCell} style={{ color:'var(--text-3)' }}>
                {stock.live ? 'Close' : 'Last known close'} {stock.date}
              </td>
            </tr>
          )
        })}
      </Screener>
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
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 page-enter">

      {/* Header */}
      <PageHeader className="mb-5" title="Global markets"
        subtitle="Equities, commodities, crypto and forex by region. Each board shows whether its prices are live or reference values.">
        <StatusPill tone="muted">
          <span className="num">{new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', timeZone:'UTC' })}</span> UTC
        </StatusPill>
      </PageHeader>

      {/* Tab bar — underline tabs, scrolls sideways on narrow screens */}
      <div role="tablist" aria-label="Market regions" className="flex gap-1 overflow-x-auto border-b mb-6 -mx-4 px-4 sm:mx-0 sm:px-0"
        style={{ borderColor:'var(--border)' }}>
        {TABS.map(t => {
          const active = region === t.key
          return (
            <button key={t.key} role="tab" aria-selected={active} onClick={() => setRegion(t.key)}
              className="text-sm px-3 py-3 whitespace-nowrap shrink-0 transition-colors -mb-px"
              style={{
                color: active ? 'var(--text-1)' : 'var(--text-2)',
                fontWeight: active ? 700 : 500,
                borderBottom: `3px solid ${active ? 'var(--brand)' : 'transparent'}`,
              }}>{t.label}</button>
          )
        })}
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
