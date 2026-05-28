import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookMarked, Search, Star, X, TrendingUp, TrendingDown, Brain, Plus, CheckCircle } from 'lucide-react'
import { usStocks, euStocks, asiaStocks, commodities, currencies, cryptos } from '../data/mockData'
import { generateAIAnalysis } from '../utils/aiAnalysis'
import { api } from '../services/api'
import { useQuote } from '../hooks/useQuote'
import { useBatchQuotes } from '../hooks/useBatchQuotes'

const ALL_ASSETS = [...usStocks, ...euStocks, ...asiaStocks, ...cryptos, ...commodities, ...currencies]

const regionFlag = {}  // Region flags removed — region shows as a chip with text instead

/* ── localStorage helpers ──────────────────────────────────── */
const STORAGE_KEY = 'foliyo_watchlist'
const loadWatchlist = () => {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) }
  catch { return new Set() }
}
const saveWatchlist = (set) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
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
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch { /* ignore */ }
}

/* ── Deterministic sparkline ───────────────────────────────── */
function buildSparkline(price, changePct, n = 14) {
  const seed = price % 97
  const trend = changePct / 100
  let current = price * (1 - Math.abs(trend) * 2.5)
  const result = []
  for (let i = 0; i < n; i++) {
    const noise = Math.sin(i * 2.3 + seed) * price * 0.006
                + Math.cos(i * 1.7 + seed * 0.4) * price * 0.003
    current += noise + (trend * price) / (n - 1)
    result.push(current)
  }
  return result
}

