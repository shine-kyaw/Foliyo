import express from 'express'
import { get, set } from '../cache.js'

const router = express.Router()
const TWELVE = 'https://api.twelvedata.com'
const TTL = 5 * 60_000  // 5 min — Twelve Data free tier is 8 req/min, 800/day

/* Asset lists trimmed to fit free tier (8 credits/min). Each batched
 * symbol counts as 1 credit. Paywalled symbols (XAG silver, BRENT,
 * COPPER) are excluded — they require Grow/Venture plan. */
const COMMODITY_ASSETS = [
  { symbol: 'XAU/USD',  name: 'Gold',          unit: 'USD/oz',    category: 'Metals' },
  { symbol: 'WTI/USD',  name: 'WTI Crude Oil', unit: 'USD/bbl',   category: 'Energy' },
  { symbol: 'NGAS/USD', name: 'Natural Gas',   unit: 'USD/MMBtu', category: 'Energy' },
  { symbol: 'WHEAT/USD',name: 'Wheat',         unit: 'USc/bu',    category: 'Grains' },
]

const CRYPTO_ASSETS = [
  { symbol: 'BTC/USD',  name: 'Bitcoin',   icon: '₿' },
  { symbol: 'ETH/USD',  name: 'Ethereum',  icon: 'Ξ' },
  { symbol: 'SOL/USD',  name: 'Solana',    icon: '◎' },
  { symbol: 'DOGE/USD', name: 'Dogecoin',  icon: 'D' },
]

const FOREX_ASSETS = [
  { symbol: 'EUR/USD', name: 'Euro / US Dollar'           },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar'  },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen'   },
  { symbol: 'AUD/USD', name: 'AUD / US Dollar'            },
]

async function fetchTwelveQuotes(symbols, apiKey) {
  const joined = symbols.map(a => a.symbol).join(',')
  const url = `${TWELVE}/quote?symbol=${encodeURIComponent(joined)}&apikey=${apiKey}`
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!r.ok) throw new Error(`Twelve Data HTTP ${r.status}`)
  const raw = await r.json()

  // Rate-limit / global error response: {code:429|404, status:'error', message:'…'}
  if (raw?.status === 'error') {
    throw new Error(`Twelve Data: ${raw.message || 'error'}`)
  }

  // Single symbol → object directly; multi-symbol → object keyed by symbol
  const isMulti = symbols.length > 1
  const map = isMulti ? raw : { [symbols[0].symbol]: raw }

  return symbols.map(asset => {
    const q = map[asset.symbol]
    // Per-symbol error inside a batch (e.g. paywalled symbol)
    if (!q || q.status === 'error' || q.code || !q.close) {
      return { ...asset, price: null, change: null, changePct: null, status: 'unavailable', source: 'Twelve Data' }
    }
    return {
      ...asset,
      price: parseFloat(q.close),
      change: parseFloat(q.change),
      changePct: parseFloat(q.percent_change),
      high: parseFloat(q.high),
      low: parseFloat(q.low),
      open: parseFloat(q.open),
      prevClose: parseFloat(q.previous_close),
      isMarketOpen: q.is_market_open,
      status: q.is_market_open ? 'live' : 'latest_available',
      source: 'Twelve Data',
      lastUpdated: new Date().toISOString(),
    }
  })
}

// GET /api/commodities
router.get('/commodities', async (req, res) => {
  const cacheKey = 'global:commodities'
  const cached = get(cacheKey)
  if (cached) return res.json(cached)
  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) return res.json({ assets: COMMODITY_ASSETS.map(a => ({ ...a, status: 'unavailable' })), isLive: false })
  try {
    const assets = await fetchTwelveQuotes(COMMODITY_ASSETS, apiKey)
    const result = { assets, isLive: true, lastUpdated: new Date().toISOString() }
    set(cacheKey, result, TTL)
    res.json(result)
  } catch (err) {
    res.json({ assets: COMMODITY_ASSETS.map(a => ({ ...a, status: 'unavailable' })), isLive: false, error: err.message })
  }
})

// GET /api/crypto
router.get('/crypto', async (req, res) => {
  const cacheKey = 'global:crypto'
  const cached = get(cacheKey)
  if (cached) return res.json(cached)
  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) return res.json({ assets: CRYPTO_ASSETS.map(a => ({ ...a, status: 'unavailable' })), isLive: false })
  try {
    const assets = await fetchTwelveQuotes(CRYPTO_ASSETS, apiKey)
    const result = { assets, isLive: true, lastUpdated: new Date().toISOString() }
    set(cacheKey, result, TTL)
    res.json(result)
  } catch (err) {
    res.json({ assets: CRYPTO_ASSETS.map(a => ({ ...a, status: 'unavailable' })), isLive: false, error: err.message })
  }
})

// GET /api/forex
router.get('/forex', async (req, res) => {
  const cacheKey = 'global:forex'
  const cached = get(cacheKey)
  if (cached) return res.json(cached)
  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) return res.json({ assets: FOREX_ASSETS.map(a => ({ ...a, status: 'unavailable' })), isLive: false })
  try {
    const assets = await fetchTwelveQuotes(FOREX_ASSETS, apiKey)
    const result = { assets, isLive: true, lastUpdated: new Date().toISOString() }
    set(cacheKey, result, TTL)
    res.json(result)
  } catch (err) {
    res.json({ assets: FOREX_ASSETS.map(a => ({ ...a, status: 'unavailable' })), isLive: false, error: err.message })
  }
})

export default router
