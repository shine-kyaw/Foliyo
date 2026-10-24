import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, GitCompare, Brain } from 'lucide-react'
import { stocks as baseStocks } from '../data/mockData'
import { generateAIAnalysis, generateComparisonSummary } from '../utils/aiAnalysis'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import { fmtPrice, fmtPct } from '../utils/formatLive'
import PageHeader from '../components/PageHeader'

/* ── Verdict badge ─────────────────────────────────────────── */
const VerdictBadge = ({ verdict }) => {
  const cfg = {
    Bullish: { color:'rgb(var(--up))',      bg:'rgb(var(--up) / .1)' },
    Bearish: { color:'rgb(var(--down))',    bg:'rgb(var(--down) / .1)' },
    Neutral: { color:'rgb(var(--caution))', bg:'rgb(var(--caution) / .1)' },
  }[verdict] || { color:'var(--text-2)', bg:'var(--bg-3)' }
  return (
    <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded"
      style={{ color:cfg.color, background:cfg.bg }}>
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
                  <div>
                    <div className="text-sm font-bold link">{s.symbol}</div>
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
  <tr className="border-t" style={{ borderColor:'var(--border)' }}>
    <th scope="row" className="px-4 py-3 text-left text-[13px] font-medium whitespace-nowrap" style={{ color:'var(--text-3)', width:'160px' }}>{label}</th>
    {values.map((v, i) => (
      <td key={i} className="px-4 py-3 text-sm num font-bold text-right whitespace-nowrap"
        style={{ color: highlight && highlight[i] ? highlight[i] : 'var(--text-1)' }}>
        {v ?? '—'}
      </td>
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
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6 page-enter">

      {/* ── Header ── */}
      <PageHeader title="Compare" subtitle="Put up to three stocks side by side on price, valuation and the AI read." />

      {/* ── Search + selected tickers ── */}
      <div className="max-w-xl">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {selectedStocks.map(s => (
            <span key={s.symbol}
              className="inline-flex items-center gap-1.5 text-sm font-bold pl-3 pr-1.5 py-1 rounded-full border"
              style={{ background:'var(--bg-3)', borderColor:'var(--border)', color:'var(--text-1)' }}>
              {s.symbol}
              <button onClick={() => removeStock(s.symbol)} aria-label={`Remove ${s.symbol}`}
                className="w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-[var(--border)] transition-colors">
                <X size={12}/>
              </button>
            </span>
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

      {/* ── Empty state ── */}
      {selectedStocks.length === 0 && (
        <div className="border-y py-14 text-center" style={{ borderColor:'var(--border)' }}>
          <GitCompare size={28} className="mx-auto mb-3 opacity-40" style={{ color:'var(--text-3)' }}/>
          <p className="text-sm font-semibold" style={{ color:'var(--text-2)' }}>No stocks selected</p>
          <p className="text-xs mt-1" style={{ color:'var(--text-3)' }}>Search a ticker or company above to add your first stock.</p>
        </div>
      )}

      {/* ── Comparison table ── */}
      {selectedStocks.length >= 2 && (
        <section aria-label="Comparison">
          <div className="overflow-x-auto rounded-[10px] border" style={{ borderColor:'var(--border)', background:'var(--bg-2)' }}>
            <table className="w-full min-w-[480px] border-collapse">
              <thead>
                <tr>
                  <th scope="col" className="px-4 py-4 text-left text-xs font-semibold" style={{ color:'var(--text-3)', width:'160px' }}>Metric</th>
                  {selectedStocks.map(s => (
                    <th key={s.symbol} scope="col" className="px-4 py-4 text-right font-normal">
                      <Link to={`/stock/${s.symbol}`} className="text-[15px] font-bold link">{s.symbol}</Link>
                      <div className="text-xs truncate max-w-[160px] ml-auto" style={{ color:'var(--text-3)' }}>{s.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metricRows.map((row, i) => (
                  row.badges ? (
                    <tr key={i} className="border-t" style={{ borderColor:'var(--border)' }}>
                      <th scope="row" className="px-4 py-3 text-left text-[13px] font-medium whitespace-nowrap" style={{ color:'var(--text-3)' }}>{row.label}</th>
                      {row.badges.map((verdict, j) => (
                        <td key={j} className="px-4 py-3 text-right">
                          <VerdictBadge verdict={verdict}/>
                        </td>
                      ))}
                    </tr>
                  ) : (
                    <MetricRow key={i} label={row.label} values={row.vals} highlight={row.colors}/>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Individual AI reads ── */}
      {analyses.length >= 1 && (
        <div className={`grid gap-4 ${analyses.length === 1 ? '' : analyses.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
          {analyses.map(({ symbol, name, ai }) => {
            if (!ai) return null
            return (
              <div key={symbol} className="card-flat space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/stock/${symbol}`} className="text-[15px] font-bold link">{symbol}</Link>
                    <p className="text-xs truncate" style={{ color:'var(--text-3)' }}>{name}</p>
                  </div>
                  <VerdictBadge verdict={ai.verdict}/>
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color:'var(--text-2)' }}>{ai.summary}</p>
                <div className="border-t pt-3" style={{ borderColor:'var(--border)' }}>
                  <div className="section-label mb-1.5">Technical</div>
                  <p className="text-[13px] leading-relaxed" style={{ color:'var(--text-2)' }}>{ai.techSummary}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Comparison summary ── */}
      {compSummary && (
        <div className="card-flat" style={{ background:'var(--bg-1)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Brain size={14} style={{ color:'var(--text-2)' }}/>
            <h2 className="section-title">AI comparison summary</h2>
          </div>
          <p className="text-sm leading-relaxed" style={{ color:'var(--text-2)' }}>{compSummary}</p>
          <p className="text-xs mt-3" style={{ color:'var(--text-3)' }}>
            For informational purposes only. Not financial advice.
          </p>
        </div>
      )}

    </div>
  )
}
