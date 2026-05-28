import express from 'express'
import { get, set } from '../cache.js'

const router = express.Router()
const FINNHUB = 'https://finnhub.io/api/v1'
const TTL = 45_000

router.get('/', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase().trim()
  if (!symbol) return res.status(400).json({ error: 'symbol required' })

  const cacheKey = `quote:${symbol}`
  const cached = get(cacheKey)
  if (cached) return res.json(cached)

  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'FINNHUB_API_KEY not configured', source: 'none', status: 'unavailable' })
  }

  try {
    const r = await fetch(`${FINNHUB}/quote?symbol=${symbol}&token=${apiKey}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) throw new Error(`Finnhub HTTP ${r.status}`)
    const d = await r.json()
    if (!d.c || d.c === 0) throw new Error('Empty quote — symbol may not exist on Finnhub')

    const result = {
      symbol,
      price: d.c,
      change: d.d ?? 0,
      changePct: d.dp ?? 0,
      high: d.h,
      low: d.l,
      open: d.o,
      prevClose: d.pc,
      timestamp: d.t,
      source: 'Finnhub',
      status: 'live',
      lastUpdated: new Date().toISOString(),
    }
    set(cacheKey, result, TTL)
    res.json(result)
  } catch (err) {
    res.status(502).json({ error: err.message, source: 'finnhub', status: 'error' })
  }
})

/* ── Batch endpoint: /api/quotes?symbols=AAPL,TSLA,MSFT ──────── */
async function fetchOneQuote(symbol, apiKey) {
  const cacheKey = `quote:${symbol}`
  const cached = get(cacheKey)
  if (cached) return cached
  try {
    const r = await fetch(`${FINNHUB}/quote?symbol=${symbol}&token=${apiKey}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) throw new Error(`Finnhub HTTP ${r.status}`)
    const d = await r.json()
    if (!d.c || d.c === 0) return null
    const result = {
      symbol,
      price: d.c, change: d.d ?? 0, changePct: d.dp ?? 0,
      high: d.h, low: d.l, open: d.o, prevClose: d.pc, timestamp: d.t,
      source: 'Finnhub', status: 'live', lastUpdated: new Date().toISOString(),
    }
    set(cacheKey, result, TTL)
    return result
  } catch {
    return null
  }
}

/* Fetch symbols in chunks to stay under Finnhub's 60-req/min free-tier limit.
 * Cached hits are free (instant), so real-world chunk count is usually 1-2.
 * Chunk size 20, 100ms pause = fast first load, safe rate ceiling. */
async function fetchAllQuotes(symbols, apiKey) {
  const quotes = {}
  const CHUNK = 20
  const PAUSE = 100
  for (let i = 0; i < symbols.length; i += CHUNK) {
    const slice = symbols.slice(i, i + CHUNK)
    const results = await Promise.all(slice.map(s => fetchOneQuote(s, apiKey)))
    results.forEach((q, idx) => { if (q) quotes[slice[idx]] = q })
    if (i + CHUNK < symbols.length) await new Promise(r => setTimeout(r, PAUSE))
  }
  return quotes
}

/* ── Symbols to warm-cache at server startup ─────────────────── */
const WARMUP_SYMBOLS = [
  'AAPL','MSFT','NVDA','GOOGL','TSLA','AMZN','META','NFLX',
  'AMD','ORCL','JPM','V','UNH','LLY','XOM','WMT','JNJ','PG',
  'MA','HD','BRKB','CVX','MRK','ABBV','COST',
]

export async function warmCache(apiKey) {
  if (!apiKey) return
  try {
    await fetchAllQuotes(WARMUP_SYMBOLS, apiKey)
    console.log(`   Cache warmed: ${WARMUP_SYMBOLS.length} symbols ready`)
  } catch (e) {
    console.warn('   Cache warm-up skipped:', e.message)
  }
}

export async function batchHandler(req, res) {
  const symbols = (req.query.symbols || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 50)
  if (!symbols.length) return res.status(400).json({ error: 'symbols required' })
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'FINNHUB_API_KEY not configured' })

  try {
    const quotes = await fetchAllQuotes(symbols, apiKey)
    res.json({ quotes, count: Object.keys(quotes).length, lastUpdated: new Date().toISOString() })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}

export default router
