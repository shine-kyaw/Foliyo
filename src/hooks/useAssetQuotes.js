import { useEffect, useState } from 'react'
import { api } from '../services/api'

const POLL_MS = 3 * 60 * 1000

// Module-level cache shared by every consumer: { 'BTC/USD': { price, change, changePct }, ... }
let cache = {}
let inflight = null
let loaded = false
const listeners = new Set()

const live = a => Number.isFinite(a?.price) && Number.isFinite(a?.changePct) && a.status !== 'unavailable'

function load() {
  if (inflight) return inflight
  inflight = Promise.allSettled([api.crypto(), api.commodities(), api.forex()])
    .then(results => {
      const next = { ...cache }
      for (const r of results) {
        if (r.status !== 'fulfilled') continue          // keep last-known values for a failed endpoint
        const list = r.value?.assets || r.value
        if (!Array.isArray(list)) continue
        for (const a of list) {
          if (live(a)) next[a.symbol] = { price: a.price, change: a.change, changePct: a.changePct }
          else delete next[a.symbol]
        }
      }
      cache = next
      loaded = true
      listeners.forEach(fn => fn(cache))
    })
    .finally(() => { inflight = null })
  return inflight
}

/**
 * Live crypto / commodity / FX quotes keyed by API symbol (BTC/USD, XAU/USD, EUR/USD…).
 * Symbols with no live price are simply absent from the map.
 */
export function useAssetQuotes() {
  const [quotes, setQuotes] = useState(cache)
  const [ready, setReady]   = useState(loaded)

  useEffect(() => {
    const onData = q => { setQuotes(q); setReady(true) }
    listeners.add(onData)
    setQuotes(cache)
    load()
    const id = setInterval(load, POLL_MS)
    const onRefresh = () => load()
    window.addEventListener('foliyo:refresh', onRefresh)
    return () => {
      listeners.delete(onData)
      clearInterval(id)
      window.removeEventListener('foliyo:refresh', onRefresh)
    }
  }, [])

  return { quotes, ready }
}
