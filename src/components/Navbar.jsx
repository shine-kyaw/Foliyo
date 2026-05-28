import { useState, useRef } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart2, Briefcase, Bell, Newspaper, Home, Menu, X,
  BookMarked, User, LogIn, GitCompare, Cpu, Globe2, ChevronDown,
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

/* ── Nav items (icon-only on desktop) ───────────────────────── */
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

/* ── Tooltip wrapper ─────────────────────────────────────────── */
function Tip({ label, children }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 text-xs font-semibold
        rounded-lg pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover/tip:opacity-100
        transition-opacity duration-150"
        style={{ background:'var(--bg-3)', color:'var(--text-1)', border:'1px solid var(--border)',
                 boxShadow:'0 4px 12px rgba(0,0,0,.3)' }}>
        {label}
      </div>
    </div>
  )
}

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
        className={({ isActive }) =>
          `flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-medium transition-all border
          ${isActive ? 'nav-active' : 'border-transparent hover:bg-white/5'}`
        }
        style={({ isActive }) => isActive ? {} : { color:'var(--text-2)' }}
      >
        <Globe2 size={14}/>
        <span className="hidden lg:inline text-xs">Global</span>
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`}/>
      </NavLink>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity:0, y:4, scale:0.97 }}
            animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:4, scale:0.97 }}
            transition={{ duration:0.15 }}
            className="absolute top-full left-0 mt-1 rounded-xl border shadow-2xl overflow-hidden z-50"
            style={{ background:'var(--bg-2)', borderColor:'var(--border)', minWidth:'180px' }}
          >
            {GM_REGIONS.map(r => (
              <button key={r.key}
                onClick={() => { navigate(`/global-markets?region=${r.key}`); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-left transition-colors"
                style={{ color:'var(--text-2)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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

/* ── Main Navbar ─────────────────────────────────────────────── */
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { setSidebar, setSidebarTab, setAuthTab, user } = useApp()
  const { indices, isLive } = useIndices()

  const openAccount = () => {
    setSidebarTab('account'); setAuthTab('signin'); setSidebar(true)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b bg-glass"
      style={{ borderColor:'var(--border)' }}>

      {/* ── Indices ticker bar ── */}
      <div className="border-b hidden md:flex items-center justify-between px-4 sm:px-6 h-8 overflow-hidden"
        style={{ borderColor:'var(--border)', background:'rgba(0,0,0,.18)' }}>
        <div className="flex items-center gap-6">
          {indices.map(idx => {
            const up = (idx.changePct ?? 0) >= 0
            return (
              <div key={idx.symbol} className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold" style={{ color:'var(--text-3)' }}>{idx.name}</span>
                {idx.price != null ? (
                  <>
                    <span className="font-bold font-mono" style={{ color:'var(--text-1)' }}>
                      {idx.price.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}
                    </span>
                    <span className={`font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                      {up ? '▲' : '▼'}{up ? '+' : ''}{idx.changePct?.toFixed(2)}%
                    </span>
                  </>
                ) : (
                  <span style={{ color:'var(--text-3)' }}>—</span>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-1.5 text-xs"
          style={isLive ? { color:'#10b981' } : { color:'var(--text-3)' }}>
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}/>
          {isLive ? 'Live' : 'Delayed'}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-15 py-3 gap-3">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background:'var(--accent)', boxShadow:`0 4px 14px rgba(var(--accent-rgb),.4)` }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 12 L6 4 L10 9 L13 6 L14 8" stroke="rgba(0,0,0,0.9)" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="13.5" cy="5.5" r="1.8" fill="rgba(0,0,0,0.9)"/>
              </svg>
            </div>
            <span className="text-lg font-black tracking-tight" style={{ color:'var(--text-1)' }}>
              Foli<span style={{ color:'var(--accent)' }}>yo</span>
            </span>
          </Link>

          {/* Desktop Nav — icon-only with tooltips */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
              <Tip key={to} label={label}>
                <NavLink to={to} end={exact}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all border
                    ${isActive ? 'nav-active' : 'border-transparent hover:bg-white/5'}`
                  }
                  style={({ isActive }) => isActive ? {} : { color:'var(--text-2)' }}
                >
                  <Icon size={15}/>
                  <span className="hidden xl:inline text-xs whitespace-nowrap">{label}</span>
                </NavLink>
              </Tip>
            ))}
            <Tip label="Global Markets">
              <GlobalMarketsNav />
            </Tip>
          </nav>

          {/* Right controls */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
              style={{ color:'#10b981', background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              Live
            </div>
            <motion.button whileTap={{ scale:0.95 }} onClick={openAccount}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={user
                ? { background:`rgba(var(--accent-rgb),.12)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.25)` }
                : { background:'var(--accent)', color:'var(--bg-0)' }
              }>
              {user ? <><User size={14}/>{user.name.split(' ')[0]}</> : <><LogIn size={14}/>Sign In</>}
            </motion.button>
          </div>

          {/* Mobile controls */}
          <div className="md:hidden flex items-center gap-2">
            <button onClick={openAccount} className="p-2 rounded-lg" style={{ color:'var(--text-2)' }}>
              {user ? <User size={18}/> : <LogIn size={18}/>}
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg" style={{ color:'var(--text-2)' }}>
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
            <div className="px-4 py-3 grid grid-cols-2 gap-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
                <NavLink key={to} to={to} end={exact}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border
                    ${isActive ? 'nav-active' : 'border-transparent'}`
                  }
                  style={({ isActive }) => isActive ? {} : { color:'var(--text-2)' }}
                >
                  <Icon size={16}/>{label}
                </NavLink>
              ))}
              {/* Global Markets in mobile — show sub-links */}
              <div className="col-span-2 mt-1 pt-2 border-t" style={{ borderColor:'var(--border)' }}>
                <div className="text-xs font-bold mb-1 px-2" style={{ color:'var(--text-3)' }}>
                  <Globe2 size={11} className="inline mr-1"/>Global Markets
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {GM_REGIONS.map(r => (
                    <Link key={r.key} to={`/global-markets?region=${r.key}`}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border-transparent transition-all"
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
