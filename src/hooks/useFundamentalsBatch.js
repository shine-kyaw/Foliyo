import { useEffect, useState } from 'react'
import { api } from '../services/api'

/* ── Market cap, P/E and average volume for a list of symbols ──
   The API answers with what it has cached and fetches the rest
   slowly (Finnhub's free tier), so keep asking every 20 s until
   everything has arrived. Shared cache across tables.            */
const store = {}
const listeners = new Set()

export function useFundamentalsBatch(symbols) {
  const key = (symbols || []).join(',')
  const [, bump] = useState(0)

  useEffect(() => {
    const onData = () => bump(n => n + 1)
    listeners.add(onData)
    return () => listeners.delete(onData)
  }, [])

  useEffect(() => {
    if (!key) return
    let cancelled = false, timer, tries = 0
    const load = async () => {
      const missing = key.split(',').filter(s => !store[s])
      if (!missing.length) return
      try {
        const res = await api.fundamentalsBatch(missing.join(','))
        Object.assign(store, res.data || {})
        listeners.forEach(fn => fn())
        if (!cancelled && res.pending?.length && ++tries < 20) timer = setTimeout(load, 20_000)
      } catch {
        if (!cancelled && ++tries < 20) timer = setTimeout(load, 30_000)
      }
    }
    load()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [key])

  return store
}

/* "4.2M" style volume */
export const fmtVolume = v => {
  if (!Number.isFinite(v) || v <= 0) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return String(Math.round(v))
}
