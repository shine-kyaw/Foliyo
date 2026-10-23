import { useState, useRef, useCallback, useEffect } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart2, Briefcase, Bell, Newspaper, Home, Menu, X,
  BookMarked, User, LogIn, GitCompare, Cpu, Globe2, ChevronDown, RefreshCw,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useIndices } from '../hooks/useIndices'

/* ── Global Markets region dropdown config ───────────────────── */
const GM_REGIONS = [
  { key:'us',          label:'United States' },
  { key:'europe',      label:'Europe'        },
  { key:'asia',        label:'Asia Pacific'  },
  { key:'myanmar',     label:'Myanmar (YSX)' },
  { key:'commodities', label:'Commodities'   },
  { key:'crypto',      label:'Crypto'        },
  { key:'forex',       label:'Forex'         },
]

/* ── Nav items (labels appear from xl up; icon + tooltip below that) ── */
const NAV_ITEMS = [
  { to:'/',             label:'Home',       icon:Home,      exact:true  },
  { to:'/markets',      label:'Markets',    icon:BarChart2              },
  { to:'/watchlist',    label:'Watchlist',  icon:BookMarked             },
  { to:'/compare',      label:'Compare',    icon:GitCompare             },
  { to:'/news',         label:'News',       icon:Newspaper              },
  { to:'/portfolio',    label:'Portfolio',  icon:Briefcase              },
  { to:'/simulator',    label:'Simulator',  icon:Cpu                    },
  { to:'/ai-alerts',    label:'AI Alerts',  icon:Bell                   },
]

/* ── Brand lockup — mark + wordmark ──────────────────────────── */
export function BrandLockup({ size = 26, showWord = true, className = '' }) {
  const { effectiveTheme } = useApp()
  const src = effectiveTheme === 'light' ? '/brand/foliyo-mark-on-light.webp' : '/brand/foliyo-mark-on-dark.webp'
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <img src={src} alt="" height={size} width={Math.round(size * 1.545)}
        style={{ height:size, width:'auto' }} draggable={false} />
      {showWord && (
        <span className="font-display lean font-black tracking-tight"
          style={{ color:'var(--text-1)', fontSize: size * 0.72, letterSpacing:'-0.03em' }}>
          Foliyo
        </span>
      )}
    </span>
  )
}

/* ── Tooltip wrapper — only shown while labels are hidden (below xl) ── */
function Tip({ label, children }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="xl:hidden absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-xs font-semibold
        rounded-md pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover/tip:opacity-100
        group-focus-within/tip:opacity-100 transition-opacity duration-150"
        style={{ background:'var(--bg-3)', color:'var(--text-1)', border:'1px solid var(--border)',
                 boxShadow:'0 6px 16px rgba(0,0,0,.3)' }}>
        {label}
      </div>
    </div>
  )
}

/* Active marker — a short leaning bar resting on the header's bottom edge,
 * the arrow's stroke. Outer span is framer's (layout transforms); inner leans. */
function ActiveMark() {
  return (
    <motion.span layoutId="nav-mark" aria-hidden
      className="absolute inset-x-0 -bottom-[12px] flex justify-center pointer-events-none"
      transition={{ type:'spring', stiffness:420, damping:36 }}>
      <span className="block h-[3px] w-6 rounded-sm"
        style={{ background:'var(--accent)', transform:'skewX(var(--lean))' }} />
    </motion.span>
  )
}

const navLinkClass = 'relative flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[13px] font-semibold transition-colors'
const navLinkStyle = isActive => ({ color: isActive ? 'var(--text-1)' : 'var(--text-2)' })

