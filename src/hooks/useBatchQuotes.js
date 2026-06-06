import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '../services/api'

const LS_PREFIX = 'foliyo_quotes_'
const LS_TTL    = 5 * 60 * 1000   // 5 min — stale-but-visible window

function lsRead(key) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > LS_TTL) return null   // too old, don't show
    return data
  } catch { return null }
}

function lsWrite(key, data) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify({ data, ts: Date.now() })) }
  catch { /* quota exceeded — silent */ }
}

/**
 * Fetches live quotes for many symbols at once.
 * • Instantly loads last-known prices from localStorage (zero network wait)
 * • Fetches fresh data in background and swaps in silently
 * • Polls every `pollMs` ms (default 60 s, 0 to disable)
 *
 * @returns { quotes, loading, lastUpdated, refetch }
 */
export function useBatchQuotes(symbols, pollMs = 60_000) {
  const symbolsKey = (symbols || []).join(',')

  // Seed state from localStorage immediately — synchronous, zero lag
  const [quotes, setQuotes]           = useState(() => lsRead(symbolsKey) || {})
  const [loading, setLoading]         = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const prevKeyRef = useRef(symbolsKey)

  // When the symbol list changes, load the new LS snapshot instantly
  useEffect(() => {
    if (prevKeyRef.current !== symbolsKey) {
      prevKeyRef.current = symbolsKey
      const snap = lsRead(symbolsKey)
      if (snap) setQuotes(snap)
    }
  }, [symbolsKey])

  const doLoad = useCallback(async (signal) => {
    if (!symbolsKey) return
    try {
      const res = await api.quotes(symbolsKey)
      if (signal?.aborted) return
      const fresh = res.quotes || {}
      setQuotes(fresh)
      setLastUpdated(res.lastUpdated)
      lsWrite(symbolsKey, fresh)          // persist for next page load
    } catch {
      // silent — stale data stays visible
    }
  }, [symbolsKey])

  useEffect(() => {
    if (!symbolsKey) return
    const ctrl = new AbortController()

    // First fetch: show loading only if we have nothing at all
    const hasStale = Object.keys(lsRead(symbolsKey) || {}).length > 0
    if (!hasStale) setLoading(true)

    doLoad(ctrl.signal).finally(() => setLoading(false))

    let id
    if (pollMs > 0) id = setInterval(() => doLoad(ctrl.signal), pollMs)

    // Listen for manual refresh trigger from the navbar button
    const onRefresh = () => doLoad(ctrl.signal)
    window.addEventListener('foliyo:refresh', onRefresh)

    return () => { ctrl.abort(); clearInterval(id); window.removeEventListener('foliyo:refresh', onRefresh) }
  }, [symbolsKey, pollMs, doLoad])

  return { quotes, loading, lastUpdated, refetch: () => doLoad(new AbortController().signal) }
}
