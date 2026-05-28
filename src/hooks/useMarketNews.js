import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { newsArticles } from '../data/mockData'

/**
 * Fetches general market news via the backend (Finnhub).
 * Falls back to mock articles when server is unavailable.
 */
export function useMarketNews() {
  const [articles, setArticles] = useState([])
  const [isLive, setIsLive]     = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const result = await api.marketNews()
        if (cancelled) return
        const arts = result.articles?.length ? result.articles : newsArticles
        setArticles(arts); setIsLive(result.isLive ?? false)
      } catch {
        if (!cancelled) { setArticles(newsArticles); setIsLive(false) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return { articles, isLive, loading }
}

/**
 * Fetches company-specific news for a symbol via the backend.
 * Falls back to mock articles filtered by relatedSymbols.
 */
export function useCompanyNews(symbol) {
  const [articles, setArticles] = useState([])
  const [isLive, setIsLive]     = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!symbol) { setLoading(false); return }
    let cancelled = false
    async function load() {
      try {
        const result = await api.news(symbol)
        if (cancelled) return
        if (result.articles?.length) {
          setArticles(result.articles); setIsLive(true)
        } else {
          const mock = newsArticles.filter(n => n.relatedSymbols?.includes(symbol))
          setArticles(mock); setIsLive(false)
        }
      } catch {
        if (!cancelled) {
          const mock = newsArticles.filter(n => n.relatedSymbols?.includes(symbol))
          setArticles(mock); setIsLive(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [symbol])

  return { articles, isLive, loading }
}