/* ── Global Markets dropdown ─────────────────────────────────── */
function GlobalMarketsNav() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const closeTimeout = useRef(null)

  const handleMouseEnter = () => {
    clearTimeout(closeTimeout.current)
    setOpen(true)
  }
  const handleMouseLeave = () => {
    closeTimeout.current = setTimeout(() => setOpen(false), 180)
  }

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <NavLink to="/global-markets"
        className={`${navLinkClass} hover:bg-white/5`}
        style={({ isActive }) => navLinkStyle(isActive)}
        aria-haspopup="menu" aria-expanded={open}
      >
        {({ isActive }) => (
          <>
            <Globe2 size={15}/>
            <span className="hidden xl:inline">Global</span>
            <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`}/>
            {isActive && <ActiveMark />}
          </>
        )}
      </NavLink>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity:0, y:4 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:4 }}
            transition={{ duration:0.15 }}
            role="menu"
            className="absolute top-full right-0 mt-2 rounded-lg border shadow-2xl overflow-hidden z-50 py-1"
            style={{ background:'var(--bg-2)', borderColor:'var(--border)', minWidth:'190px' }}
          >
            {GM_REGIONS.map(r => (
              <button key={r.key} role="menuitem"
                onClick={() => { navigate(`/global-markets?region=${r.key}`); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-left transition-colors hover:bg-[var(--bg-3)]"
                style={{ color:'var(--text-2)' }}
              >
                {r.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Refresh button — broadcasts a global event all quote hooks listen to ── */
function RefreshButton() {
  const [spinning, setSpinning] = useState(false)
  const fire = useCallback(() => {
    if (spinning) return
    setSpinning(true)
    window.dispatchEvent(new CustomEvent('foliyo:refresh'))
    setTimeout(() => setSpinning(false), 1200)
  }, [spinning])
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={fire}
      aria-label="Refresh prices"
      className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:text-[var(--text-1)]"
      style={{ color:'var(--text-2)', border:'1px solid var(--border)' }}
    >
      <RefreshCw size={13} className={spinning ? 'animate-spin' : ''} />
    </motion.button>
  )
}

/* ── Main Navbar ─────────────────────────────────────────────── */
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { setSidebar, setSidebarTab, setAuthTab, user } = useApp()
  const { indices, isLive } = useIndices()
  const { pathname } = useLocation()

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const openAccount = () => {
    setSidebarTab('account'); setAuthTab('signin'); setSidebar(true)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b bg-glass"
      style={{ borderColor:'var(--border)' }}>

      {/* ── Indices ticker bar ── */}
      <div className="border-b hidden md:block" style={{ borderColor:'var(--border)', background:'rgba(var(--shadow-color),.1)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-8 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-7">
            {indices.map(idx => {
              const up = (idx.changePct ?? 0) >= 0
              return (
                <div key={idx.symbol} className="flex items-baseline gap-2 text-[11px]">
                  <span className="font-semibold uppercase tracking-wider" style={{ color:'var(--text-3)' }}>{idx.name}</span>
                  {idx.price != null ? (
                    <>
                      <span className="font-mono font-medium" style={{ color:'var(--text-1)' }}>
                        {idx.price.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}
                      </span>
                      <span className={`font-mono font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                        {up ? '+' : ''}{idx.changePct?.toFixed(2)}%
                      </span>
                    </>
                  ) : (
                    <span style={{ color:'var(--text-3)' }}>—</span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: isLive ? 'rgb(var(--up))' : 'var(--text-3)' }}>
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}/>
            {isLive ? 'Live' : 'Delayed'}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 gap-3">

          {/* Logo — click = home + refresh */}
          <Link to="/" aria-label="Foliyo home"
            onClick={() => window.dispatchEvent(new CustomEvent('foliyo:refresh'))}
            className="shrink-0">
            <BrandLockup size={26} />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center" aria-label="Main">
            {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
              <Tip key={to} label={label}>
                <NavLink to={to} end={exact} aria-label={label}
                  className={`${navLinkClass} hover:bg-white/5`}
                  style={({ isActive }) => navLinkStyle(isActive)}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={15} style={{ color: isActive ? 'var(--accent)' : undefined }}/>
                      <span className="hidden xl:inline whitespace-nowrap">{label}</span>
                      {isActive && <ActiveMark />}
                    </>
                  )}
                </NavLink>
              </Tip>
            ))}
            <Tip label="Global Markets">
              <GlobalMarketsNav />
            </Tip>
          </nav>

          {/* Right controls */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <RefreshButton />
            {user ? (
              <button onClick={openAccount}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-semibold transition-colors"
                style={{ background:'rgba(var(--accent-rgb),.1)', color:'var(--text-1)', border:'1px solid rgba(var(--accent-rgb),.25)' }}>
                <User size={14} style={{ color:'var(--accent)' }}/>{user.name.split(' ')[0]}
              </button>
            ) : (
              <button onClick={openAccount} className="btn-primary !py-2 !px-4 text-[13px]">
                <LogIn size={14}/>Sign in
              </button>
            )}
          </div>

          {/* Mobile controls */}
          <div className="md:hidden flex items-center gap-1">
            <button onClick={openAccount} aria-label={user ? 'Account' : 'Sign in'}
              className="p-2 rounded-md" style={{ color:'var(--text-2)' }}>
              {user ? <User size={18}/> : <LogIn size={18}/>}
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="p-2 rounded-md" style={{ color:'var(--text-1)' }}>
              {mobileOpen ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }} transition={{ duration:0.22 }}
            className="md:hidden overflow-hidden border-t"
            style={{ borderColor:'var(--border)', background:'var(--bg-1)' }}
          >
            <div className="px-4 py-3 grid grid-cols-2 gap-1 max-h-[calc(100vh-56px)] overflow-y-auto">
              {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
                <NavLink key={to} to={to} end={exact}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all border
                    ${isActive ? 'nav-active' : 'border-transparent'}`
                  }
                  style={({ isActive }) => isActive ? {} : { color:'var(--text-2)' }}
                >
                  <Icon size={16}/>{label}
                </NavLink>
              ))}
              <div className="col-span-2 mt-2 pt-3 border-t" style={{ borderColor:'var(--border)' }}>
                <div className="section-label mb-1.5 px-3 flex items-center gap-1.5">
                  <Globe2 size={11}/>Global markets
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {GM_REGIONS.map(r => (
                    <Link key={r.key} to={`/global-markets?region=${r.key}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all"
                      style={{ color:'var(--text-2)' }}>
                      {r.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
