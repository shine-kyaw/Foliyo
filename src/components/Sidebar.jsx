import { motion, AnimatePresence } from 'framer-motion'
import { X, LogIn, UserPlus, LogOut, User, Sun, Moon, Monitor, Type, Palette, ChevronRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useQuote } from '../hooks/useQuote'
import { BrandLockup } from './Navbar'

/* Segmented-control states, shared by every picker in the panel */
const SEG_ON  = { background:'rgba(var(--accent-rgb),.12)', color:'var(--text-1)', borderColor:'rgba(var(--accent-rgb),.25)' }
const SEG_OFF = { background:'transparent', color:'var(--text-2)', borderColor:'transparent' }
const SEG_WRAP = { background:'var(--bg-2)', borderColor:'var(--border)' }

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
    <div className="rounded-lg p-4 border mt-3" style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm"
          style={{ background:`rgba(var(--accent-rgb),.12)`, color:'var(--accent)' }}>A</div>
        <div>
          <div className="font-bold text-sm" style={{ color:'var(--text-1)' }}>AAPL · Apple Inc.</div>
          <div className="text-xs" style={{ color:'var(--text-3)' }}>Technology · NASDAQ</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-black font-mono" style={{ color: hasPrice ? 'var(--text-1)' : 'var(--text-3)' }}>
          {hasPrice ? `$${price.toFixed(2)}` : '—'}
        </span>
        <span className={`text-sm font-bold font-mono ${chg == null ? '' : chg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          style={chg == null ? { color:'var(--text-3)' } : undefined}>
          {chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%` : '—'}
        </span>
      </div>
    </div>
  )
}

/* Google Identity Services button — Google renders it and hands back a signed ID token */
let gsiScript
function loadGsi() {
  gsiScript ||= new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = 'https://accounts.google.com/gsi/client'
    el.async = true
    el.onload = resolve
    el.onerror = () => { gsiScript = null; reject(new Error('Google sign-in didn’t load')) }
    document.head.appendChild(el)
  })
  return gsiScript
}

function GoogleButton({ clientId, onCredential, theme, label }) {
  const ref = useRef(null)
  const cb = useRef(onCredential)
  cb.current = onCredential
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    loadGsi().then(() => {
      if (cancelled || !ref.current) return
      window.google.accounts.id.initialize({ client_id: clientId, callback: r => cb.current(r.credential) })
      ref.current.innerHTML = ''
      window.google.accounts.id.renderButton(ref.current, {
        theme: theme === 'light' ? 'outline' : 'filled_black', size: 'large', shape: 'rectangular',
        text: label, width: Math.min(ref.current.offsetWidth || 320, 400),
      })
    }).catch(() => setFailed(true))
    return () => { cancelled = true }
  }, [clientId, theme, label])
  if (failed) return <p className="text-xs" style={{ color:'var(--text-3)' }}>Google sign-in couldn’t load. Use email instead.</p>
  return <div ref={ref} className="w-full min-h-[44px] flex justify-center" />
}

