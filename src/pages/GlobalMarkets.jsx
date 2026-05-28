import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe2, TrendingUp, TrendingDown, AlertTriangle, RefreshCw,
  ExternalLink, Wifi, WifiOff, Clock, Loader2, BarChart2,
} from 'lucide-react'
import { usStocks, euStocks, asiaStocks, commodities, currencies, cryptos } from '../data/mockData'
import { ysxStocks, ysxMarketStats } from '../data/myanmarStocks'
import { api } from '../services/api'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import { fmtPrice as fmtPriceLive, fmtPct, fmtChange, changeColor } from '../utils/formatLive'

/* ── Shared helpers ──────────────────────────────────────────── */
const fmtNum = (n, dec = 2) => (typeof n === 'number' ? n.toFixed(dec) : '—')
const fmtPrice = (n, dec = 2) => (typeof n === 'number' ? n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '—')

function StatusBadge({ status, isLive, lastUpdated }) {
  if (isLive === true || status === 'live')
    return <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ background:'rgba(16,185,129,.1)', color:'#10b981', border:'1px solid rgba(16,185,129,.2)' }}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>Live
    </span>
  if (status === 'latest_available')
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ background:'rgba(245,158,11,.08)', color:'#f59e0b', border:'1px solid rgba(245,158,11,.2)' }}>Latest</span>
  if (status === 'mock' || isLive === false)
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ background:'rgba(148,163,184,.08)', color:'#94a3b8', border:'1px solid rgba(148,163,184,.15)' }}>Ref</span>
  return null
}

function ChangeCell({ change, changePct }) {
  if (change == null && changePct == null) return <span style={{ color:'var(--text-3)' }}>—</span>
  const up = (changePct ?? change ?? 0) >= 0
  return (
    <div className={`text-right ${up ? 'text-emerald-400' : 'text-red-400'}`}>
      <div className="font-bold text-sm font-mono">{up ? '+' : ''}{fmtNum(changePct)}%</div>
      {change != null && <div className="text-xs opacity-70">{up ? '+' : ''}{fmtNum(change)}</div>}
    </div>
  )
}