function Sparkline({ id, price, changePct, width = 72, height = 28 }) {
  const data = buildSparkline(price, changePct)
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || price * 0.001
  const pad = 2
  const pts = data.map((p, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - pad - ((p - min) / range) * (height - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = pts.join(' ')
  const fill = `0,${height} ${line} ${width},${height}`
  const color = changePct >= 0 ? '#10b981' : '#ef4444'
  const gid = `sp${id.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow:'visible', display:'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#${gid})`}/>
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function fmtPrice(price, type) {
  if (type === 'currency') return price.toFixed(4)
  if (price >= 10000) return `$${price.toLocaleString('en-US', { maximumFractionDigits:0 })}`
  if (price >= 1000)  return `$${price.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}`
  return `$${price.toFixed(2)}`
}

function VerdictTag({ verdict }) {
  if (!verdict) return null
  const cfg = {
    Bullish: { color:'#10b981', bg:'rgba(16,185,129,.12)' },
    Bearish: { color:'#ef4444', bg:'rgba(239,68,68,.12)'  },
    Neutral: { color:'#f59e0b', bg:'rgba(245,158,11,.12)' },
  }[verdict] || {}
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
      style={{ color:cfg.color, background:cfg.bg }}>
      {verdict}
    </span>
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
          className="input pl-10 pr-4 w-full text-sm"
          placeholder="Search by ticker or company name…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
        />
        {query && (
          <button onClick={() => setQuery('')}
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
            className="absolute z-50 w-full mt-1.5 rounded-xl border shadow-2xl overflow-hidden"
            style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
            {results.map((s, i) => {
              const isUp = (s.changePct ?? 0) >= 0
              const hasPrice = typeof s.price === 'number'
              return (
                <button key={s.symbol} onMouseDown={() => handleSelect(s)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                  style={{ borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                      style={{ background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)' }}>
                      {s.symbol.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>{s.symbol}</span>
                        {s.region && <span className="text-xs">{regionFlag[s.region] || ''}</span>}
                        {s.isLive && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded leading-none"
                            style={{ background:'rgba(var(--accent-rgb),.12)', color:'var(--accent)' }}>
                            LIVE
                          </span>
                        )}
                      </div>
                      <div className="text-xs truncate max-w-[160px]" style={{ color:'var(--text-3)' }}>{s.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasPrice && (
                      <div className="text-right">
                        <div className="text-sm font-mono font-semibold" style={{ color:'var(--text-1)' }}>
                          {fmtPrice(s.price, s.type)}
                        </div>
                        <div className={`text-xs font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isUp ? '+' : ''}{(s.changePct ?? 0).toFixed(2)}%
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shrink-0"
                      style={{ background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)' }}>
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
            className="absolute z-50 w-full mt-1.5 rounded-xl border px-4 py-5 text-center"
            style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
            {searching ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full animate-pulse mr-2 align-middle" style={{ background:'var(--accent)' }}/>
                <span className="text-sm align-middle" style={{ color:'var(--text-3)' }}>Searching live markets…</span>
              </>
            ) : (
              <>
                <Search size={20} className="mx-auto mb-2 opacity-20" style={{ color:'var(--text-3)' }}/>
                <p className="text-sm" style={{ color:'var(--text-3)' }}>No results for "{query}"</p>
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
            className="absolute left-0 -bottom-10 flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background:'rgba(16,185,129,.1)', color:'#10b981', border:'1px solid rgba(16,185,129,.2)' }}>
            <CheckCircle size={12}/> {added} added to watchlist
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Pinned watchlist tile ─────────────────────────────────── */
function WatchTile({ stock, onRemove }) {
  const hasPrice = stock.price != null
  const up = hasPrice && stock.changePct >= 0
  const color = !hasPrice ? '#94a3b8' : up ? '#10b981' : '#ef4444'
  const ai = stock.sector && hasPrice ? generateAIAnalysis(stock) : null

  return (
    <div className="relative group">
      <Link to={`/stock/${stock.symbol}`}>
        <motion.div
          whileHover={{ y:-4, scale:1.02 }}
          whileTap={{ scale:0.97 }}
          transition={{ type:'spring', stiffness:400, damping:28 }}
          className="rounded-2xl p-4 h-full flex flex-col"
          style={{
            background: !hasPrice
              ? 'linear-gradient(145deg, rgba(148,163,184,0.06), rgba(148,163,184,0.02))'
              : up
                ? 'linear-gradient(145deg, rgba(16,185,129,0.07), rgba(16,185,129,0.03))'
                : 'linear-gradient(145deg, rgba(239,68,68,0.07), rgba(239,68,68,0.03))',
            border: `1px solid ${!hasPrice ? 'rgba(148,163,184,0.18)' : up ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}`,
          }}>
          <div className="flex items-start justify-between mb-1 gap-1">
            <span className="font-black text-sm leading-none" style={{ color:'var(--text-1)' }}>
              {stock.symbol}
            </span>
            <div className="flex items-center gap-1">
              {ai && <VerdictTag verdict={ai.verdict}/>}
              {stock.region && <span className="text-xs leading-none">{regionFlag[stock.region] || ''}</span>}
            </div>
          </div>
          <div className="text-xs leading-none mb-3 truncate" style={{ color:'var(--text-3)' }}>
            {stock.name.split(' ').slice(0, 3).join(' ')}
          </div>
          <div className="flex-1 flex items-center mb-3">
            <Sparkline id={stock.symbol} price={stock.price} changePct={stock.changePct} width={108} height={40}/>
          </div>
          <div>
            <div className="font-black font-mono text-lg leading-none tracking-tight" style={{ color: hasPrice ? 'var(--text-1)' : 'var(--text-3)' }}>
              {hasPrice ? fmtPrice(stock.price, 'stock') : '—'}
            </div>
            <div className="text-xs font-bold mt-1" style={{ color }}>
              {hasPrice ? `${up ? '+' : ''}${stock.changePct.toFixed(2)}%` : '—'}
              {hasPrice && stock.change != null && (
                <span className="font-normal ml-1 opacity-70">
                  {up ? '+' : ''}{stock.change.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
      <button
        onClick={() => onRemove(stock.symbol)}
        className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center z-10
                   opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-white/15"
        style={{ color:'var(--text-3)' }}>
        <X size={10}/>
      </button>
    </div>
  )
}

/* ── Live wrapper for pinned tiles ─────────────────────────── */
function LiveWatchTile({ symbol, onRemove }) {
  const { quote } = useQuote(symbol)
  const staticStock = ALL_ASSETS.find(s => s.symbol === symbol)
  const meta = wlLoadMeta()
  const name = staticStock?.name || meta[symbol]?.name || symbol
  /* Null prices until live data arrives — no mock fallback */
  const stock = {
    symbol,
    name,
    price:     quote?.price     ?? null,
    changePct: quote?.changePct ?? null,
    change:    quote?.change    ?? null,
    sector:    staticStock?.sector,
    region:    staticStock?.region,
  }
  return <WatchTile stock={stock} onRemove={onRemove}/>
}

/* ── Asset list row ────────────────────────────────────────── */
function AssetRow({ item, type, inWatchlist, onAdd, onRemove, index }) {
  const hasPrice = item.price != null
  const isUp     = hasPrice && item.changePct >= 0
  const isStock  = type === 'stock'
  const ai       = isStock && item.sector && hasPrice ? generateAIAnalysis(item) : null

  const inner = (
    <motion.div
      initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
      transition={{ delay: Math.min(index * 0.018, 0.35) }}
      className="asset-row flex items-center gap-3 px-4 py-3 border-b"
      style={{ borderColor:'var(--border)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
        style={{ background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.15)` }}>
        {item.symbol.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-sm" style={{ color:'var(--text-1)' }}>{item.symbol}</span>
          {item.region && <span className="text-xs">{regionFlag[item.region] || ''}</span>}
          {ai && <VerdictTag verdict={ai.verdict}/>}
        </div>
        <div className="text-xs truncate" style={{ color:'var(--text-3)' }}>{item.name}</div>
      </div>
      <div className="hidden sm:block shrink-0">
        <Sparkline id={item.symbol} price={item.price} changePct={item.changePct} width={68} height={26}/>
      </div>
      <div className="text-right shrink-0 min-w-[78px]">
        <div className="font-mono font-bold text-sm" style={{ color: hasPrice ? 'var(--text-1)' : 'var(--text-3)' }}>
          {hasPrice ? fmtPrice(item.price, type) : '—'}
        </div>
        <div className={`text-xs font-semibold flex items-center justify-end gap-0.5 mt-0.5 ${!hasPrice ? 'text-slate-500' : isUp ? 'text-emerald-400' : 'text-red-400'}`}>
          {hasPrice && (isUp ? <TrendingUp size={9}/> : <TrendingDown size={9}/>)}
          {hasPrice ? `${isUp ? '+' : ''}${item.changePct.toFixed(2)}%` : '—'}
        </div>
      </div>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); inWatchlist ? onRemove(item.symbol) : onAdd(item.symbol) }}
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
        style={{ color: inWatchlist ? '#eab308' : 'var(--text-3)' }}>
        <Star size={13} className={inWatchlist ? 'fill-yellow-400' : ''}/>
      </button>
    </motion.div>
  )

  return isStock ? <Link to={`/stock/${item.symbol}`} className="block">{inner}</Link> : <div>{inner}</div>
}

/* ── Section wrapper ───────────────────────────────────────── */
function SectionList({ title, items, type, flag, pinned, onAdd, onRemove }) {
  if (!items.length) return null
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2 px-0.5">
        {flag && <span className="text-sm">{flag}</span>}
        <span className="section-label">{title}</span>
        <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
          style={{ background:'var(--bg-3)', color:'var(--text-3)' }}>{items.length}</span>
      </div>
      <div className="rounded-2xl overflow-hidden border"
        style={{ borderColor:'var(--border)', background:'var(--bg-1)' }}>
        {items.map((item, i) => (
          <AssetRow key={item.symbol} item={item} type={type} index={i}
            inWatchlist={pinned.has(item.symbol)} onAdd={onAdd} onRemove={onRemove}/>
        ))}
      </div>
    </div>
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

  const wlMeta = wlLoadMeta()
  const pinnedItems = [...pinned].map(sym => {
    const found = ALL_ASSETS.find(s => s.symbol === sym)
    if (found) return found
    const meta = wlMeta[sym]
    return meta ? { symbol: sym, name: meta.name, price: 0, changePct: 0, change: 0 } : null
  }).filter(Boolean)
  const stockPinned  = pinnedItems.filter(s => s.sector)
  const bestToday    = stockPinned.length ? stockPinned.reduce((a, b) => a.changePct > b.changePct ? a : b) : null
  const worstToday   = stockPinned.length ? stockPinned.reduce((a, b) => a.changePct < b.changePct ? a : b) : null

  const filterBySearch = arr => !search ? arr : arr.filter(i =>
    i.symbol.toLowerCase().includes(search.toLowerCase()) ||
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  /* Live overlay for stock symbols in the asset browser */
  const stockSymbols = [...usStocks, ...euStocks, ...asiaStocks].map(s => s.symbol)
  const { quotes: assetQuotes } = useBatchQuotes(stockSymbols, 60_000)
  const overlay = arr => arr.map(s => {
    const q = assetQuotes[s.symbol]
    return q
      ? { ...s, price: q.price, change: q.change, changePct: q.changePct }
      : { ...s, price: null, change: null, changePct: null }
  })

  const sections = [
    { key:'us',          title:'United States',   items:filterBySearch(overlay(usStocks)),   type:'stock' },
    { key:'eu',          title:'Europe',           items:filterBySearch(overlay(euStocks)),   type:'stock' },
    { key:'asia',        title:'Asia Pacific',     items:filterBySearch(overlay(asiaStocks)), type:'stock' },
    { key:'commodities', title:'Commodities',      items:filterBySearch(commodities), type:'commodity' },
    { key:'currencies',  title:'Currencies / FX',  items:filterBySearch(currencies),  type:'currency' },
    { key:'crypto',      title:'Cryptocurrency',   items:filterBySearch(cryptos),     type:'crypto' },
  ]

  const visibleSections  = tab === 'all' ? sections : sections.filter(s => s.key === tab)
  const totalCount       = visibleSections.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 page-enter">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-7">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2.5" style={{ color:'var(--text-1)' }}>
            <BookMarked size={21} style={{ color:'var(--accent)' }}/>
            Watchlist
          </h1>
          <p className="text-sm mt-0.5" style={{ color:'var(--text-3)' }}>
            Track your favourite stocks, crypto, commodities & FX
          </p>
        </div>
        {/* Add stock search */}
        <div className="relative">
          <AddStockSearch pinned={pinned} onAdd={addPin}/>
        </div>
      </div>

      {/* Watchlist Intelligence bar */}
      {stockPinned.length >= 2 && bestToday && worstToday && bestToday.symbol !== worstToday.symbol && (
        <motion.div
          initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          className="rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3 border"
          style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Brain size={13} style={{ color:'var(--accent)' }}/>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color:'var(--text-3)' }}>
              Watchlist Intelligence
            </span>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <TrendingUp size={13} className="text-emerald-400 shrink-0"/>
              <span className="text-xs" style={{ color:'var(--text-3)' }}>Best today:</span>
              <Link to={`/stock/${bestToday.symbol}`} className="text-xs font-bold hover:underline" style={{ color:'var(--text-1)' }}>
                {bestToday.symbol}
              </Link>
              <span className="text-xs font-bold text-emerald-400">+{bestToday.changePct.toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown size={13} className="text-red-400 shrink-0"/>
              <span className="text-xs" style={{ color:'var(--text-3)' }}>Worst today:</span>
              <Link to={`/stock/${worstToday.symbol}`} className="text-xs font-bold hover:underline" style={{ color:'var(--text-1)' }}>
                {worstToday.symbol}
              </Link>
              <span className="text-xs font-bold text-red-400">{worstToday.changePct.toFixed(2)}%</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Pinned tiles */}
      {pinnedItems.length > 0 ? (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Star size={12} className="text-yellow-400 fill-yellow-400"/>
            <span className="section-label">Watching</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
              style={{ background:'var(--bg-3)', color:'var(--text-3)' }}>{pinnedItems.length}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {pinnedItems.map((s, i) => (
              <motion.div key={s.symbol}
                initial={{ opacity:0, scale:0.93, y:8 }}
                animate={{ opacity:1, scale:1, y:0 }}
                transition={{ delay: i * 0.05, type:'spring', stiffness:400, damping:30 }}>
                <LiveWatchTile symbol={s.symbol} onRemove={removePin}/>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty state */
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
          className="rounded-2xl border p-10 mb-8 text-center"
          style={{ background:'var(--bg-2)', borderColor:'var(--border)', borderStyle:'dashed' }}>
          <Star size={36} className="mx-auto mb-3 opacity-20" style={{ color:'var(--text-3)' }}/>
          <h3 className="font-bold text-base mb-1" style={{ color:'var(--text-1)' }}>Your watchlist is empty</h3>
          <p className="text-sm" style={{ color:'var(--text-3)' }}>
            Search for stocks above to start tracking your favourite assets.
          </p>
        </motion.div>
      )}

      {/* Browse section header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color:'var(--text-3)' }}>
          Browse Markets
        </h2>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-3)' }}/>
          <input
            className="input pl-9 w-52 text-sm"
            placeholder="Filter…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl border mb-6 w-fit overflow-x-auto"
        style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
            style={tab === t.key
              ? { background:`rgba(var(--accent-rgb),.12)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.2)` }
              : { color:'var(--text-3)', border:'1px solid transparent' }
            }>{t.label}</button>
        ))}
      </div>

      {/* Asset sections */}
      <AnimatePresence mode="wait">
        <motion.div key={tab + search}
          initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
          transition={{ duration:0.18 }}>
          {visibleSections.map(s => (
            <SectionList key={s.key} title={s.title} items={s.items} type={s.type}
              flag={s.flag} pinned={pinned} onAdd={addPin} onRemove={removePin}/>
          ))}
          {totalCount === 0 && (
            <div className="text-center py-20" style={{ color:'var(--text-3)' }}>
              <Search size={32} className="mx-auto mb-3 opacity-20"/>
              <p className="text-sm">No results for "{search}"</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
