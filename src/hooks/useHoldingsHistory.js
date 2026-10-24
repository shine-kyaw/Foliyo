import { useEffect, useState } from 'react'
import { api } from '../services/api'

/* ── Value of today's holdings over past trading days ──────────
   For each day: Σ shares × that day's real close. Days where any
   holding has no close are left out rather than guessed.          */
const cache = new Map()   // `${symbol}:${range}` → [{ rawDate, date, price }]

export function useHoldingsHistory(holdings, range = '6M') {
  const key = holdings.map(h => `${h.symbol}:${h.shares}`).join(',')
  const [state, setState] = useState({ data: [], loading: false, missing: [] })

  useEffect(() => {
    if (!holdings.length) { setState({ data: [], loading: false, missing: [] }); return }
    let cancelled = false
    setState(s => ({ ...s, loading: true }))
    ;(async () => {
      const series = {}
      const missing = []
      for (const h of holdings) {                  // one at a time — the chart provider is rate-limited
        const ck = `${h.symbol}:${range}`
        if (!cache.has(ck)) {
          try {
            const r = await api.chart(h.symbol, range)
            if (r?.isLive !== false && r?.data?.length) cache.set(ck, r.data)
          } catch { /* counted as missing below */ }
        }
        if (cache.has(ck)) series[h.symbol] = cache.get(ck)
        else missing.push(h.symbol)
      }
      if (cancelled) return
      const included = holdings.filter(h => series[h.symbol])
      const byDate = new Map()
      for (const h of included) {
        for (const p of series[h.symbol]) {
          const k = p.rawDate || p.date
          const row = byDate.get(k) || { date: p.date, rawDate: k, value: 0, n: 0 }
          row.value += h.shares * p.price
          row.n += 1
          byDate.set(k, row)
        }
      }
      const data = [...byDate.values()]
        .filter(r => r.n === included.length)
        .sort((a, b) => String(a.rawDate).localeCompare(String(b.rawDate)))
        .map(r => ({ date: r.date, value: Math.round(r.value * 100) / 100 }))
      setState({ data, loading: false, missing })
    })()
    return () => { cancelled = true }
  }, [key, range])

  return state
}
