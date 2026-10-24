import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { usStocks, euStocks, asiaStocks } from '../data/mockData'
import { ysxStocks } from '../data/myanmarStocks'
import { api } from '../services/api'

/* ── Quote lookup ──────────────────────────────────────────────
   Our own lists answer instantly; the search API fills in anything
   else that trades. Enter opens the top match.                   */
const LOCAL = [
  ...[...usStocks, ...euStocks, ...asiaStocks].map(s => ({ symbol: s.symbol, name: s.name, exchange: s.region === 'US' ? 'US' : s.region || '' })),
  ...ysxStocks.map(s => ({ symbol: s.code, name: s.name, exchange: 'YSX', ysx: true })),
]

const hrefFor = r => r.ysx || r.type === 'YSX' ? `/myanmar-stocks/${r.symbol}` : `/stock/${encodeURIComponent(r.symbol)}`

export default function SearchBox({ placeholder = 'Search for tickers or companies', size = 'md', autoFocus = false, className = '' }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [remote, setRemote] = useState([])
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const boxRef = useRef(null)

  const term = q.trim().toLowerCase()
  const local = term
    ? LOCAL.filter(s => s.symbol.toLowerCase().startsWith(term) || s.name.toLowerCase().includes(term)).slice(0, 6)
    : []

  useEffect(() => {
    if (term.length < 2) { setRemote([]); return }
    const id = setTimeout(() => {
      api.search(term).then(r => setRemote(r.results || [])).catch(() => setRemote([]))
    }, 250)
    return () => clearTimeout(id)
  }, [term])

  const seen = new Set(local.map(r => r.symbol))
  const results = [...local, ...remote.filter(r => r.symbol && !seen.has(r.symbol) && !r.symbol.includes('.'))].slice(0, 8)

  useEffect(() => { setActive(0) }, [term])
  useEffect(() => {
    const onDoc = e => { if (!boxRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const go = r => { setQ(''); setOpen(false); navigate(hrefFor(r)) }
  const submit = () => {
    if (results[active]) return go(results[active])
    if (term) go({ symbol: q.trim().toUpperCase() })
  }

  const tall = size === 'lg'
  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form role="search" onSubmit={e => { e.preventDefault(); submit() }}
        className="flex items-center rounded-full overflow-hidden transition-shadow"
        style={{ background:'var(--bg-3)', boxShadow: open && term ? '0 0 0 2px rgba(var(--steel-rgb),.35)' : 'none' }}>
        <label className="flex-1 flex items-center min-w-0">
          <span className="sr-only">Search for tickers or companies</span>
          <input
            value={q} autoFocus={autoFocus}
            onChange={e => { setQ(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
              if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
              if (e.key === 'Escape')    setOpen(false)
            }}
            placeholder={placeholder}
            className={`w-full bg-transparent outline-none min-w-0 ${tall ? 'text-base px-5 py-3' : 'text-[15px] px-4 py-2'}`}
            style={{ color:'var(--text-1)' }}
            role="combobox" aria-expanded={open && results.length > 0} aria-autocomplete="list" aria-controls="search-results"
          />
        </label>
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="px-2" style={{ color:'var(--text-3)' }}>
            <X size={15}/>
          </button>
        )}
        <button type="submit" aria-label="Search"
          className={`flex items-center justify-center rounded-full m-1 ${tall ? 'w-12 h-10' : 'w-11 h-8'}`}
          style={{ background:'var(--btn-bg)', color:'var(--btn-fg)' }}>
          <Search size={tall ? 17 : 15}/>
        </button>
      </form>

      {open && results.length > 0 && (
        <ul id="search-results" role="listbox"
          className="absolute left-0 right-0 mt-2 rounded-xl border overflow-hidden z-50 py-1"
          style={{ background:'var(--bg-2)', borderColor:'var(--border)', boxShadow:'0 16px 40px rgba(var(--shadow-color),.16)' }}>
          {results.map((r, i) => (
            <li key={`${r.symbol}-${i}`} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={e => { e.preventDefault(); go(r) }} onMouseEnter={() => setActive(i)}
                className="w-full flex items-center gap-4 px-4 py-2.5 text-left"
                style={{ background: i === active ? 'var(--bg-1)' : 'transparent' }}>
                <span className="w-16 shrink-0 font-bold text-sm link">{r.symbol}</span>
                <span className="flex-1 min-w-0 truncate text-sm" style={{ color:'var(--text-1)' }}>{r.name}</span>
                <span className="text-xs shrink-0" style={{ color:'var(--text-3)' }}>{r.exchange || r.type}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
