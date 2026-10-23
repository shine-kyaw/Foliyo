import { createContext, useContext, useState, useEffect } from 'react'

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
const DEFAULT_ACCENT = 'marigold'

function getSystemScheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function AppProvider({ children }) {
  // 'dark' | 'light' | 'system'
  const [theme, setTheme]       = useState(() => localStorage.getItem('foliyo_theme') || 'dark')
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

  const accentColor = ACCENT_COLORS[accent] ?? ACCENT_COLORS[DEFAULT_ACCENT]

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
    localStorage.setItem('foliyo_theme', theme)
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

  // Mock email sign-in
  const handleSignIn = (e) => {
    e.preventDefault()
    if (!authForm.email || !authForm.password) { setAuthError('Fill in all fields.'); return }
    setUser({ email: authForm.email, name: authForm.email.split('@')[0], provider: 'email' })
    setAuthError('')
    setSidebar(false)
  }

  // Mock email sign-up
  const handleSignUp = (e) => {
    e.preventDefault()
    if (!authForm.email || !authForm.password || !authForm.name) { setAuthError('Fill in all fields.'); return }
    setUser({ email: authForm.email, name: authForm.name, provider: 'email' })
    setAuthError('')
    setSidebar(false)
  }

  // Mock Google sign-in (simulates OAuth flow)
  const handleGoogleSignIn = async () => {
    setAuthLoading(true)
    setAuthError('')
    await new Promise(r => setTimeout(r, 900)) // simulate OAuth round-trip
    const mockEmails = ['alex.morgan@gmail.com', 'sam.chen@gmail.com', 'jordan.lee@gmail.com']
    const mockEmail = mockEmails[Math.floor(Math.random() * mockEmails.length)]
    const mockName = mockEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase())
    setUser({ email: mockEmail, name: mockName, provider: 'google', avatar: mockName.charAt(0) })
    setAuthLoading(false)
    setSidebar(false)
  }

  const handleSignOut = () => {
    setUser(null)
    setAuthForm({ email: '', password: '', name: '' })
    setAuthError('')
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
      user, authForm, setAuthForm, authError, setAuthError, authLoading,
      handleSignIn, handleSignUp, handleGoogleSignIn, handleSignOut,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
