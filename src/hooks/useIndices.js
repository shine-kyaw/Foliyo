import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

/* Fallback data so the bar always shows something */
const FALLBACK = [
  { symbol:'^GSPC',  name:'S&P 500',   price:null, changePct:null },
  { symbol:'^IXIC',  name:'NASDAQ',    price:null, changePct:null },
  { symbol:'^DJI',   name:'Dow Jones', price:null, changePct:null },
]

const cache = { data: null, exp: 0 }

export function useIndices() {
  const [indices, setIndices] = useState(FALLBACK)
  const [isLive, setIsLive]   = useState(false)

  const load = useCallback(async () => {
    if (cache.data && Date.now() < cache.exp) {
      setIndices(cache.data); setIsLive(true); return
    }
    try {
      const data = await api.indices()
      if (Array.isArray(data) && data.length) {
        cache.data = data; cache.exp = Date.now() + 30_000
        setIndices(data); setIsLive(true)
      }
    } catch { /* keep fallback */ }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 30_000)
    return () => clearInterval(timer)
  }, [load])

  return { indices, isLive }
}
