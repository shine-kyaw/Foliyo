import { useState, useEffect } from 'react'
import { api } from '../services/api'

const cache = new Map()
const TTL = 24 * 60 * 60_000  // 24 hours

/**
 * Fetches company fundamentals (Finnhub + Alpha Vantage fallback) via backend.
 *
 * Returns: { data, loading, isLive }
 * data fields: pe, pb, beta, eps, dividendYield, week52High, week52Low,
 *              mktCap, roe, description, industry, country, website, logo
 */
export function useFundamentals(symbol) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [isLive, setIsLive]   = useState(false)

  useEffect(() => {
    if (!symbol) return
    const key = symbol.toUpperCase()
    const cached = cache.get(key)
    if (cached && Date.now() < cached.exp) {
      setData(cached.data); setIsLive(true); return
    }
    setLoading(true)
    api.fundamentals(symbol)
      .then(result => {
        cache.set(key, { data: result, exp: Date.now() + TTL })
        setData(result); setIsLive(result.isLive ?? false)
      })
      .catch(() => { setData(null); setIsLive(false) })
      .finally(() => setLoading(false))
  }, [symbol])

  return { data, loading, isLive }
}
