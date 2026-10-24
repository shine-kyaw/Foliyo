import { createContext, useContext, useState, useEffect } from 'react'
import { account, getToken, setToken } from '../services/account'
import { pullUserData, clearUserData } from '../utils/userStore'

const AppContext = createContext(null)

/* Accents come from the Foliyo mark. Each has a deeper `light` variant so
 * accent-coloured text keeps its contrast on the cream light theme. */
const ACCENT_COLORS = {
  marigold: { name: 'Marigold', value: '#e8a43e', rgb: '232,164,62',  light: { value: '#a96a12', rgb: '169,106,18'  } },
  steel:    { name: 'Steel',    value: '#6fa3b8', rgb: '111,163,184', light: { value: '#2e6378', rgb: '46,99,120'   } },
  sage:     { name: 'Sage',     value: '#8fb38a', rgb: '143,179,138', light: { value: '#4b7445', rgb: '75,116,69'   } },
  clay:     { name: 'Clay',     value: '#d9805c', rgb: '217,128,92',  light: { value: '#a4492a', rgb: '164,73,42'   } },
  cream:    { name: 'Cream',    value: '#e9dfca', rgb: '233,223,202', light: { value: '#2e4a57', rgb: '46,74,87'    } },
}
const DEFAULT_ACCENT = 'steel'

function getSystemScheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function AppProvider({ children }) {
  // 'dark' | 'light' | 'system'
  // v2 key: the old one was written on every visit, so it can't tell a choice from the old dark default
  const [theme, setTheme]       = useState(() => localStorage.getItem('foliyo_theme_v2') || 'light')
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  // Accents saved before the rebrand (cyan, violet…) no longer exist — fall back to marigold
  const [accent, setAccent]     = useState(() => {
    const saved = localStorage.getItem('foliyo_accent')
    return ACCENT_COLORS[saved] ? saved : DEFAULT_ACCENT
  })
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('foliyo_fontsize') || 'md')

  const [sidebarOpen, setSidebar]   = useState(false)
  const [sidebarTab, setSidebarTab] = useState('account')
  const [authTab, setAuthTab]       = useState('signin')

  const [user, setUser]       = useState(null)
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [accountConfig, setAccountConfig] = useState(null)   // { enabled, google, emailAlerts }
  const [dataVersion, setDataVersion] = useState(0)          // bumps when synced data is replaced

  const accentColor = ACCENT_COLORS[accent] ?? ACCENT_COLORS[DEFAULT_ACCENT]

  // What the server offers, and whether a saved session is still valid
  useEffect(() => {
    account.config()
      .then(setAccountConfig)
      .catch(() => setAccountConfig({ enabled: false, google: null, emailAlerts: false, unreachable: true }))
    if (!getToken()) { setAuthChecked(true); return }
    account.me()
      .then(({ user }) => setUser(user))
      .catch(err => { if (err.status === 401) setToken(null) })
      .finally(() => setAuthChecked(true))
  }, [])

  // Listen for OS-level color scheme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = e => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Compute the actual rendered theme
  const effectiveTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  // Apply theme + accent + font to DOM
  useEffect(() => {
    localStorage.setItem('foliyo_theme_v2', theme)
    localStorage.setItem('foliyo_accent', accent)
    localStorage.setItem('foliyo_fontsize', fontSize)

    const root = document.documentElement
    root.setAttribute('data-theme', effectiveTheme)
    const tone = effectiveTheme === 'light' ? accentColor.light : accentColor
    root.style.setProperty('--accent', tone.value)
    root.style.setProperty('--accent-rgb', tone.rgb)

    const scales = { sm: '0.9', md: '1', lg: '1.12' }
    root.style.setProperty('--font-scale', scales[fontSize])
  }, [effectiveTheme, theme, accent, fontSize, accentColor])

  /* ── Accounts ─────────────────────────────────────────────── */
  const finishAuth = async ({ token, user }) => {
    setToken(token)
    setUser(user)
    setAuthForm({ email: '', password: '', name: '' })
    setAuthError('')
    try { await pullUserData() } catch { /* local copy stays usable */ }
    setDataVersion(v => v + 1)
    setSidebar(false)
  }

  const run = async (fn) => {
    setAuthLoading(true)
    setAuthError('')
    try { await finishAuth(await fn()) }
    catch (err) { setAuthError(err.message) }
    finally { setAuthLoading(false) }
  }

  const handleSignIn = (e) => {
    e.preventDefault()
    if (!authForm.email.trim()) { setAuthError('Enter your email address.'); return }
    if (!authForm.password) { setAuthError('Enter your password.'); return }
    run(() => account.signIn(authForm.email, authForm.password))
  }

  const handleSignUp = (e) => {
    e.preventDefault()
    if (!authForm.name.trim()) { setAuthError('Enter your name.'); return }
    if (!authForm.email.trim()) { setAuthError('Enter your email address.'); return }
    if (authForm.password.length < 8) { setAuthError('Use at least 8 characters for your password.'); return }
    run(() => account.signUp(authForm.name, authForm.email, authForm.password))
  }

  // Google Identity Services hands us a signed ID token; the API verifies it
  const handleGoogleCredential = (credential) => run(() => account.google(credential))

  const handleSignOut = () => {
    setToken(null)
    clearUserData()
    setUser(null)
    setAuthForm({ email: '', password: '', name: '' })
    setAuthError('')
    setDataVersion(v => v + 1)
  }

  const handleDeleteAccount = async () => {
    setAuthLoading(true)
    try { await account.remove(); handleSignOut() }
    catch (err) { setAuthError(err.message) }
    finally { setAuthLoading(false) }
  }

  return (
    <AppContext.Provider value={{
      theme, setTheme,
      effectiveTheme,
      accent, setAccent, accentColor, ACCENT_COLORS,
      fontSize, setFontSize,
      sidebarOpen, setSidebar,
      sidebarTab, setSidebarTab,
      authTab, setAuthTab,
      user, authChecked, accountConfig, dataVersion,
      authForm, setAuthForm, authError, setAuthError, authLoading,
      handleSignIn, handleSignUp, handleGoogleCredential, handleSignOut, handleDeleteAccount,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
