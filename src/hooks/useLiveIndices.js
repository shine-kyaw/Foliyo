import { useEffect, useState } from 'react'
import { api } from '../services/api'

/**
 * Fetches live market indices (S&P 500, NASDAQ 100, Dow Jones) via SPY/QQQ/DIA proxies.
 * Auto-refreshes every 60 seconds.
 *
 * @returns { indices: [{symbol,name,price,change,changePct,prevClose}], isLive, lastUpdated }
 */
export function useLiveIndices(pollMs = 60_000) {
  const [indices, setIndices]         = useState([])
  const [isLive, setIsLive]           = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await api.indices()
        if (cancelled) return
        const live = Array.isArray(data) ? data.filter(d => d.price) : []
        if (live.length) {
          setIndices(live)
          setIsLive(true)
          setLastUpdated(new Date().toISOString())
        }
      } catch {
        // Silent — components fall back to mock data
      }
    }
    load()
    if (pollMs > 0) {
      const id = setInterval(load, pollMs)
      return () => { cancelled = true; clearInterval(id) }
    }
    return () => { cancelled = true }
  }, [pollMs])

  return { indices, isLive, lastUpdated }
}
