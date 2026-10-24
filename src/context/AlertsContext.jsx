import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from './AppContext'
import { account } from '../services/account'
import { api } from '../services/api'
import { evaluateAlert, needsVerdict, needsNews } from '../utils/alertRules'
import { generateAIAnalysis } from '../utils/aiAnalysis'
import { stocks } from '../data/mockData'

/* ── Alerts ────────────────────────────────────────────────────
   Signed out: alerts live in this browser and are checked here,
   once a minute, while Foliyo is open.
   Signed in: alerts live on the account; the API checks them in
   the background (and emails when asked). This side picks up what
   fired and shows it — a toast, plus a browser notification when
   the alert asked for one.                                       */
const LOCAL_KEY    = 'foliyo_user_alerts'
const NOTIFIED_KEY = 'foliyo_alerts_notified'
const CHECK_EVERY  = 60_000
const STATIC = Object.fromEntries(stocks.map(s => [s.symbol, s]))

const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

// The old build seeded three example alerts (ids a1–a3); they were never real
const loadLocal = () => readJSON(LOCAL_KEY, []).filter(a => !['a1', 'a2', 'a3'].includes(a.id))

export function browserNotificationsState() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission   // 'granted' | 'denied' | 'default'
}

export async function requestBrowserNotifications() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

const AlertsContext = createContext(null)

export function AlertsProvider({ children }) {
  const { user, authChecked } = useApp()
  const signedIn = !!user
  const [alerts, setAlerts]   = useState(loadLocal)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [toasts, setToasts]   = useState([])
  const alertsRef = useRef(alerts)
  alertsRef.current = alerts

  /* ── Notify once per firing ─────────────────────────────── */
  const notify = useCallback((a) => {
    const stamp = `${a.id}@${a.triggeredAt}`
    const seen = readJSON(NOTIFIED_KEY, [])
    if (seen.includes(stamp)) return
    writeJSON(NOTIFIED_KEY, [...seen, stamp].slice(-200))

    const text = `${a.stock.symbol}: ${a.triggerNote}`
    setToasts(t => [...t, { id: stamp, symbol: a.stock.symbol, text }].slice(-4))
    if (['browser', 'both'].includes(a.notifMethod) && browserNotificationsState() === 'granted') {
      try {
        const n = new Notification(`Foliyo alert · ${a.stock.symbol}`, { body: a.triggerNote, icon: '/favicon-32.png', tag: stamp })
        n.onclick = () => { window.focus(); window.location.assign(`/stock/${encodeURIComponent(a.stock.symbol)}`) }
      } catch { /* some browsers only allow notifications from a service worker */ }
    }
  }, [])

  const dismissToast = id => setToasts(t => t.filter(x => x.id !== id))

  /* ── Load: account copy when signed in, browser copy otherwise ── */
  const loadRemote = useCallback(async ({ announce } = {}) => {
    const { alerts: list } = await account.alerts()
    if (announce) {
      const before = Object.fromEntries(alertsRef.current.map(a => [a.id, a.triggeredAt]))
      list.filter(a => a.status === 'triggered' && a.triggeredAt && before[a.id] !== a.triggeredAt).forEach(notify)
    }
    setAlerts(list)
  }, [notify])

  useEffect(() => {
    if (!authChecked) return
    if (!signedIn) { setAlerts(loadLocal()); setError(''); return }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        // Alerts made before signing in move to the account
        const local = loadLocal()
        if (local.length) { await account.importAlerts(local); writeJSON(LOCAL_KEY, []) }
        if (!cancelled) await loadRemote()
        setError('')
      } catch (e) { if (!cancelled) setError(e.message) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [signedIn, authChecked, loadRemote])

  useEffect(() => { if (!signedIn) writeJSON(LOCAL_KEY, alerts) }, [alerts, signedIn])

  /* ── Checking ───────────────────────────────────────────── */
  const checkLocal = useCallback(async () => {
    const active = alertsRef.current.filter(a => a.status === 'active')
    if (!active.length) return
    const symbols = [...new Set(active.map(a => a.stock.symbol))]
    let quotes = {}
    try { quotes = (await api.quotes(symbols)).quotes || {} } catch { return }
    const news = {}
    for (const sym of new Set(active.filter(a => needsNews(a.type)).map(a => a.stock.symbol))) {
      try {
        const { articles = [] } = await api.news(sym)
        news[sym] = articles[0] ? { id: articles[0].id, title: articles[0].title } : null
      } catch { news[sym] = null }
    }

    const fired = []
    const updates = {}
    for (const a of active) {
      const q = quotes[a.stock.symbol]
      const ctx = {
        price: q?.price ?? null,
        changePct: q?.changePct ?? null,
        verdict: needsVerdict(a.type) && q
          ? generateAIAnalysis({ ...(STATIC[a.stock.symbol] || a.stock), price: q.price, changePct: q.changePct })?.verdict
          : null,
        latestNewsId: news[a.stock.symbol]?.id ?? null,
        latestNewsTitle: news[a.stock.symbol]?.title,
      }
      const out = evaluateAlert(a, ctx)
      const next = { ...a, baseline: out.baseline, stock: { ...a.stock, price: ctx.price ?? a.stock.price } }
      if (out.triggered) Object.assign(next, { status: 'triggered', triggeredAt: new Date().toISOString(), triggerNote: out.message, triggerPrice: ctx.price })
      updates[a.id] = next
      if (out.triggered) fired.push(next)
    }
    setAlerts(list => list.map(a => updates[a.id] && a.status === 'active' ? updates[a.id] : a))
    fired.forEach(notify)
  }, [notify])

  const check = useCallback(() => {
    if (signedIn) return loadRemote({ announce: true }).catch(() => {})
    return checkLocal()
  }, [signedIn, loadRemote, checkLocal])

  useEffect(() => {
    if (!authChecked) return
    const first = setTimeout(check, 3_000)
    const id = setInterval(check, CHECK_EVERY)
    return () => { clearTimeout(first); clearInterval(id) }
  }, [authChecked, check])

  /* ── Changes ────────────────────────────────────────────── */
  const addAlert = async (draft) => {
    if (signedIn) {
      const { alert } = await account.addAlert(draft)
      setAlerts(list => [alert, ...list])
      return alert
    }
    const alert = { ...draft, id: crypto.randomUUID?.() || `a${Date.now()}`, status: 'active', baseline: {}, createdAt: new Date().toISOString() }
    setAlerts(list => [alert, ...list])
    return alert
  }

  // Active ⇄ paused; a triggered alert goes back to watching
  const togglePause = async (id) => {
    const a = alerts.find(x => x.id === id)
    if (!a) return
    const status = a.status === 'active' ? 'paused' : 'active'
    if (signedIn) {
      const { alert } = await account.setStatus(id, status)
      setAlerts(list => list.map(x => x.id === id ? alert : x))
    } else {
      setAlerts(list => list.map(x => x.id === id
        ? { ...x, status, ...(status === 'active' ? { triggeredAt: null, triggerNote: null, triggerPrice: null } : {}) }
        : x))
    }
  }

  const removeAlert = async (id) => {
    if (signedIn) await account.deleteAlert(id)
    setAlerts(list => list.filter(x => x.id !== id))
  }

  return (
    <AlertsContext.Provider value={{
      alerts, loading, error, signedIn, toasts, dismissToast,
      addAlert, togglePause, removeAlert, checkNow: check,
    }}>
      {children}
    </AlertsContext.Provider>
  )
}

export const useAlerts = () => useContext(AlertsContext)
