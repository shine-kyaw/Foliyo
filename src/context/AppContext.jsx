import { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext(null)

const ACCENT_COLORS = {
  cyan:    { name: 'Cyan',    value: '#06b6d4', rgb: '6,182,212'   },
  blue:    { name: 'Blue',    value: '#3b82f6', rgb: '59,130,246'  },
  violet:  { name: 'Violet', value: '#8b5cf6', rgb: '139,92,246'  },
  emerald: { name: 'Green',  value: '#10b981', rgb: '16,185,129'  },
  orange:  { name: 'Orange', value: '#f97316', rgb: '249,115,22'  },
  rose:    { name: 'Rose',   value: '#f43f5e', rgb: '244,63,94'   },
}

function getSystemScheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function AppProvider({ children }) {
  // 'dark' | 'light' | 'system'
  const [theme, setTheme]       = useState(() => localStorage.getItem('foliyo_theme') || 'dark')
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [accent, setAccent]     = useState(() => localStorage.getItem('foliyo_accent') || 'cyan')
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('foliyo_fontsize') || 'md')

  const [sidebarOpen, setSidebar]   = useState(false)
  const [sidebarTab, setSidebarTab] = useState('account')
  const [authTab, setAuthTab]       = useState('signin')

  const [user, setUser]       = useState(null)
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const accentColor = ACCENT_COLORS[accent]

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
    root.style.setProperty('--accent', accentColor.value)
    root.style.setProperty('--accent-rgb', accentColor.rgb)

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
