import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { generatePriceHistory } from '../data/mockData'

const CLIENT_TTL = { '1D': 60_000, '5D': 120_000, '1M': 300_000, '6M': 600_000, '1Y': 600_000, '5Y': 1_800_000, 'All': 3_600_000 }
const cache = new Map()

/**
 * Fetches historical chart data (Twelve Data via backend, Finnhub fallback).
 * Falls back to deterministic mock data when both APIs fail.
 *
 * Returns: { data, loading, error, isLive, source, refetch }
 * data: [{ date, price, volume }]
 */
export function useChart(symbol, range = '1M', mockPrice = null) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const [isLive, setIsLive] = useState(false)
  const [source, setSource] = useState(null)

  const load = useCallback(async () => {
    if (!symbol) return
    const cacheKey = `${symbol}:${range}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() < cached.exp) {
      setData(cached.data); setIsLive(cached.isLive); setSource(cached.source)
      return
    }
    setLoading(true); setError(null)
    try {
      const result = await api.chart(symbol, range)
      const ttl = CLIENT_TTL[range] ?? 300_000
      cache.set(cacheKey, { data: result.data, isLive: result.isLive, source: result.source, exp: Date.now() + ttl })
      setData(result.data); setIsLive(result.isLive ?? false); setSource(result.source)
    } catch (err) {
      // Fallback: generate mock history from a price if provided
      const pts = { '1D': 78, '5D': 65, '1M': 22, '6M': 130, '1Y': 252, '5Y': 260, 'All': 120 }[range] ?? 30
      const fallback = mockPrice ? generatePriceHistory(mockPrice, pts) : null
      setData(fallback); setIsLive(false); setSource('Reference Data')
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [symbol, range, mockPrice])

  useEffect(() => { load() }, [load])

  return { data, loading, error, isLive, source, refetch: load }
}
