import { motion, AnimatePresence } from 'framer-motion'
import { X, LogIn, UserPlus, LogOut, User, Sun, Moon, Monitor, Type, Palette, ChevronRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useQuote } from '../hooks/useQuote'

const overlay = { hidden:{ opacity:0 }, visible:{ opacity:1 }, exit:{ opacity:0 } }
const panel = {
  hidden:  { x:'100%', opacity:0 },
  visible: { x:0, opacity:1, transition:{ type:'spring', stiffness:320, damping:34 } },
  exit:    { x:'100%', opacity:0, transition:{ duration:0.22 } },
}

const FONT_SIZES = [
  { key:'sm', label:'Small'  },
  { key:'md', label:'Medium' },
  { key:'lg', label:'Large'  },
]

const THEME_OPTIONS = [
  { key:'dark',   label:'Dark',   icon:Moon    },
  { key:'light',  label:'Light',  icon:Sun     },
  { key:'system', label:'System', icon:Monitor },
]

/* Google G icon */
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

/* AAPL preview chip — used in the AI-alerts setup wizard */
function AlertsPreview() {
  const { quote } = useQuote('AAPL')
  const price = quote?.price
  const chg   = quote?.changePct
  const hasPrice = price != null
  return (
    <div className="rounded-xl p-4 border mt-3" style={{ background:'var(--bg-3)', borderColor:'var(--border)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
          style={{ background:`rgba(var(--accent-rgb),.15)`, color:'var(--accent)' }}>A</div>
        <div>
          <div className="font-bold text-sm" style={{ color:'var(--text-1)' }}>AAPL · Apple Inc.</div>
          <div className="text-xs" style={{ color:'var(--text-3)' }}>Technology · NASDAQ</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-black font-mono" style={{ color: hasPrice ? 'var(--text-1)' : 'var(--text-3)' }}>
          {hasPrice ? `$${price.toFixed(2)}` : '—'}
        </span>
        <span className={`text-sm font-bold ${chg == null ? 'text-slate-500' : chg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%` : '—'}
        </span>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const {
    sidebarOpen, setSidebar,
    sidebarTab, setSidebarTab,
    authTab, setAuthTab,
    user, authForm, setAuthForm, authError, authLoading,
    handleSignIn, handleSignUp, handleGoogleSignIn, handleSignOut,
    theme, setTheme, effectiveTheme,
    accent, setAccent, ACCENT_COLORS,
    fontSize, setFontSize,
  } = useApp()

  const [showPw, setShowPw] = useState(false)

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          <motion.div key="ov" variants={overlay} initial="hidden" animate="visible" exit="exit"
            className="sidebar-overlay" onClick={() => setSidebar(false)} />

          <motion.div key="panel" variants={panel} initial="hidden" animate="visible" exit="exit"
            className="sidebar-panel" style={{ background:'var(--bg-1)' }}>

            {/* Tab Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
              style={{ borderColor:'var(--border)' }}>
              <div className="flex gap-1 p-1 rounded-xl" style={{ background:'var(--bg-3)' }}>
                {['account','preferences'].map(tab => (
                  <button key={tab} onClick={() => setSidebarTab(tab)}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all"
                    style={sidebarTab === tab
                      ? { background:'var(--bg-1)', color:'var(--text-1)', boxShadow:'0 2px 8px rgba(0,0,0,.25)' }
                      : { color:'var(--text-3)' }
                    }>{tab}</button>
                ))}
              </div>
              <button onClick={() => setSidebar(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/8"
                style={{ color:'var(--text-3)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <AnimatePresence mode="wait">

                {/* ACCOUNT */}
                {sidebarTab === 'account' && (
                  <motion.div key="account" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
                    {user ? (
                      <div>
                        <div className="text-center py-4">
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black mx-auto mb-3 relative"
                            style={{ background:`rgba(var(--accent-rgb),.15)`, color:'var(--accent)', border:`2px solid rgba(var(--accent-rgb),.3)` }}>
                            {user.name.charAt(0).toUpperCase()}
                            {user.provider === 'google' && (
                              <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ background:'var(--bg-1)', border:'1px solid var(--border)' }}>
                                <GoogleIcon />
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-base" style={{ color:'var(--text-1)' }}>{user.name}</div>
                          <div className="text-sm mt-0.5" style={{ color:'var(--text-3)' }}>{user.email}</div>
                          {user.provider === 'google' && (
                            <span className="inline-flex items-center gap-1 text-xs mt-1.5 px-2 py-0.5 rounded-full"
                              style={{ background:'rgba(66,133,244,.1)', color:'#4285F4', border:'1px solid rgba(66,133,244,.2)' }}>
                              <GoogleIcon /> Signed in with Google
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 mt-4">
                          {['My Portfolio','Watchlists','AI Alerts','Settings'].map(item => (
                            <button key={item}
                              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                              style={{ background:'var(--bg-3)', color:'var(--text-2)' }}>
                              {item}
                              <ChevronRight size={14} style={{ color:'var(--text-3)' }} />
                            </button>
                          ))}
                        </div>

                        <button onClick={handleSignOut}
                          className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
                          style={{ background:'rgba(239,68,68,.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,.2)' }}>
                          <LogOut size={15} /> Sign Out
                        </button>
                      </div>

                    ) : (
                      <div>
                        {/* Sign-in / Sign-up toggle */}
                        <div className="flex rounded-xl p-1 mb-5" style={{ background:'var(--bg-3)' }}>
                          {[
                            { key:'signin', label:'Sign In'  },
                            { key:'signup', label:'Sign Up'  },
                          ].map(t => (
                            <button key={t.key} onClick={() => setAuthTab(t.key)}
                              className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                              style={authTab === t.key
                                ? { background:'var(--bg-1)', color:'var(--text-1)', boxShadow:'0 2px 8px rgba(0,0,0,.2)' }
                                : { color:'var(--text-3)' }
                              }>{t.label}</button>
                          ))}
                        </div>

                        {/* Google Sign-in button */}
                        <button
                          onClick={handleGoogleSignIn}
                          disabled={authLoading}
                          className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-sm font-semibold mb-4 transition-all disabled:opacity-60"
                          style={{ background:'var(--bg-3)', color:'var(--text-1)', border:'1px solid var(--border)' }}>
                          {authLoading
                            ? <><Loader2 size={15} className="animate-spin" /> Signing in…</>
                            : <><GoogleIcon /> Continue with Google</>
                          }
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex-1 h-px" style={{ background:'var(--border)' }}/>
                          <span className="text-xs font-medium" style={{ color:'var(--text-3)' }}>or</span>
                          <div className="flex-1 h-px" style={{ background:'var(--border)' }}/>
                        </div>

                        <AnimatePresence mode="wait">
                          {/* Sign In */}
                          {authTab === 'signin' && (
                            <motion.form key="si" onSubmit={handleSignIn}
                              initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:10 }}
                              className="space-y-4">
                              <div>
                                <label className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text-3)' }}>Email</label>
                                <input className="input" type="email" placeholder="you@example.com"
                                  value={authForm.email}
                                  onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text-3)' }}>Password</label>
                                <div className="relative">
                                  <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                                    value={authForm.password}
                                    onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} />
                                  <button type="button" onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                    style={{ color:'var(--text-3)' }}>
                                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                              </div>
                              {authError && <p className="text-xs text-red-400 font-medium">{authError}</p>}
                              <button type="submit" className="btn-primary w-full justify-center py-3 mt-1">
                                <LogIn size={14} /> Sign In
                              </button>
                              <p className="text-xs text-center" style={{ color:'var(--text-3)' }}>
                                No account?{' '}
                                <button type="button" onClick={() => setAuthTab('signup')}
                                  className="font-semibold hover:underline" style={{ color:'var(--accent)' }}>
                                  Sign up free
                                </button>
                              </p>
                            </motion.form>
                          )}

                          {/* Sign Up */}
                          {authTab === 'signup' && (
                            <motion.form key="su" onSubmit={handleSignUp}
                              initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-10 }}
                              className="space-y-4">
                              <div>
                                <label className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text-3)' }}>Full Name</label>
                                <input className="input" type="text" placeholder="Your name"
                                  value={authForm.name}
                                  onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text-3)' }}>Email</label>
                                <input className="input" type="email" placeholder="you@example.com"
                                  value={authForm.email}
                                  onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text-3)' }}>Password</label>
                                <div className="relative">
                                  <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters"
                                    value={authForm.password}
                                    onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} />
                                  <button type="button" onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                    style={{ color:'var(--text-3)' }}>
                                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                              </div>
                              {authError && <p className="text-xs text-red-400 font-medium">{authError}</p>}
                              <button type="submit" className="btn-primary w-full justify-center py-3 mt-1">
                                <UserPlus size={14} /> Create Account
                              </button>
                              <p className="text-xs text-center" style={{ color:'var(--text-3)' }}>
                                Already have one?{' '}
                                <button type="button" onClick={() => setAuthTab('signin')}
                                  className="font-semibold hover:underline" style={{ color:'var(--accent)' }}>
                                  Sign in
                                </button>
                              </p>
                            </motion.form>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* PREFERENCES */}
                {sidebarTab === 'preferences' && (
                  <motion.div key="prefs" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                    className="space-y-8">

                    {/* Appearance */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        {effectiveTheme === 'dark'
                          ? <Moon size={15} style={{ color:'var(--accent)' }} />
                          : <Sun size={15} style={{ color:'var(--accent)' }} />
                        }
                        <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Appearance</span>
                      </div>
                      <div className="flex rounded-xl p-1 gap-0.5" style={{ background:'var(--bg-3)' }}>
                        {THEME_OPTIONS.map(({ key, label, icon: Icon }) => (
                          <button key={key} onClick={() => setTheme(key)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all"
                            style={theme === key
                              ? { background:'var(--bg-1)', color:'var(--text-1)', boxShadow:'0 2px 10px rgba(0,0,0,.25)' }
                              : { color:'var(--text-3)' }
                            }>
                            <Icon size={12} />
                            {label}
                          </button>
                        ))}
                      </div>
                      {theme === 'system' && (
                        <p className="text-xs mt-2" style={{ color:'var(--text-3)' }}>
                          Currently using <span className="font-semibold" style={{ color:'var(--text-2)' }}>
                            {effectiveTheme === 'dark' ? 'dark' : 'light'}
                          </span> (matches your device)
                        </p>
                      )}
                    </div>

                    {/* Accent Color */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Palette size={15} style={{ color:'var(--accent)' }} />
                        <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Accent Color</span>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        {Object.entries(ACCENT_COLORS).map(([key, c]) => (
                          <button key={key} onClick={() => setAccent(key)}
                            className={`color-swatch${accent === key ? ' active' : ''}`}
                            style={{ background: c.value }}
                            title={c.name} />
                        ))}
                      </div>
                      <p className="text-xs mt-2.5" style={{ color:'var(--text-3)' }}>
                        Active: <span className="font-semibold" style={{ color:'var(--accent)' }}>{ACCENT_COLORS[accent]?.name}</span>
                      </p>
                    </div>

                    {/* Font Size */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Type size={15} style={{ color:'var(--accent)' }} />
                        <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Text Size</span>
                      </div>
                      <div className="flex gap-2">
                        {FONT_SIZES.map(s => (
                          <button key={s.key} onClick={() => setFontSize(s.key)}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border"
                            style={fontSize === s.key
                              ? { background:`rgba(var(--accent-rgb),.12)`, color:'var(--accent)', borderColor:`rgba(var(--accent-rgb),.3)` }
                              : { color:'var(--text-3)', borderColor:'var(--border)' }
                            }>{s.label}</button>
                        ))}
                      </div>
                    </div>

                    {/* Live Preview */}
                    <div>
                      <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Preview</span>
                      <AlertsPreview />
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t shrink-0" style={{ borderColor:'var(--border)' }}>
              <p className="text-xs text-center" style={{ color:'var(--text-3)' }}>
                Foliyo · Portfolio Intelligence Platform
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
