import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, GitCompare, Brain, Plus } from 'lucide-react'
import { stocks as baseStocks } from '../data/mockData'
import { generateAIAnalysis, generateComparisonSummary } from '../utils/aiAnalysis'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import { fmtPrice, fmtPct } from '../utils/formatLive'
import PageHeader from '../components/PageHeader'

/* ── Verdict badge ─────────────────────────────────────────── */
const VerdictBadge = ({ verdict }) => {
  const cfg = {
    Bullish: { color:'rgb(var(--up))',      bg:'rgb(var(--up) / .1)',      border:'rgb(var(--up) / .2)' },
    Bearish: { color:'rgb(var(--down))',    bg:'rgb(var(--down) / .1)',    border:'rgb(var(--down) / .2)' },
    Neutral: { color:'rgb(var(--caution))', bg:'rgb(var(--caution) / .1)', border:'rgb(var(--caution) / .2)' },
  }[verdict] || {}
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-md"
      style={{ color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.border}` }}>
      {verdict}
    </span>
  )
}

/* ── Stock search box ──────────────────────────────────────── */
function StockSearch({ onAdd, existing }) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  const baseResults = query.trim().length > 0
    ? baseStocks.filter(s =>
        !existing.includes(s.symbol) &&
        (s.symbol.toLowerCase().includes(query.toLowerCase()) ||
         s.name.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 6)
    : []

  const { quotes } = useBatchQuotes(baseResults.map(s => s.symbol), 0)
  const results = baseResults.map(s => {
    const q = quotes[s.symbol]
    return q
      ? { ...s, price: q.price, change: q.change, changePct: q.changePct }
      : { ...s, price: null, change: null, changePct: null }
  })

  const handleSelect = (s) => { onAdd(s.symbol); setQuery(''); setFocused(false) }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-3)' }}/>
        <input
          className="input text-sm pl-9 py-2.5 w-full"
          aria-label="Search symbol or company"
          placeholder="Search symbol or company"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
      </div>
      <AnimatePresence>
        {focused && results.length > 0 && (
          <motion.div
            initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:4 }}
            className="absolute z-50 w-full mt-1 rounded-lg border shadow-xl overflow-hidden"
            style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
            {results.map(s => (
              <button key={s.symbol} onMouseDown={() => handleSelect(s)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                style={{ borderBottom:'1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-black shrink-0"
                    style={{ background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)' }}>
                    {s.symbol.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color:'var(--text-1)' }}>{s.symbol}</div>
                    <div className="text-xs truncate max-w-[160px]" style={{ color:'var(--text-3)' }}>{s.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-semibold" style={{ color: s.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
                    {fmtPrice(s.price)}
                  </div>
                  <div className={`text-xs font-bold font-mono ${s.changePct == null ? 'text-[var(--text-3)]' : s.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmtPct(s.changePct)}
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Metric row ────────────────────────────────────────────── */
const MetricRow = ({ label, values, highlight }) => (
  <tr className="border-b" style={{ borderColor:'var(--border)' }}>
    <td className="px-4 py-3 text-xs font-medium" style={{ color:'var(--text-3)', width:'140px' }}>{label}</td>
    {values.map((v, i) => (
      <td key={i} className="px-4 py-3 text-sm font-mono font-semibold text-center"
        style={{ color: highlight && highlight[i] ? highlight[i] : 'var(--text-1)' }}>
        {v ?? '—'}
      </td>
    ))}
    {values.length < 3 && Array.from({ length: 3 - values.length }).map((_, i) => (
      <td key={`empty-${i}`} className="px-4 py-3 text-sm text-center" style={{ color:'var(--text-3)' }}>—</td>
    ))}
  </tr>
)

/* ── Main page ─────────────────────────────────────────────── */
export default function Compare() {
  const [searchParams] = useSearchParams()
  const initialA = searchParams.get('a')

  const [selected, setSelected] = useState(() => {
    if (initialA) {
      const s = baseStocks.find(st => st.symbol === initialA)
      return s ? [s.symbol] : []
    }
    return []
  })

  /* Live quotes for whichever stocks are currently selected. Null out
   * unmatched mock fields so the comparison table shows "—" until data lands. */
  const { quotes } = useBatchQuotes(selected, 60_000)
  const stocks = useMemo(() => baseStocks.map(s => {
    const q = quotes[s.symbol]
    return q
      ? { ...s, price: q.price, change: q.change, changePct: q.changePct }
      : { ...s, price: null, change: null, changePct: null }
  }), [quotes])

  const selectedStocks = selected.map(sym => stocks.find(s => s.symbol === sym)).filter(Boolean)

  const addStock = (sym) => {
    if (selected.length >= 3 || selected.includes(sym)) return
    setSelected(prev => [...prev, sym])
  }

  const removeStock = (sym) => setSelected(prev => prev.filter(s => s !== sym))

  const analyses = selectedStocks.map(s => ({ ...s, ai: generateAIAnalysis(s) }))
  const compSummary = selectedStocks.length >= 2 ? generateComparisonSummary(selectedStocks) : ''

  const buildMetrics = (stocks) => {
    if (!stocks.length) return []
    return [
      { label:'Price',       vals: stocks.map(s => fmtPrice(s.price)) },
      { label:'Day change',  vals: stocks.map(s => fmtPct(s.changePct)),
        colors: stocks.map(s => s.changePct == null ? 'var(--text-3)' : s.changePct >= 0 ? 'rgb(var(--up))' : 'rgb(var(--down))') },
      { label:'Market cap',  vals: stocks.map(s => s.mktCap) },
      { label:'P/E ratio',   vals: stocks.map(s => s.pe ? `${s.pe}x` : null) },
      { label:'EPS (price ÷ P/E)',         vals: stocks.map(s => s.pe && s.price != null ? `$${(s.price / s.pe).toFixed(2)}` : null) },
      { label:'Volume',      vals: stocks.map(s => s.volume) },
      { label:'Sector',      vals: stocks.map(s => s.sector) },
      { label:'Exchange',    vals: stocks.map(s => s.exchange || 'NASDAQ') },
      { label:'AI verdict',  vals: null, badges: stocks.map(s => generateAIAnalysis(s)?.verdict) },
    ]
  }

  const metricRows = buildMetrics(selectedStocks)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 page-enter">

      {/* Header */}
      <PageHeader title="Compare" subtitle="Put up to three stocks side by side on price, valuation and the AI read." />

      {/* Search + selected chips */}
      <div className="card-flat">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {selectedStocks.map(s => (
            <div key={s.symbol}
              className="flex items-center gap-2 text-sm font-bold font-mono px-3 py-1.5 rounded-md border"
              style={{ background:'rgba(var(--accent-rgb),.12)', borderColor:'rgba(var(--accent-rgb),.25)', color:'var(--text-1)' }}>
              {s.symbol}
              <button onClick={() => removeStock(s.symbol)} aria-label={`Remove ${s.symbol}`}
                className="ml-0.5 hover:opacity-70 transition-opacity">
                <X size={12}/>
              </button>
            </div>
          ))}
          {selectedStocks.length < 3 && (
            <span className="text-xs" style={{ color:'var(--text-3)' }}>
              {selectedStocks.length === 0 ? 'Add up to 3 stocks to compare' : selectedStocks.length === 1 ? 'Add at least one more to compare' : 'Add one more, or compare these two'}
            </span>
          )}
        </div>
        {selected.length < 3 && (
          <StockSearch onAdd={addStock} existing={selected}/>
        )}
      </div>

      {/* Empty state */}
      {selectedStocks.length === 0 && (
        <motion.div
          initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
          className="card-flat text-center py-16">
          <GitCompare size={32} className="mx-auto mb-4 opacity-30" style={{ color:'var(--text-3)' }}/>
          <p className="text-sm font-semibold" style={{ color:'var(--text-2)' }}>No stocks selected</p>
          <p className="text-xs mt-1" style={{ color:'var(--text-3)' }}>Search a ticker or company above to add your first stock.</p>
        </motion.div>
      )}

      {/* Comparison table */}
      {selectedStocks.length >= 2 && (
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
          className="rounded-xl overflow-hidden border" style={{ borderColor:'var(--border)' }}>

          {/* Table head — stock names */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background:'var(--bg-2)', borderBottom:'1px solid var(--border)' }}>
                  <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color:'var(--text-3)', width:'140px' }}>Metric</th>
                  {selectedStocks.map(s => (
                    <th key={s.symbol} className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black mx-auto"
                          style={{ background:'rgba(var(--accent-rgb),.12)', color:'var(--accent)' }}>
                          {s.symbol.charAt(0)}
                        </div>
                        <div className="text-sm font-black" style={{ color:'var(--text-1)' }}>{s.symbol}</div>
                        <div className="text-xs truncate max-w-[120px]" style={{ color:'var(--text-3)' }}>{s.name}</div>
                      </div>
                    </th>
                  ))}
                  {selectedStocks.length < 3 && (
                    <th className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-1 opacity-30">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-dashed mx-auto"
                          style={{ borderColor:'var(--border)' }}>
                          <Plus size={14} style={{ color:'var(--text-3)' }}/>
                        </div>
                        <div className="text-xs" style={{ color:'var(--text-3)' }}>Add stock</div>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody style={{ background:'var(--bg-1)' }}>
                {metricRows.map((row, i) => (
                  row.badges ? (
                    <tr key={i} className="border-b" style={{ borderColor:'var(--border)' }}>
                      <td className="px-4 py-3 text-xs font-medium" style={{ color:'var(--text-3)' }}>{row.label}</td>
                      {row.badges.map((verdict, j) => (
                        <td key={j} className="px-4 py-3 text-center">
                          <VerdictBadge verdict={verdict}/>
                        </td>
                      ))}
                      {row.badges.length < 3 && Array.from({ length: 3 - row.badges.length }).map((_, j) => (
                        <td key={`empty-${j}`} className="px-4 py-3 text-sm text-center" style={{ color:'var(--text-3)' }}>—</td>
                      ))}
                    </tr>
                  ) : (
                    <MetricRow key={i} label={row.label} values={row.vals} highlight={row.colors}/>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Individual AI cards */}
      {analyses.length >= 1 && (
        <div className={`grid gap-4 ${analyses.length === 1 ? '' : analyses.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
          {analyses.map(({ symbol, name, ai }) => {
            if (!ai) return null
            return (
              <motion.div key={symbol}
                initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
                className="card-flat space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Link to={`/stock/${symbol}`}
                      className="text-sm font-black hover:text-accent transition-colors"
                      style={{ color:'var(--text-1)' }}>
                      {symbol}
                    </Link>
                    <p className="text-xs truncate" style={{ color:'var(--text-3)' }}>{name}</p>
                  </div>
                  <VerdictBadge verdict={ai.verdict}/>
                </div>
                <div className="rounded-lg p-3 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
                  <p className="text-xs leading-relaxed" style={{ color:'var(--text-2)' }}>{ai.summary}</p>
                </div>
                <div className="rounded-lg p-3 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color:'var(--text-3)' }}>Technical</div>
                  <p className="text-xs leading-relaxed" style={{ color:'var(--text-2)' }}>{ai.techSummary}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* AI comparison summary */}
      {compSummary && (
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
          className="card-flat">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={14} style={{ color:'var(--accent)' }}/>
            <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>AI Comparison Summary</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color:'var(--text-2)' }}>{compSummary}</p>
          <p className="text-xs mt-3" style={{ color:'var(--text-3)' }}>
            For informational purposes only. Not financial advice.
          </p>
        </motion.div>
      )}

    </div>
  )
}
