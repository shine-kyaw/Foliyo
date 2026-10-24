import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Star, X, Plus, CheckCircle } from 'lucide-react'
import { usStocks, euStocks, asiaStocks, commodities, currencies, cryptos } from '../data/mockData'
import { generateAIAnalysis } from '../utils/aiAnalysis'
import { api } from '../services/api'
import { useQuote } from '../hooks/useQuote'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import { useAssetQuotes } from '../hooks/useAssetQuotes'
import PageHeader from '../components/PageHeader'
import { persist } from '../utils/userStore'

const ALL_ASSETS = [...usStocks, ...euStocks, ...asiaStocks, ...cryptos, ...commodities, ...currencies]

/* Crypto / commodities / FX never go through the equity quote endpoint.
   Watchlist symbol → live-feed symbol; anything not listed has no live source. */
const ASSET_FEED = {
  BTC:'BTC/USD', ETH:'ETH/USD', SOL:'SOL/USD', DOGE:'DOGE/USD',
  'GC=F':'XAU/USD', 'CL=F':'WTI/USD', 'NG=F':'NGAS/USD', 'ZW=F':'WHEAT/USD',
  'EUR/USD':'EUR/USD', 'GBP/USD':'GBP/USD', 'USD/JPY':'USD/JPY', 'AUD/USD':'AUD/USD',
}
const ASSET_TYPE = {}
cryptos.forEach(a => { ASSET_TYPE[a.symbol] = 'crypto' })
commodities.forEach(a => { ASSET_TYPE[a.symbol] = 'commodity' })
currencies.forEach(a => { ASSET_TYPE[a.symbol] = 'currency' })

const liveQuoteFor = (symbol, feed) => feed[ASSET_FEED[symbol]] || null

/* Non-stock tiles open their Global Markets board, not a stock page */
const TILE_LINK = { crypto:'/global-markets?region=crypto', commodity:'/global-markets?region=commodities', currency:'/global-markets?region=forex' }

const regionFlag = {}  // Region flags removed — region shows as a chip with text instead

/* ── localStorage helpers ──────────────────────────────────── */
const STORAGE_KEY = 'foliyo_watchlist'
const loadWatchlist = () => {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) }
  catch { return new Set() }
}
const saveWatchlist = (set) => {
  persist(STORAGE_KEY, [...set])
}

/* ── watchlist-meta helpers (symbol → {name}) ──────────────── */
const META_KEY = 'foliyo_watchlist_meta'
const wlLoadMeta = () => {
  try { return JSON.parse(localStorage.getItem(META_KEY) || '{}') }
  catch { return {} }
}
const wlSaveMeta = (symbol, name) => {
  try {
    const meta = wlLoadMeta()
    meta[symbol] = { name }
    persist(META_KEY, meta)
  } catch { /* ignore */ }
}



function fmtPrice(price, type) {
  if (type === 'currency') return price.toFixed(4)
  if (type === 'crypto' && price < 1) return `$${price.toFixed(4)}`
  if (price >= 10000) return `$${price.toLocaleString('en-US', { maximumFractionDigits:0 })}`
  if (price >= 1000)  return `$${price.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}`
  return `$${price.toFixed(2)}`
}


/* Market-colour helpers shared by every table below */
const tone = v => v == null ? 'var(--text-3)' : v >= 0 ? 'rgb(var(--up))' : 'rgb(var(--down))'
const fmtChange = (v, type) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(type === 'currency' ? 4 : 2)}`
const fmtPctVal = v => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`

function VerdictTag({ verdict }) {
  if (!verdict) return null
  const color = { Bullish:'rgb(var(--up))', Bearish:'rgb(var(--down))', Neutral:'rgb(var(--caution))' }[verdict]
  return (
    <span className="text-[11px] font-semibold ml-2 whitespace-nowrap" style={{ color }}>{verdict}</span>
  )
}

