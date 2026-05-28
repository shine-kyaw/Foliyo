import express from 'express'
import { get, set } from '../cache.js'

const router = express.Router()

/* ── Popular symbols with display names ────────────────────── */
const TRENDING_SYMBOLS = [
  { symbol:'AAPL',  name:'Apple Inc.'             },
  { symbol:'TSLA',  name:'Tesla, Inc.'             },
  { symbol:'NVDA',  name:'NVIDIA Corporation'      },
  { symbol:'MSFT',  name:'Microsoft Corporation'   },
  { symbol:'GOOGL', name:'Alphabet Inc.'           },
  { symbol:'AMZN',  name:'Amazon.com, Inc.'        },
  { symbol:'META',  name:'Meta Platforms, Inc.'    },
  { symbol:'NFLX',  name:'Netflix, Inc.'           },
  { symbol:'AMD',   name:'Advanced Micro Devices'  },
  { symbol:'ORCL',  name:'Oracle Corporation'      },
]

/* ── Market indices ─────────────────────────────────────────── */
/* Finnhub & Twelve Data free tiers don't quote raw indices, so we
 * use Yahoo Finance's public chart API (no key required) for the
 * actual index values (S&P 500 ~5,200, NASDAQ ~16,500, etc.). */
const INDICES = [
  { symbol:'^GSPC', name:'S&P 500'   },
  { symbol:'^IXIC', name:'NASDAQ'    },
  { symbol:'^DJI',  name:'Dow Jones' },
]

async function yahooQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
  const r = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': 'Mozilla/5.0 Foliyo/1.0' },
  })
  if (!r.ok) throw new Error(`Yahoo ${r.status}`)
  const j = await r.json()
  const meta = j?.chart?.result?.[0]?.meta
  if (!meta?.regularMarketPrice) throw new Error('no price in Yahoo response')
  const price = meta.regularMarketPrice
  const prev  = meta.previousClose ?? meta.chartPreviousClose
  const change = price - prev
  const changePct = prev ? (change / prev) * 100 : 0
  return { price, change, changePct, prevClose: prev, high: meta.regularMarketDayHigh, low: meta.regularMarketDayLow }
}

async function finnhubQuote(symbol, apiKey) {
  const r = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!r.ok) throw new Error(`Finnhub ${r.status}`)
  return r.json()
}

/* ── GET /api/stocks/trending ────────────────────────────────── */
router.get('/trending', async (req, res) => {
  const cacheKey = 'stocks:trending'
  const cached = get(cacheKey)
  if (cached) return res.json(cached)

  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'FINNHUB_API_KEY not configured' })

  try {
    const results = await Promise.allSettled(
      TRENDING_SYMBOLS.map(async ({ symbol, name }) => {
        const quote = await finnhubQuote(symbol, apiKey)
        return { symbol, name, quote: { ...quote, symbol } }
      })
    )
    const data = results
      .filter(r => r.status === 'fulfilled' && r.value?.quote?.c)
      .map(r => r.value)

    if (data.length) set(cacheKey, data, 30_000)
    res.json(data)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

/* ── GET /api/stocks/indices ─────────────────────────────────── */
router.get('/indices', async (req, res) => {
  const cacheKey = 'stocks:indices'
  const cached = get(cacheKey)
  if (cached) return res.json(cached)

  try {
    const results = await Promise.allSettled(
      INDICES.map(async ({ symbol, name }) => {
        const q = await yahooQuote(symbol)
        return { symbol, name, ...q }
      })
    )
    const data = results
      .filter(r => r.status === 'fulfilled' && r.value?.price)
      .map(r => r.value)

    if (data.length) set(cacheKey, data, 60_000)  // 1 min cache
    res.json(data)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

export default router
