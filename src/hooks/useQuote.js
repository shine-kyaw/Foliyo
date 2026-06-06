import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

const REFRESH_MS = 30_000
const LS_PREFIX  = 'foliyo_quote_'
const LS_TTL     = 5 * 60 * 1000   // 5 min stale window

function lsRead(symbol) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + symbol)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > LS_TTL) return null
    return data
  } catch { return null }
}

function lsWrite(symbol, data) {
  try { localStorage.setItem(LS_PREFIX + symbol, JSON.stringify({ data, ts: Date.now() })) }
  catch { /* quota exceeded */ }
}

/**
 * Fetches a live stock quote via the backend (Finnhub).
 * • Instantly seeds from localStorage (zero network wait on repeat visits)
 * • Refreshes in background every 30 s
 *
 * status: 'loading' | 'live' | 'unavailable'
 */
export function useQuote(symbol) {
  const key = symbol?.toUpperCase() || ''

  const [quote, setQuote]             = useState(() => lsRead(key))
  const [status, setStatus]           = useState(() => lsRead(key) ? 'live' : 'loading')
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(async () => {
    if (!key) return
    try {
      const data = await api.quote(key)
      setQuote(data)
      setStatus(data.status || 'live')
      setLastUpdated(data.lastUpdated)
      lsWrite(key, data)
    } catch {
      setStatus(q => q === 'live' ? 'live' : 'unavailable')   // keep showing stale on error
    }
  }, [key])

  useEffect(() => {
    if (!key) return
    // Only reset to 'loading' if we have nothing to show
    if (!lsRead(key)) { setQuote(null); setStatus('loading') }
    load()
    const id = setInterval(load, REFRESH_MS)
    // Listen for manual refresh trigger from the navbar button
    window.addEventListener('foliyo:refresh', load)
    return () => { clearInterval(id); window.removeEventListener('foliyo:refresh', load) }
  }, [key, load])

  return { quote, status, lastUpdated, refetch: load }
}