/* ── Add-to-watchlist search box ───────────────────────────── */
function AddStockSearch({ pinned, onAdd }) {
  const [query, setQuery]       = useState('')
  const [focused, setFocused]   = useState(false)
  const [added, setAdded]       = useState(null) // symbol of last added
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearching(false); return }
    // Show local results immediately
    const localResults = ALL_ASSETS.filter(s =>
      !pinned.has(s.symbol) &&
      (s.symbol.toLowerCase().includes(query.toLowerCase()) ||
       s.name.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 4)
    setResults(localResults)

    // Then fetch live results after 350ms debounce
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const data = await api.search(query)
        const liveResults = (data.results || [])
          .filter(r => !pinned.has(r.symbol))
          .slice(0, 6)
          .map(r => ({ symbol: r.symbol, name: r.description || r.name, isLive: true }))
        const merged = [...localResults]
        for (const lr of liveResults) {
          if (!merged.find(m => m.symbol === lr.symbol)) merged.push(lr)
        }
        setResults(merged.slice(0, 8))
      } catch { /* keep local results */ }
      finally { setSearching(false) }
    }, 350)
    return () => clearTimeout(timer)
  }, [query, pinned])

  const handleSelect = (stock) => {
    if (stock.isLive) wlSaveMeta(stock.symbol, stock.name)
    onAdd(stock.symbol)
    setAdded(stock.symbol)
    setQuery('')
    setFocused(false)
    setTimeout(() => setAdded(null), 2000)
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color:'var(--text-3)' }}/>
        <input
          ref={inputRef}
          className="input pl-10 pr-9 w-full text-sm"
          style={{ borderRadius:999 }}
          aria-label="Add a stock to your watchlist"
          placeholder="Add a ticker or company…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color:'var(--text-3)' }}>
            <X size={13}/>
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {focused && results.length > 0 && (
          <motion.div
            initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:4 }}
            transition={{ duration:0.13 }}
            className="absolute z-50 w-full mt-1.5 rounded-[10px] border overflow-hidden"
            style={{ background:'var(--bg-2)', borderColor:'var(--border-light)', boxShadow:'0 8px 24px rgba(var(--shadow-color), 0.12)' }}>
            {results.map((s, i) => {
              const isUp = (s.changePct ?? 0) >= 0
              const hasPrice = typeof s.price === 'number' && !ASSET_TYPE[s.symbol]  // no stale mock prices for crypto/commodities/FX
              return (
                <button key={s.symbol} onMouseDown={() => handleSelect(s)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                  style={{ borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold" style={{ color:'var(--link)' }}>{s.symbol}</span>
                      {s.region && <span className="text-xs">{regionFlag[s.region] || ''}</span>}
                      {s.isLive && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
                          style={{ background:'var(--bg-3)', color:'var(--text-2)' }}>
                          Live
                        </span>
                      )}
                    </div>
                    <div className="text-xs truncate max-w-[200px]" style={{ color:'var(--text-3)' }}>{s.name}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasPrice && (
                      <div className="text-right">
                        <div className="text-sm font-mono font-semibold" style={{ color:'var(--text-1)' }}>
                          {fmtPrice(s.price, s.type)}
                        </div>
                        <div className="text-xs font-semibold font-mono" style={{ color: isUp ? 'rgb(var(--up))' : 'rgb(var(--down))' }}>
                          {isUp ? '+' : ''}{(s.changePct ?? 0).toFixed(2)}%
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0"
                      style={{ background:'var(--bg-3)', color:'var(--text-2)' }}>
                      <Plus size={13}/>
                    </div>
                  </div>
                </button>
              )
            })}
            {searching && (
              <div className="px-4 py-2 text-[11px] flex items-center gap-2"
                style={{ color:'var(--text-3)', borderTop:'1px solid var(--border)' }}>
                <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background:'var(--accent)' }}/>
                Searching live markets…
              </div>
            )}
          </motion.div>
        )}

        {focused && query.trim().length > 0 && results.length === 0 && (
          <motion.div
            initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="absolute z-50 w-full mt-1.5 rounded-[10px] border px-4 py-4 text-center"
            style={{ background:'var(--bg-2)', borderColor:'var(--border-light)', boxShadow:'0 8px 24px rgba(var(--shadow-color), 0.12)' }}>
            {searching ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full animate-pulse mr-2 align-middle" style={{ background:'var(--accent)' }}/>
                <span className="text-sm align-middle" style={{ color:'var(--text-3)' }}>Searching live markets…</span>
              </>
            ) : (
              <>
                <p className="text-sm" style={{ color:'var(--text-3)' }}>No match for "{query}". Try the ticker symbol or part of the company name.</p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success toast */}
      <AnimatePresence>
        {added && (
          <motion.div
            initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
            className="absolute left-0 -bottom-10 flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap"
            style={{ background:'rgb(var(--up) / .1)', color:'rgb(var(--up))', border:'1px solid rgb(var(--up) / .2)' }}>
            <CheckCircle size={12}/> {added} added to watchlist
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Shared table head ─────────────────────────────────────── */
function TableHead({ last }) {
  const cols = ['Symbol', 'Name', 'Last price', 'Change', 'Change %']
  return (
    <thead>
      <tr className="border-b" style={{ borderColor:'var(--border)' }}>
        {cols.map((c, i) => (
          <th key={c} scope="col" className={`th whitespace-nowrap ${i < 2 ? 'text-left' : 'text-right'}`}>{c}</th>
        ))}
        <th scope="col" className="th text-right w-12"><span className="sr-only">{last}</span></th>
      </tr>
    </thead>
  )
}

/* ── Pinned watchlist row ──────────────────────────────────── */
function WatchRow({ stock, type = 'stock', noLive, onRemove }) {
  const hasPrice = stock.price != null
  const color = hasPrice ? tone(stock.changePct) : 'var(--text-3)'
  const ai = stock.sector && hasPrice ? generateAIAnalysis(stock) : null

  return (
    <tr className="asset-row border-b" style={{ borderColor:'var(--border)' }}>
      <td className="td whitespace-nowrap">
        <Link to={TILE_LINK[type] || `/stock/${encodeURIComponent(stock.symbol)}`} className="link font-bold">
          {stock.symbol}
        </Link>
      </td>
      <td className="td">
        <span className="block truncate max-w-[240px]" style={{ color:'var(--text-2)' }}>{stock.name}</span>
      </td>
      <td className="td text-right whitespace-nowrap font-semibold num" style={{ color: hasPrice ? 'var(--text-1)' : 'var(--text-3)' }}>
        {hasPrice ? fmtPrice(stock.price, type) : '—'}
      </td>
      <td className="td text-right whitespace-nowrap num" style={{ color }}>
        {hasPrice ? fmtChange(stock.change, type) : '—'}
      </td>
      <td className="td text-right whitespace-nowrap num font-semibold" style={{ color }}>
        {hasPrice ? fmtPctVal(stock.changePct) : '—'}
        {!hasPrice && noLive && (
          <span className="font-normal ml-2 text-[11px]">No live price</span>
        )}
        {ai && <VerdictTag verdict={ai.verdict}/>}
      </td>
      <td className="td text-right">
        <button onClick={() => onRemove(stock.symbol)} aria-label={`Remove ${stock.symbol} from watchlist`}
          className="w-7 h-7 rounded-full inline-flex items-center justify-center transition-colors hover:bg-[var(--bg-3)]"
          style={{ color:'var(--text-3)' }}>
          <X size={13}/>
        </button>
      </td>
    </tr>
  )
}

/* ── Live wrappers for pinned rows ─────────────────────────── */
function tileBase(symbol) {
  const staticStock = ALL_ASSETS.find(s => s.symbol === symbol)
  const name = staticStock?.name || wlLoadMeta()[symbol]?.name || symbol
  return { symbol, name, sector: staticStock?.sector, region: staticStock?.region }
}

function StockWatchTile({ symbol, onRemove }) {
  const { quote } = useQuote(symbol)
  /* Null prices until live data arrives — no mock fallback */
  const stock = {
    ...tileBase(symbol),
    price:     quote?.price     ?? null,
    changePct: quote?.changePct ?? null,
    change:    quote?.change    ?? null,
  }
  return <WatchRow stock={stock} onRemove={onRemove}/>
}

function AssetWatchTile({ symbol, type, onRemove }) {
  const { quotes, ready } = useAssetQuotes()
  const q = liveQuoteFor(symbol, quotes)
  const stock = {
    ...tileBase(symbol),
    price:     q?.price     ?? null,
    changePct: q?.changePct ?? null,
    change:    q?.change    ?? null,
  }
  return <WatchRow stock={stock} type={type} noLive={!q && (ready || !ASSET_FEED[symbol])} onRemove={onRemove}/>
}

function LiveWatchTile({ symbol, onRemove }) {
  const type = ASSET_TYPE[symbol]
  return type
    ? <AssetWatchTile symbol={symbol} type={type} onRemove={onRemove}/>
    : <StockWatchTile symbol={symbol} onRemove={onRemove}/>
}

/* ── Browse-table row ──────────────────────────────────────── */
function AssetRow({ item, type, noLive, inWatchlist, onAdd, onRemove }) {
  const hasPrice = item.price != null
  const isStock  = type === 'stock'
  const color    = hasPrice ? tone(item.changePct) : 'var(--text-3)'
  const ai       = isStock && item.sector && hasPrice ? generateAIAnalysis(item) : null

  return (
    <tr className="asset-row border-b" style={{ borderColor:'var(--border)' }}>
      <td className="td whitespace-nowrap">
        {isStock
          ? <Link to={`/stock/${item.symbol}`} className="link font-bold">{item.symbol}</Link>
          : <span className="font-bold" style={{ color:'var(--text-1)' }}>{item.symbol}</span>}
      </td>
      <td className="td">
        <span className="block truncate max-w-[240px]" style={{ color:'var(--text-2)' }}>{item.name}</span>
      </td>
      <td className="td text-right whitespace-nowrap font-semibold num" style={{ color: hasPrice ? 'var(--text-1)' : 'var(--text-3)' }}>
        {hasPrice ? fmtPrice(item.price, type) : '—'}
      </td>
      <td className="td text-right whitespace-nowrap num" style={{ color }}>
        {hasPrice ? fmtChange(item.change, type) : '—'}
      </td>
      <td className="td text-right whitespace-nowrap num font-semibold" style={{ color }}>
        {hasPrice ? fmtPctVal(item.changePct) : '—'}
        {!hasPrice && noLive && (
          <span className="font-normal ml-2 text-[11px]">No live price</span>
        )}
        {ai && <VerdictTag verdict={ai.verdict}/>}
      </td>
      <td className="td text-right">
        <button
          onClick={() => inWatchlist ? onRemove(item.symbol) : onAdd(item.symbol)}
          aria-label={inWatchlist ? `Remove ${item.symbol} from watchlist` : `Add ${item.symbol} to watchlist`}
          aria-pressed={inWatchlist}
          className="w-7 h-7 rounded-full inline-flex items-center justify-center transition-colors hover:bg-[var(--bg-3)]"
          style={{ color: inWatchlist ? 'var(--brand)' : 'var(--text-3)' }}>
          <Star size={14} style={inWatchlist ? { fill:'var(--brand)' } : undefined}/>
        </button>
      </td>
    </tr>
  )
}

/* ── Section wrapper ───────────────────────────────────────── */
function SectionList({ title, items, type, noLive, pinned, onAdd, onRemove }) {
  if (!items.length) return null
  return (
    <section className="mb-8" aria-label={title}>
      <div className="flex items-baseline gap-2 mb-1">
        <h3 className="text-[1.05rem] font-bold" style={{ color:'var(--text-1)' }}>{title}</h3>
        <span className="text-xs num" style={{ color:'var(--text-3)' }}>{items.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <TableHead last="Watch"/>
          <tbody>
            {items.map(item => (
              <AssetRow key={item.symbol} item={item} type={type} noLive={noLive}
                inWatchlist={pinned.has(item.symbol)} onAdd={onAdd} onRemove={onRemove}/>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const TABS = [
  { key:'all',         label:'All'          },
  { key:'us',          label:'US'           },
  { key:'eu',          label:'Europe'       },
  { key:'asia',        label:'Asia'         },
  { key:'commodities', label:'Commodities'  },
  { key:'currencies',  label:'FX'           },
  { key:'crypto',      label:'Crypto'       },
]

/* ── Main page ─────────────────────────────────────────────── */
export default function Watchlist() {
  const [tab, setTab]       = useState('all')
  const [search, setSearch] = useState('')
  const [pinned, setPinned] = useState(loadWatchlist)

  // Persist watchlist to localStorage on change
  useEffect(() => { saveWatchlist(pinned) }, [pinned])

  const addPin    = s => setPinned(p => new Set([...p, s]))
  const removePin = s => setPinned(p => { const n = new Set(p); n.delete(s); return n })

  /* Live overlay for stock symbols in the asset browser */
  const stockSymbols = [...usStocks, ...euStocks, ...asiaStocks].map(s => s.symbol)
  const { quotes: assetQuotes } = useBatchQuotes(stockSymbols, 60_000)
  const overlay = arr => arr.map(s => {
    const q = assetQuotes[s.symbol]
    return q
      ? { ...s, price: q.price, change: q.change, changePct: q.changePct }
      : { ...s, price: null, change: null, changePct: null }
  })
  const { quotes: feedQuotes, ready: feedReady } = useAssetQuotes()

  const wlMeta = wlLoadMeta()
  const pinnedItems = [...pinned].map(sym => {
    const found = ALL_ASSETS.find(s => s.symbol === sym)
    if (found) return found
    const meta = wlMeta[sym]
    return meta ? { symbol: sym, name: meta.name, price: 0, changePct: 0, change: 0 } : null
  }).filter(Boolean)
  const stockPinned  = pinnedItems
    .filter(s => s.sector)
    .map(s => ({ ...s, changePct: assetQuotes[s.symbol]?.changePct }))
    .filter(s => Number.isFinite(s.changePct))   // only stocks with a live quote
  const bestToday    = stockPinned.length ? stockPinned.reduce((a, b) => a.changePct > b.changePct ? a : b) : null
  const worstToday   = stockPinned.length ? stockPinned.reduce((a, b) => a.changePct < b.changePct ? a : b) : null

  const filterBySearch = arr => !search ? arr : arr.filter(i =>
    i.symbol.toLowerCase().includes(search.toLowerCase()) ||
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  /* Live overlay for crypto / commodities / FX — rows without a live source show "—" */
  const overlayAsset = arr => arr.map(s => {
    const q = liveQuoteFor(s.symbol, feedQuotes)
    return q
      ? { ...s, price: q.price, change: q.change, changePct: q.changePct }
      : { ...s, price: null, change: null, changePct: null }
  })

  const sections = [
    { key:'us',          title:'United States',   items:filterBySearch(overlay(usStocks)),   type:'stock' },
    { key:'eu',          title:'Europe',           items:filterBySearch(overlay(euStocks)),   type:'stock' },
    { key:'asia',        title:'Asia Pacific',     items:filterBySearch(overlay(asiaStocks)), type:'stock' },
    { key:'commodities', title:'Commodities',      items:filterBySearch(overlayAsset(commodities)), type:'commodity' },
    { key:'currencies',  title:'Currencies / FX',  items:filterBySearch(overlayAsset(currencies)),  type:'currency' },
    { key:'crypto',      title:'Cryptocurrency',   items:filterBySearch(overlayAsset(cryptos)),     type:'crypto' },
  ]

  const visibleSections  = tab === 'all' ? sections : sections.filter(s => s.key === tab)
  const totalCount       = visibleSections.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 page-enter">

      {/* ── Header ── */}
      <PageHeader className="mb-6" title="Watchlist"
        subtitle="Track your favourite stocks, crypto, commodities & FX">
        <div className="relative w-full sm:w-80">
          <AddStockSearch pinned={pinned} onAdd={addPin}/>
        </div>
      </PageHeader>

      {/* ── Best / worst strip ── */}
      {stockPinned.length >= 2 && bestToday && worstToday && bestToday.symbol !== worstToday.symbol && (
        <dl className="flex flex-wrap gap-x-10 gap-y-3 py-3 mb-6 border-y" style={{ borderColor:'var(--border)' }}>
          {[
            { label:'Best today',  s:bestToday },
            { label:'Worst today', s:worstToday },
          ].map(({ label, s }) => (
            <div key={label} className="flex items-baseline gap-3">
              <dt className="text-xs" style={{ color:'var(--text-3)' }}>{label}</dt>
              <dd className="flex items-baseline gap-2 text-sm">
                <Link to={`/stock/${s.symbol}`} className="link font-bold">{s.symbol}</Link>
                <span className="font-semibold num" style={{ color: tone(s.changePct) }}>{fmtPctVal(s.changePct)}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* ── Pinned list ── */}
      {pinnedItems.length > 0 ? (
        <section className="mb-10" aria-label="Your watchlist">
          <div className="flex items-baseline gap-2 mb-1">
            <h2 className="section-title">Watching</h2>
            <span className="text-xs num" style={{ color:'var(--text-3)' }}>{pinnedItems.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <TableHead last="Remove"/>
              <tbody>
                {pinnedItems.map(s => (
                  <LiveWatchTile key={s.symbol} symbol={s.symbol} onRemove={removePin}/>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        /* Empty state */
        <p className="text-sm py-6 mb-8 border-y" style={{ color:'var(--text-2)', borderColor:'var(--border)' }}>
          Your watchlist is empty. Search for a ticker or company above, or tap the star on any row below.
        </p>
      )}

      {/* ── Browse markets ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <h2 className="section-title">Browse markets</h2>
        <div className="relative">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'var(--text-3)' }}/>
          <input
            className="input pl-9 w-full sm:w-56 text-sm"
            style={{ borderRadius:999 }}
            placeholder="Filter…"
            aria-label="Filter markets by ticker or name"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div role="tablist" aria-label="Market groups"
        className="flex gap-6 border-b mb-6 overflow-x-auto" style={{ borderColor:'var(--border)' }}>
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} role="tab" aria-selected={active} onClick={() => setTab(t.key)}
              className="py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors"
              style={{ color: active ? 'var(--text-1)' : 'var(--text-3)', borderColor: active ? 'var(--brand)' : 'transparent' }}>
              {t.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab + search}
          initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
          transition={{ duration:0.16 }}>
          {visibleSections.map(s => (
            <SectionList key={s.key} title={s.title} items={s.items} type={s.type} noLive={s.type !== 'stock' && feedReady}
              pinned={pinned} onAdd={addPin} onRemove={removePin}/>
          ))}
          {totalCount === 0 && (
            <p className="text-sm py-12" style={{ color:'var(--text-3)' }}>
              No results for "{search}". Check the spelling or clear the filter.
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
