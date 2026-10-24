import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import MarketGlobe from '../components/MarketGlobe'
import SearchBox from '../components/SearchBox'
import { BrandLockup } from '../components/Navbar'
import { useSignals } from '../hooks/useSignals'
import { useMarketNews } from '../hooks/useMarketNews'
import { EXCHANGES, sessionState, hoursLabel } from '../utils/exchanges'
import { fmtPrice, fmtPct } from '../utils/formatLive'

/* ── Helpers ────────────────────────────────────────────────── */
const ago = ms => {
  if (!ms) return ''
  const m = Math.max(1, Math.round((Date.now() - ms) / 60_000))
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}
const hasUrl = u => !!u && u !== '#'
const extLink = u => hasUrl(u) ? { href:u, target:'_blank', rel:'noopener noreferrer' } : {}
const tone = v => v == null ? 'var(--text-3)' : v >= 0 ? 'rgb(var(--up))' : 'rgb(var(--down))'

function SectionHead({ to, children }) {
  const inner = <span className="section-title">{children}{to && <ChevronRight size={18} style={{ color:'var(--text-3)' }}/>}</span>
  return <div className="mb-3">{to ? <Link to={to} className="hover:underline">{inner}</Link> : inner}</div>
}

/* ── World markets — the globe panel ───────────────────────── */
function WorldMarkets() {
  const [hover, setHover] = useState(null)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(id) }, [])
  const states = EXCHANGES.map(ex => ({ ex, st: sessionState(ex, now) }))
  const open = states.filter(s => s.st.open)
  const utc = now.toLocaleTimeString('en-GB', { timeZone:'UTC', hour:'2-digit', minute:'2-digit' })

  return (
    <section aria-label="World markets" className="relative rounded-2xl overflow-hidden"
      style={{ background:'radial-gradient(120% 90% at 75% 40%, #1d2a33 0%, #121417 55%, #0d0e10 100%)', color:'#f2eee6' }}>
      <div className="grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] items-center">
        <div className="relative z-10 px-6 pb-7 pt-0 sm:p-8 md:pr-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] flex items-center gap-2" style={{ color:'#e8a43e' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:'#e8a43e' }}/> World markets · {utc} UTC
          </div>
          <h1 className="display-xl text-[2.4rem] sm:text-[3.1rem] mt-3 mb-3">
            {open.length ? <>{open.length} of {EXCHANGES.length} markets<br/>are trading now.</> : <>Every major market<br/>is closed right now.</>}
          </h1>
          <p className="text-[15px] leading-relaxed max-w-md" style={{ color:'rgba(242,238,230,0.72)' }}>
            The trading day passes from Sydney and Tokyo through Yangon and Mumbai to London and New York.
            The globe shows where it is right now. Drag it to spin, and point at a market for its local time.
          </p>

          <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1.5 max-w-md text-[13px]">
            {states.slice().sort((a, b) => Number(b.st.open) - Number(a.st.open)).slice(0, 10).map(({ ex, st }, i) => (
              <li key={ex.id} className={`flex items-center gap-2 min-w-0 ${i >= 6 ? 'max-sm:hidden' : ''}`}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: st.open ? '#f6b24a' : 'rgba(242,238,230,0.3)', boxShadow: st.open ? '0 0 8px #f6b24a' : 'none' }}/>
                <span className="font-semibold truncate" style={{ color: st.open ? '#f2eee6' : 'rgba(242,238,230,0.55)' }}>{ex.city}</span>
                <span className="ml-auto num shrink-0" style={{ color:'rgba(242,238,230,0.5)' }}>{st.localTime}</span>
              </li>
            ))}
          </ul>
          <Link to="/global-markets" className="inline-flex items-center gap-1 mt-6 text-sm font-semibold hover:underline" style={{ color:'#f6c06a' }}>
            Open the global boards <ChevronRight size={15}/>
          </Link>
        </div>

        <div className="relative h-[300px] sm:h-[420px] md:h-[480px] order-first md:order-none">
          <MarketGlobe onHover={setHover} className="absolute inset-0" />
          {hover && (
            <div role="status" className="absolute z-20 pointer-events-none rounded-lg px-3 py-2 text-xs shadow-xl"
              style={{ left: Math.min(hover.x + 14, 9999), top: hover.y + 14, background:'rgba(13,14,16,0.92)', border:'1px solid rgba(242,238,230,0.12)', minWidth:180 }}>
              <div className="font-bold text-[13px]">{hover.exchange.name}</div>
              <div style={{ color:'rgba(242,238,230,0.65)' }}>{hover.exchange.city} · {hover.state?.localTime}</div>
              <div className="mt-1 font-semibold" style={{ color: hover.state?.open ? '#f6b24a' : 'rgba(242,238,230,0.6)' }}>
                {hover.state?.label} <span className="font-normal" style={{ color:'rgba(242,238,230,0.5)' }}>· {hoursLabel(hover.exchange)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ── News ───────────────────────────────────────────────────── */
function LeadStory({ a }) {
  return (
    <a {...extLink(a.url)} className={`group grid gap-5 items-start ${a.image ? 'sm:grid-cols-[1.1fr_1fr]' : ''}`}>
      {a.image && (
        <div className="aspect-[16/10] rounded-xl overflow-hidden" style={{ background:'var(--bg-3)' }}>
          <img src={a.image} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            onError={e => { e.currentTarget.parentElement.style.display = 'none' }} />
        </div>
      )}
      <div>
        <h2 className="text-[1.9rem] sm:text-[2.3rem] font-bold leading-[1.08] group-hover:underline decoration-2 underline-offset-4"
          style={{ color:'var(--text-1)' }}>{a.title}</h2>
        {a.summary && a.summary !== a.title && (
          <p className="mt-3 text-[15px] leading-relaxed line-clamp-3" style={{ color:'var(--text-2)' }}>{a.summary}</p>
        )}
        <div className="mt-3 text-xs" style={{ color:'var(--text-3)' }}>{a.source} · {ago(a.datetime) || a.time}</div>
      </div>
    </a>
  )
}

function StoryCard({ a }) {
  return (
    <a {...extLink(a.url)} className="group block">
      {a.image && (
        <div className="aspect-[16/9] rounded-lg overflow-hidden mb-2.5" style={{ background:'var(--bg-3)' }}>
          <img src={a.image} alt="" loading="lazy" className="w-full h-full object-cover"
            onError={e => { e.currentTarget.parentElement.style.display = 'none' }} />
        </div>
      )}
      <h3 className="text-[15px] font-semibold leading-snug line-clamp-3 group-hover:underline" style={{ color:'var(--text-1)' }}>{a.title}</h3>
      <div className="mt-1.5 text-xs" style={{ color:'var(--text-3)' }}>{a.source} · {ago(a.datetime) || a.time}</div>
    </a>
  )
}

function StoryRow({ a }) {
  return (
    <a {...extLink(a.url)} className="group flex gap-4 py-3.5 border-t" style={{ borderColor:'var(--border)' }}>
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-semibold leading-snug group-hover:underline" style={{ color:'var(--text-1)' }}>{a.title}</h3>
        <div className="mt-1 text-xs" style={{ color:'var(--text-3)' }}>{a.source} · {ago(a.datetime) || a.time}</div>
      </div>
      {a.image && (
        <div className="w-28 h-[72px] rounded-md overflow-hidden shrink-0" style={{ background:'var(--bg-3)' }}>
          <img src={a.image} alt="" loading="lazy" className="w-full h-full object-cover" onError={e => { e.currentTarget.parentElement.style.display = 'none' }}/>
        </div>
      )}
    </a>
  )
}

function TopStories() {
  const { articles, loading } = useMarketNews()
  const list = useMemo(() => {
    const withImg = articles.filter(a => a.image)
    const rest = articles.filter(a => !a.image)
    return [...withImg, ...rest]
  }, [articles])

  if (loading) return <div className="space-y-4"><div className="h-64 rounded-xl shimmer"/><div className="h-40 rounded-xl shimmer"/></div>
  if (!list.length) return (
    <p className="text-sm py-8" style={{ color:'var(--text-3)' }}>Headlines aren’t loading right now. Try refreshing in a minute.</p>
  )
  const [lead, ...more] = list
  return (
    <div>
      <LeadStory a={lead} />
      <div className="grid sm:grid-cols-3 gap-5 mt-8">
        {more.slice(0, 3).map(a => <StoryCard key={a.id} a={a} />)}
      </div>
      <div className="mt-6">
        {more.slice(3, 12).map(a => <StoryRow key={a.id} a={a} />)}
      </div>
      <Link to="/news" className="btn-ghost mt-4">More news <ChevronRight size={15}/></Link>
    </div>
  )
}

/* ── Right rail ─────────────────────────────────────────────── */
function TickerRows({ rows }) {
  return (
    <ul>
      {rows.map(s => (
        <li key={s.symbol} className="border-t first:border-t-0" style={{ borderColor:'var(--border)' }}>
          <Link to={`/stock/${s.symbol}`} className="flex items-center gap-3 py-2.5 hover:bg-[var(--bg-1)] -mx-2 px-2 rounded">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold link">{s.symbol}</div>
              <div className="text-xs truncate" style={{ color:'var(--text-2)' }}>{s.name}</div>
            </div>
            <div className="text-right num">
              <div className="text-[13px] font-bold" style={{ color:'var(--text-1)' }}>{fmtPrice(s.price)}</div>
              <div className="text-xs font-semibold" style={{ color: tone(s.changePct) }}>{fmtPct(s.changePct)}</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function RightRail() {
  const { signals, loading } = useSignals()
  const [tab, setTab] = useState('gainers')
  const byMove = [...signals].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
  const gainers = [...signals].filter(s => s.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 5)
  const losers  = [...signals].filter(s => s.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 5)
  const box = 'rounded-xl border p-4'
  const boxStyle = { borderColor:'var(--border)', background:'var(--bg-2)' }

  return (
    <aside className="space-y-5">
      <div className={box} style={boxStyle}>
        <SearchBox placeholder="Quote lookup" />
      </div>

      <div className={box} style={boxStyle}>
        <SectionHead to="/markets">Trending tickers</SectionHead>
        {loading ? <div className="h-48 rounded shimmer"/> : <TickerRows rows={byMove.slice(0, 6)} />}
      </div>

      <div className={box} style={boxStyle}>
        <div className="flex gap-1 mb-2" role="tablist">
          {[['gainers','Top gainers'],['losers','Top losers']].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors"
              style={tab === k ? { background:'var(--btn-bg)', color:'var(--btn-fg)' } : { color:'var(--text-2)' }}>
              {l}
            </button>
          ))}
        </div>
        {loading ? <div className="h-40 rounded shimmer"/> :
          (tab === 'gainers' ? gainers : losers).length
            ? <TickerRows rows={tab === 'gainers' ? gainers : losers} />
            : <p className="text-xs py-3" style={{ color:'var(--text-3)' }}>No {tab} among the large caps today.</p>}
        <p className="text-[11px] mt-2" style={{ color:'var(--text-3)' }}>US large caps, latest session.</p>
      </div>

      <div className={box} style={boxStyle}>
        <SectionHead>Your tools</SectionHead>
        <ul className="text-[14px]">
          {[
            ['/watchlist', 'Watchlist', 'Tickers you follow'],
            ['/portfolio', 'Portfolio', 'Positions and gain or loss'],
            ['/simulator', 'Simulator', 'Practise with $100,000'],
            ['/ai-alerts', 'Alerts & signals', 'Get told when prices move'],
            ['/compare',   'Compare', 'Stocks side by side'],
          ].map(([to, label, sub]) => (
            <li key={to} className="border-t first:border-t-0" style={{ borderColor:'var(--border)' }}>
              <Link to={to} className="flex items-center justify-between py-2.5 group">
                <span>
                  <span className="font-semibold group-hover:underline" style={{ color:'var(--text-1)' }}>{label}</span>
                  <span className="block text-xs" style={{ color:'var(--text-3)' }}>{sub}</span>
                </span>
                <ChevronRight size={15} style={{ color:'var(--text-3)' }}/>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

/* ── Page ───────────────────────────────────────────────────── */
export default function Landing() {
  return (
    <div style={{ background:'var(--bg-0)' }}>
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
        <div className="min-w-0 space-y-10">
          <WorldMarkets />
          <section>
            <SectionHead to="/news">Top stories</SectionHead>
            <TopStories />
          </section>
        </div>
        <RightRail />
      </div>

      {/* Footer */}
      <footer className="border-t mt-10" style={{ borderColor:'var(--border)', background:'var(--bg-1)' }}>
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <Link to="/" aria-label="Foliyo home" className="inline-block"><BrandLockup size={22}/></Link>
            <p className="text-xs mt-4 max-w-lg leading-relaxed" style={{ color:'var(--text-3)' }}>
              Quotes from Finnhub and Twelve Data; Myanmar closes from the Yangon Stock Exchange (end of day). Prices may be delayed.
              Foliyo is for information and practice and is not financial advice.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-2 text-sm">
            {[['/markets','Markets'],['/global-markets','Global markets'],['/watchlist','Watchlist'],['/portfolio','Portfolio'],
              ['/news','News'],['/compare','Compare'],['/simulator','Simulator'],['/ai-alerts','Alerts & signals']].map(([to, l]) => (
              <Link key={to} to={to} className="hover:underline" style={{ color:'var(--text-2)' }}>{l}</Link>
            ))}
          </nav>
        </div>
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pb-8 text-xs" style={{ color:'var(--text-3)' }}>
          © {new Date().getFullYear()} Foliyo
        </div>
      </footer>
    </div>
  )
}
