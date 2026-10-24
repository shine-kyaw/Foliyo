import { useState, useRef, useCallback, useEffect } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, ChevronDown, RefreshCw, Sun, Moon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import SearchBox from './SearchBox'
import MarketStrip from './MarketStrip'

/* ── Global Markets region menu ──────────────────────────────── */
const GM_REGIONS = [
  { key:'us',          label:'United States' },
  { key:'europe',      label:'Europe'        },
  { key:'asia',        label:'Asia Pacific'  },
  { key:'myanmar',     label:'Myanmar (YSX)' },
  { key:'commodities', label:'Commodities'   },
  { key:'crypto',      label:'Crypto'        },
  { key:'forex',       label:'Forex'         },
]

/* ── Section nav — text links, like a newspaper's masthead ───── */
const NAV_ITEMS = [
  { to:'/',             label:'Home',       exact:true },
  { to:'/markets',      label:'Markets'    },
  { to:'/watchlist',    label:'Watchlist'  },
  { to:'/portfolio',    label:'Portfolio'  },
  { to:'/news',         label:'News'       },
  { to:'/compare',      label:'Compare'    },
  { to:'/simulator',    label:'Simulator'  },
  { to:'/ai-alerts',    label:'Alerts & Signals' },
]

/* ── Brand lockup — mark + wordmark ──────────────────────────── */
export function BrandLockup({ size = 26, showWord = true, className = '' }) {
  const { effectiveTheme } = useApp()
  const src = effectiveTheme === 'light' ? '/brand/foliyo-mark-on-light.webp' : '/brand/foliyo-mark-on-dark.webp'
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <img src={src} alt="" height={size} width={Math.round(size * 1.545)}
        style={{ height:size, width:'auto' }} draggable={false} />
      {showWord && (
        <span className="font-black italic tracking-tight"
          style={{ color:'var(--text-1)', fontSize: size * 0.8, letterSpacing:'-0.03em' }}>
          Foliyo
        </span>
      )}
    </span>
  )
}

const linkClass = isActive =>
  `relative shrink-0 px-3 py-2.5 text-[14px] transition-colors ${isActive ? 'font-bold' : 'font-medium hover:text-[var(--text-1)]'}`

/* Marigold underline under the current section */
const ActiveBar = () => (
  <motion.span layoutId="nav-underline" aria-hidden className="absolute left-3 right-3 -bottom-px h-[3px] rounded-t"
    style={{ background:'var(--brand)' }} transition={{ type:'spring', stiffness:500, damping:40 }} />
)

function GlobalMarketsNav() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const closeTimeout = useRef(null)
  return (
    <div className="relative shrink-0"
      onMouseEnter={() => { clearTimeout(closeTimeout.current); setOpen(true) }}
      onMouseLeave={() => { closeTimeout.current = setTimeout(() => setOpen(false), 160) }}>
      <NavLink to="/global-markets" className={({ isActive }) => `${linkClass(isActive)} flex items-center gap-1`}
        style={({ isActive }) => ({ color: isActive ? 'var(--text-1)' : 'var(--text-2)' })}
        aria-haspopup="menu" aria-expanded={open}>
        {({ isActive }) => (<>Global markets <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`}/>{isActive && <ActiveBar/>}</>)}
      </NavLink>
      <AnimatePresence>
        {open && (
          <motion.div role="menu"
            initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:4 }} transition={{ duration:0.12 }}
            className="absolute top-full left-0 mt-1 rounded-xl border overflow-hidden z-50 py-1.5"
            style={{ background:'var(--bg-2)', borderColor:'var(--border)', minWidth:200, boxShadow:'0 16px 40px rgba(var(--shadow-color),.14)' }}>
            {GM_REGIONS.map(r => (
              <button key={r.key} role="menuitem"
                onClick={() => { navigate(`/global-markets?region=${r.key}`); setOpen(false) }}
                className="w-full px-4 py-2 text-sm text-left transition-colors hover:bg-[var(--bg-1)]"
                style={{ color:'var(--text-1)' }}>
                {r.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function RefreshButton() {
  const [spinning, setSpinning] = useState(false)
  const fire = useCallback(() => {
    if (spinning) return
    setSpinning(true)
    window.dispatchEvent(new CustomEvent('foliyo:refresh'))
    setTimeout(() => setSpinning(false), 1200)
  }, [spinning])
  return (
    <button onClick={fire} aria-label="Refresh prices" title="Refresh prices"
      className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg-3)]"
      style={{ color:'var(--text-2)' }}>
      <RefreshCw size={16} className={spinning ? 'animate-spin' : ''} />
    </button>
  )
}

export default function Navbar() {
  const { setSidebar, setSidebarTab, setAuthTab, user, effectiveTheme, setTheme } = useApp()
  const { pathname } = useLocation()
  const navRef = useRef(null)

  // Keep the current section in view on narrow screens
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block:'nearest', inline:'center' })
  }, [pathname])

  const openAccount = () => { setSidebarTab('account'); setAuthTab('signin'); setSidebar(true) }

  return (
    <>
      {/* Row 1 — brand, search, account (sticks while scrolling) */}
      <header className="sticky top-0 z-40 border-b bg-glass" style={{ borderColor:'var(--border)' }}>
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-[60px] flex items-center gap-3 sm:gap-6">
          <Link to="/" aria-label="Foliyo home" className="shrink-0"
            onClick={() => window.dispatchEvent(new CustomEvent('foliyo:refresh'))}>
            <BrandLockup size={24} showWord={true} className="[&>span]:hidden sm:[&>span]:inline" />
          </Link>

          <SearchBox className="flex-1 max-w-[620px]" />

          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <span className="hidden sm:flex"><RefreshButton /></span>
            <button onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              aria-label={effectiveTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center transition-colors hover:bg-[var(--bg-3)]"
              style={{ color:'var(--text-2)' }}>
              {effectiveTheme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
            </button>
            {user ? (
              <button onClick={openAccount}
                className="ml-1 flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border text-sm font-semibold"
                style={{ borderColor:'var(--border-light)', color:'var(--text-1)' }}>
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background:'var(--btn-bg)', color:'var(--btn-fg)' }}>{user.name.charAt(0).toUpperCase()}</span>
                <span className="hidden sm:inline">{user.name.split(' ')[0]}</span>
              </button>
            ) : (
              <button onClick={openAccount}
                className="ml-1 flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold transition-colors hover:bg-[var(--bg-1)]"
                style={{ borderColor:'var(--border-light)', color:'var(--text-1)' }}>
                <User size={15} className="sm:hidden"/><span className="hidden sm:inline">Sign in</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Row 2 — sections */}
      <nav aria-label="Main" className="border-b" style={{ borderColor:'var(--border)', background:'var(--bg-0)' }}>
        <div ref={navRef} className="max-w-[1320px] mx-auto px-2 sm:px-4 flex items-center overflow-x-auto" style={{ scrollbarWidth:'none' }}>
          {NAV_ITEMS.map(({ to, label, exact }) => (
            <NavLink key={to} to={to} end={exact} className={({ isActive }) => linkClass(isActive)}
              style={({ isActive }) => ({ color: isActive ? 'var(--text-1)' : 'var(--text-2)' })}>
              {({ isActive }) => (<>{label}{isActive && <ActiveBar/>}</>)}
            </NavLink>
          ))}
          <GlobalMarketsNav />
        </div>
      </nav>

      {/* Row 3 — live benchmarks */}
      <MarketStrip />
    </>
  )
}