/* ── Asset card (for commodities / crypto / forex) ───────────── */
function AssetCard({ asset, priceDecimals = 2 }) {
  const up = (asset.changePct ?? asset.change ?? 0) >= 0
  const unavailable = asset.status === 'unavailable' || asset.price == null
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      className="rounded-2xl border p-4 flex flex-col gap-2"
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
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
            style={{ background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)' }}>
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
          <div className={`text-xs ${stock.change >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
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
        <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background:'var(--bg-3)', color:'var(--text-3)' }}>
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
        {liveCount > 0 ? (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background:'rgba(16,185,129,.1)', color:'#10b981', border:'1px solid rgba(16,185,129,.2)' }}>
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse inline-block mr-1.5"/>
            Live · Finnhub
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background:'rgba(148,163,184,.08)', color:'#94a3b8', border:'1px solid rgba(148,163,184,.15)' }}>
            <WifiOff size={9} className="inline mr-1"/>Reference Data
          </span>
        )}
      </div>
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor:'var(--border)' }}>
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
            ? <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background:'rgba(16,185,129,.1)', color:'#10b981', border:'1px solid rgba(16,185,129,.2)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>Live · Twelve Data
              </span>
            : <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background:'rgba(148,163,184,.08)', color:'#94a3b8', border:'1px solid rgba(148,163,184,.15)' }}>
                <WifiOff size={10}/>Reference Data
              </span>
          }
          <button onClick={load} disabled={loading}
            className="p-1.5 rounded-lg border transition-all hover:opacity-80"
            style={{ borderColor:'var(--border)', color:'var(--text-3)' }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/>
          </button>
        </div>
      </div>
      {loading && !assets ? (
        <div className="flex items-center justify-center py-20" style={{ color:'var(--text-3)' }}>
          <Loader2 size={20} className="animate-spin mr-2"/><span className="text-sm">Fetching prices…</span>
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
          <Clock size={10}/>Last updated: {lastFetched.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}

/* ── Tab: Myanmar / YSX ──────────────────────────────────────── */
const SECTOR_COLORS = {
  'Diversified':      '#8b5cf6','Industrials':'#3b82f6','Financials':'#10b981',
  'Communication':    '#06b6d4','Consumer Staples':'#f59e0b',
}
function MyanmarTab() {
  return (
    <div>
      {/* Disclaimer banner */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs mb-5"
        style={{ background:'rgba(245,158,11,.06)', borderColor:'rgba(245,158,11,.2)', color:'#f59e0b' }}>
        <AlertTriangle size={13} className="shrink-0 mt-0.5"/>
        <span>
          YSX data may be delayed or limited. Prices are based on latest available YSX publications — not real-time.
          Verify at <a href="https://www.ysx.com.mm" target="_blank" rel="noopener noreferrer" className="underline font-semibold">ysx.com.mm</a>.
          This is informational only, not financial advice.
        </span>
      </div>

      {/* Market stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label:'Listed Companies', value:ysxMarketStats.totalListings, sub:'all sectors' },
          { label:'Market Index (MMI)', value:ysxMarketStats.indexValue, sub:ysxMarketStats.indexChange },
          { label:'Market Cap', value:ysxMarketStats.totalMktCap, sub:'approx.' },
          { label:'Trading Hours', value:'09:30 – 12:30', sub:'ICT (UTC+6:30)' },
        ].map(c => (
          <div key={c.label} className="rounded-xl border px-4 py-3"
            style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
            <div className="text-xs" style={{ color:'var(--text-3)' }}>{c.label}</div>
            <div className="font-black text-base mt-0.5" style={{ color:'var(--text-1)' }}>{c.value}</div>
            <div className="text-xs" style={{ color:'#10b981' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* YSX stock grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {ysxStocks.map((stock, i) => {
          const up = stock.changePct >= 0
          const sectorColor = SECTOR_COLORS[stock.sector] || '#94a3b8'
          return (
            <motion.div key={stock.code} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/myanmar-stocks/${stock.code}`}
                className="block rounded-2xl border p-4 transition-all"
                style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `rgba(var(--accent-rgb),.4)`}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                      style={{ background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)' }}>
                      {stock.code.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm" style={{ color:'var(--text-1)' }}>{stock.code}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background:`${sectorColor}18`, color: sectorColor }}>{stock.sector}</span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color:'var(--text-3)' }}>{stock.shortName}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background:'rgba(245,158,11,.08)', color:'#f59e0b', border:'1px solid rgba(245,158,11,.2)' }}>
                    YSX
                  </span>
                </div>
                <div className="font-black font-mono text-base" style={{ color:'var(--text-1)' }}>
                  {stock.price.toLocaleString()} MMK
                </div>
                <div className="text-xs text-gray-400 font-mono mb-2">≈ ${stock.priceUSD.toFixed(2)} USD</div>
                <div className={`text-sm font-bold flex items-center gap-1 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                  {up ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                  {up ? '+' : ''}{stock.changePct.toFixed(2)}%
                </div>
                <div className="mt-2 text-xs" style={{ color:'var(--text-3)' }}>
                  Vol: {stock.volume.toLocaleString()} · Cap: {stock.mktCap}
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
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2.5" style={{ color:'var(--text-1)' }}>
            <Globe2 size={22} style={{ color:'var(--accent)' }}/>
            Global Markets
          </h1>
          <p className="text-sm mt-1" style={{ color:'var(--text-3)' }}>
            Equities, commodities, crypto, and forex — live and latest available data
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full shrink-0"
          style={{ color:'#10b981', background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.18)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
          {new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })} UTC
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap mb-6 p-1 rounded-2xl border overflow-x-auto"
        style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setRegion(t.key)}
            className="text-sm px-3 py-2 rounded-xl font-semibold transition-all whitespace-nowrap"
            style={region === t.key
              ? { background:`rgba(var(--accent-rgb),.15)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.25)` }
              : { color:'var(--text-2)', border:'1px solid transparent' }
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
              note="Gold, silver, crude oil, natural gas, copper — prices via Twelve Data"
            />
          )}
          {region === 'crypto'      && (
            <LiveAssetTab
              fetcher={api.crypto}
              mockFallback={mockCrypto}
              priceDecimals={2}
              label="Cryptocurrency"
              note="BTC, ETH, SOL, BNB, XRP, DOGE — prices via Twelve Data"
            />
          )}
          {region === 'forex'       && (
            <LiveAssetTab
              fetcher={api.forex}
              mockFallback={mockForex}
              priceDecimals={4}
              label="Foreign Exchange"
              note="Major currency pairs — rates via Twelve Data"
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
