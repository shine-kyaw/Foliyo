import express from 'express'
import { get, set } from '../cache.js'

const router = express.Router()
const FINNHUB = 'https://finnhub.io/api/v1'
const COMPANY_TTL = 10 * 60_000  // 10 min
const MARKET_TTL  = 5 * 60_000   // 5 min

function toISODate(d) { return d.toISOString().split('T')[0] }
function fmtAge(ms) {
  const diff = Date.now() - ms
  const m = Math.floor(diff / 60_000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
function mapCat(cat) {
  const m = { earnings: 'Earnings', ipo: 'Corporate', merger: 'Corporate', forex: 'Macro', crypto: 'Crypto', general: 'Macro', technology: 'Technology' }
  return m[cat] || 'Macro'
}
function normalize(item, i) {
  return {
    id: item.id ?? i,
    title: item.headline || item.summary?.slice(0, 80) || 'Untitled',
    summary: item.summary || '',
    source: item.source || 'Market News',
    time: fmtAge((item.datetime || 0) * 1000),
    url: item.url || '#',
    category: mapCat(item.category),
    sentiment: 'neutral',
    relatedSymbols: item.related ? [item.related] : [],
    isLive: true,
  }
}

// GET /api/news?symbol=AAPL  → company news
// GET /api/market-news        → general market news  (no symbol param)
router.get('/', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase().trim()
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'FINNHUB_API_KEY not configured', articles: [] })

  if (symbol) {
    const cacheKey = `news:company:${symbol}`
    const cached = get(cacheKey)
    if (cached) return res.json(cached)
    try {
      const now = new Date()
      const past = new Date(now); past.setDate(past.getDate() - 14)
      const url = `${FINNHUB}/company-news?symbol=${symbol}&from=${toISODate(past)}&to=${toISODate(now)}&token=${apiKey}`
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!r.ok) throw new Error(`Finnhub HTTP ${r.status}`)
      const raw = await r.json()
      const articles = Array.isArray(raw) ? raw.slice(0, 12).map(normalize) : []
      const result = { articles, symbol, isLive: articles.length > 0, lastUpdated: new Date().toISOString() }
      set(cacheKey, result, COMPANY_TTL)
      res.json(result)
    } catch (err) {
      res.status(502).json({ error: err.message, articles: [], isLive: false })
    }
  } else {
    // market-wide news
    const cacheKey = 'news:market'
    const cached = get(cacheKey)
    if (cached) return res.json(cached)
    try {
      const url = `${FINNHUB}/news?category=general&minId=0&token=${apiKey}`
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!r.ok) throw new Error(`Finnhub HTTP ${r.status}`)
      const raw = await r.json()
      const articles = Array.isArray(raw) ? raw.slice(0, 25).map(normalize) : []
      const result = { articles, isLive: articles.length > 0, lastUpdated: new Date().toISOString() }
      set(cacheKey, result, MARKET_TTL)
      res.json(result)
    } catch (err) {
      res.status(502).json({ error: err.message, articles: [], isLive: false })
    }
  }
})

export default router