export default function Sidebar() {
  const {
    sidebarOpen, setSidebar,
    sidebarTab, setSidebarTab,
    authTab, setAuthTab,
    user, authChecked, accountConfig, authForm, setAuthForm, authError, authLoading,
    handleSignIn, handleSignUp, handleGoogleCredential, handleSignOut, handleDeleteAccount,
    theme, setTheme, effectiveTheme,
    accent, setAccent, ACCENT_COLORS,
    fontSize, setFontSize,
  } = useApp()

  const [showPw, setShowPw] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const navigate = useNavigate()

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          <motion.div key="ov" variants={overlay} initial="hidden" animate="visible" exit="exit"
            className="sidebar-overlay" onClick={() => setSidebar(false)} />

          <motion.div key="panel" variants={panel} initial="hidden" animate="visible" exit="exit"
            className="sidebar-panel" style={{ background:'var(--bg-1)' }}>

            {/* Brand + tab header */}
            <div className="px-5 pt-4 pb-4 border-b shrink-0 space-y-4"
              style={{ borderColor:'var(--border)' }}>
              <div className="flex items-center justify-between">
                <BrandLockup size={24} />
                <button onClick={() => setSidebar(false)} aria-label="Close panel"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                  style={{ color:'var(--text-2)' }}>
                  <X size={16} />
                </button>
              </div>
              <div className="flex gap-1 p-1 rounded-lg border" style={SEG_WRAP}>
                {['account','preferences'].map(tab => (
                  <button key={tab} onClick={() => setSidebarTab(tab)}
                    className="flex-1 px-4 py-1.5 rounded-md text-sm font-semibold capitalize border transition-all"
                    style={sidebarTab === tab ? SEG_ON : SEG_OFF}>{tab}</button>
                ))}
              </div>
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
                          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black mx-auto mb-3 relative"
                            style={{ background:`rgba(var(--accent-rgb),.12)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.25)` }}>
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
                            <span className="inline-flex items-center gap-1.5 text-xs mt-2 px-2 py-0.5 rounded-md"
                              style={{ background:'var(--bg-2)', color:'var(--text-2)', border:'1px solid var(--border)' }}>
                              <GoogleIcon /> Signed in with Google
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 mt-4">
                          {[['My portfolio','/portfolio'],['Watchlist','/watchlist'],['AI alerts','/ai-alerts'],['Preferences',null]].map(([item, to]) => (
                            <button key={item}
                              onClick={() => to ? (navigate(to), setSidebar(false)) : setSidebarTab('preferences')}
                              className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors border"
                              style={{ background:'var(--bg-2)', color:'var(--text-2)', borderColor:'var(--border)' }}>
                              {item}
                              <ChevronRight size={14} style={{ color:'var(--text-3)' }} />
                            </button>
                          ))}
                        </div>

                        <p className="text-xs mt-4 leading-relaxed" style={{ color:'var(--text-3)' }}>
                          Your watchlist, portfolio, simulator and alerts are saved to this account and follow you to any device.
                        </p>

                        <button onClick={handleSignOut}
                          className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-colors"
                          style={{ background:'var(--bg-2)', color:'var(--text-1)', border:'1px solid var(--border-light)' }}>
                          <LogOut size={15} /> Sign out
                        </button>

                        <div className="mt-8 pt-5 border-t" style={{ borderColor:'var(--border)' }}>
                          {!confirmDelete ? (
                            <button onClick={() => setConfirmDelete(true)} className="text-xs font-semibold hover:underline"
                              style={{ color:'rgb(var(--down))' }}>
                              Delete account
                            </button>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-xs leading-relaxed" style={{ color:'var(--text-2)' }}>
                                This permanently deletes your account, saved data and alerts. It can’t be undone.
                              </p>
                              <div className="flex gap-2">
                                <button onClick={handleDeleteAccount} disabled={authLoading}
                                  className="flex-1 py-2 rounded-md text-xs font-bold disabled:opacity-60"
                                  style={{ background:'rgb(var(--down) / .12)', color:'rgb(var(--down))', border:'1px solid rgb(var(--down) / .3)' }}>
                                  Delete permanently
                                </button>
                                <button onClick={() => setConfirmDelete(false)} className="btn-ghost flex-1 justify-center !py-2 text-xs">Keep account</button>
                              </div>
                              {authError && <p role="alert" className="text-xs text-red-400 font-medium">{authError}</p>}
                            </div>
                          )}
                        </div>
                      </div>

                    ) : !authChecked || !accountConfig ? (
                      <div className="flex items-center justify-center gap-2 py-12 text-sm" style={{ color:'var(--text-3)' }}>
                        <Loader2 size={15} className="animate-spin" /> Checking your account…
                      </div>
                    ) : !accountConfig.enabled ? (
                      <div className="rounded-lg border p-4 text-sm leading-relaxed" style={{ background:'var(--bg-2)', borderColor:'var(--border)', color:'var(--text-2)' }}>
                        <div className="font-bold mb-1.5" style={{ color:'var(--text-1)' }}>
                          {accountConfig.unreachable ? 'Can’t reach the account server' : 'Accounts aren’t switched on yet'}
                        </div>
                        {accountConfig.unreachable
                          ? 'It may be waking up. Close this panel and try again in a minute.'
                          : 'Everything still works without one — your watchlist, portfolio and alerts are saved in this browser.'}
                      </div>
                    ) : (
                      <div>
                        {/* Sign-in / Sign-up toggle */}
                        <div className="flex rounded-lg p-1 mb-5 gap-1 border" style={SEG_WRAP}>
                          {[
                            { key:'signin', label:'Sign In'  },
                            { key:'signup', label:'Sign Up'  },
                          ].map(t => (
                            <button key={t.key} onClick={() => setAuthTab(t.key)}
                              className="flex-1 py-2 rounded-md text-sm font-bold border transition-all"
                              style={authTab === t.key ? SEG_ON : SEG_OFF}>{t.label}</button>
                          ))}
                        </div>

                        {/* Google Sign-in — only when the server has a Google client id */}
                        {accountConfig.google && (
                          <>
                            <GoogleButton clientId={accountConfig.google} onCredential={handleGoogleCredential}
                              theme={effectiveTheme} label={authTab === 'signup' ? 'signup_with' : 'continue_with'} />
                            <div className="flex items-center gap-3 my-4">
                              <div className="flex-1 h-px" style={{ background:'var(--border)' }}/>
                              <span className="text-xs font-medium" style={{ color:'var(--text-3)' }}>or</span>
                              <div className="flex-1 h-px" style={{ background:'var(--border)' }}/>
                            </div>
                          </>
                        )}

                        <AnimatePresence mode="wait">
                          {/* Sign In */}
                          {authTab === 'signin' && (
                            <motion.form key="si" onSubmit={handleSignIn}
                              initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:10 }}
                              className="space-y-4">
                              <div>
                                <label htmlFor="si-email" className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text-2)' }}>Email</label>
                                <input id="si-email" className="input" type="email" autoComplete="email" placeholder="you@example.com"
                                  value={authForm.email}
                                  onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} />
                              </div>
                              <div>
                                <label htmlFor="si-password" className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text-2)' }}>Password</label>
                                <div className="relative">
                                  <input id="si-password" autoComplete="current-password" className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                                    value={authForm.password}
                                    onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} />
                                  <button type="button" onClick={() => setShowPw(!showPw)}
                                    aria-label={showPw ? 'Hide password' : 'Show password'}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                    style={{ color:'var(--text-3)' }}>
                                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                              </div>
                              {authError && <p role="alert" className="text-xs text-red-400 font-medium">{authError}</p>}
                              <button type="submit" disabled={authLoading} className="btn-primary w-full justify-center py-3 mt-1">
                                {authLoading ? <><Loader2 size={14} className="animate-spin" /> Signing in…</> : <><LogIn size={14} /> Sign in</>}
                              </button>
                              <p className="text-xs text-center" style={{ color:'var(--text-3)' }}>
                                No account?{' '}
                                <button type="button" onClick={() => setAuthTab('signup')}
                                  className="font-semibold hover:underline" style={{ color:'var(--accent)' }}>
                                  Create one
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
                                <label htmlFor="su-name" className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text-2)' }}>Full Name</label>
                                <input id="su-name" className="input" type="text" placeholder="Your name"
                                  value={authForm.name}
                                  onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} />
                              </div>
                              <div>
                                <label htmlFor="su-email" className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text-2)' }}>Email</label>
                                <input id="su-email" className="input" type="email" placeholder="you@example.com"
                                  value={authForm.email}
                                  onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} />
                              </div>
                              <div>
                                <label htmlFor="su-password" className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text-2)' }}>Password</label>
                                <div className="relative">
                                  <input id="su-password" autoComplete="new-password" minLength={8} className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="At least 8 characters"
                                    value={authForm.password}
                                    onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} />
                                  <button type="button" onClick={() => setShowPw(!showPw)}
                                    aria-label={showPw ? 'Hide password' : 'Show password'}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                    style={{ color:'var(--text-3)' }}>
                                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                              </div>
                              {authError && <p role="alert" className="text-xs text-red-400 font-medium">{authError}</p>}
                              <button type="submit" disabled={authLoading} className="btn-primary w-full justify-center py-3 mt-1">
                                {authLoading ? <><Loader2 size={14} className="animate-spin" /> Creating account…</> : <><UserPlus size={14} /> Create account</>}
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
                    className="space-y-7">

                    {/* Appearance */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        {effectiveTheme === 'dark'
                          ? <Moon size={15} style={{ color:'var(--text-2)' }} />
                          : <Sun size={15} style={{ color:'var(--text-2)' }} />
                        }
                        <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Appearance</span>
                      </div>
                      <div className="flex rounded-lg p-1 gap-1 border" style={SEG_WRAP}>
                        {THEME_OPTIONS.map(({ key, label, icon: Icon }) => (
                          <button key={key} onClick={() => setTheme(key)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-xs font-bold border transition-all"
                            style={theme === key ? SEG_ON : SEG_OFF}>
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
                        <Palette size={15} style={{ color:'var(--text-2)' }} />
                        <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Accent Color</span>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        {Object.entries(ACCENT_COLORS).map(([key, c]) => (
                          <button key={key} onClick={() => setAccent(key)}
                            className={`color-swatch${accent === key ? ' active' : ''}`}
                            style={{ background: c.value }}
                            aria-label={c.name} aria-pressed={accent === key}
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
                        <Type size={15} style={{ color:'var(--text-2)' }} />
                        <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Text Size</span>
                      </div>
                      <div className="flex rounded-lg p-1 gap-1 border" style={SEG_WRAP}>
                        {FONT_SIZES.map(s => (
                          <button key={s.key} onClick={() => setFontSize(s.key)}
                            className="flex-1 py-2.5 rounded-md text-sm font-bold transition-all border"
                            style={fontSize === s.key ? SEG_ON : SEG_OFF}>{s.label}</button>
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
                Foliyo · Market tracking
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
