import express from 'express'
import { get, set } from '../cache.js'

const router = express.Router()
const TWELVE = 'https://api.twelvedata.com'
const FINNHUB = 'https://finnhub.io/api/v1'

const RANGE_CONFIG = {
  '1D':  { interval: '5min',   outputsize: 78,  ttl: 5 * 60_000 },
  '5D':  { interval: '30min',  outputsize: 65,  ttl: 10 * 60_000 },
  '1M':  { interval: '1day',   outputsize: 22,  ttl: 30 * 60_000 },
  '6M':  { interval: '1day',   outputsize: 130, ttl: 60 * 60_000 },
  '1Y':  { interval: '1day',   outputsize: 252, ttl: 2 * 60 * 60_000 },
  '5Y':  { interval: '1week',  outputsize: 260, ttl: 24 * 60 * 60_000 },
  'All': { interval: '1month', outputsize: 120, ttl: 24 * 60 * 60_000 },
}

function formatDate(datetime, interval) {
  const d = new Date(datetime)
  if (interval.includes('min')) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }
  if (interval === '1day') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  if (interval === '1week' || interval === '1month') {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }
  return datetime
}

async function fetchTwelveData(symbol, range, apiKey) {
  const cfg = RANGE_CONFIG[range] || RANGE_CONFIG['1M']
  const url = `${TWELVE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${cfg.interval}&outputsize=${cfg.outputsize}&apikey=${apiKey}`
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!r.ok) throw new Error(`Twelve Data HTTP ${r.status}`)
  const json = await r.json()
  if (json.status === 'error' || !json.values || !json.values.length) {
    throw new Error(json.message || 'No data from Twelve Data')
  }
  const data = [...json.values].reverse().map(v => ({
    date: formatDate(v.datetime, cfg.interval),
    rawDate: v.datetime,
    price: parseFloat(v.close),
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    volume: parseInt(v.volume) || 0,
  }))
  return { data, source: 'Twelve Data', interval: cfg.interval }
}

async function fetchFinnhubCandles(symbol, range, apiKey) {
  const resMap = { '1D': '5', '5D': '30', '1M': 'D', '6M': 'D', '1Y': 'D', '5Y': 'W', 'All': 'M' }
  const resolution = resMap[range] || 'D'
  const now = Math.floor(Date.now() / 1000)
  const daysMap = { '1D': 1, '5D': 5, '1M': 30, '6M': 180, '1Y': 365, '5Y': 1825, 'All': 3650 }
  const from = now - (daysMap[range] || 30) * 86400
  const url = `${FINNHUB}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${now}&token=${apiKey}`
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!r.ok) throw new Error(`Finnhub candles HTTP ${r.status}`)
  const d = await r.json()
  if (d.s !== 'ok' || !d.c?.length) throw new Error('No candle data from Finnhub')

  const data = d.t.map((ts, i) => {
    const date = new Date(ts * 1000)
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      rawDate: date.toISOString(),
      price: d.c[i],
      open: d.o[i],
      high: d.h[i],
      low: d.l[i],
      volume: d.v[i] || 0,
    }
  })
  return { data, source: 'Finnhub', interval: resolution }
}

router.get('/', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase().trim()
  const range = req.query.range || '1M'
  if (!symbol) return res.status(400).json({ error: 'symbol required' })

  const cacheKey = `chart:${symbol}:${range}`
  const cached = get(cacheKey)
  if (cached) return res.json(cached)

  const tdKey = process.env.TWELVE_DATA_API_KEY
  const fhKey = process.env.FINNHUB_API_KEY
  const cfg = RANGE_CONFIG[range] || RANGE_CONFIG['1M']

  let result = null
  let lastError = null

  if (tdKey) {
    try {
      const { data, source, interval } = await fetchTwelveData(symbol, range, tdKey)
      result = { symbol, range, data, source, isLive: true, lastUpdated: new Date().toISOString() }
    } catch (e) { lastError = e.message }
  }

  if (!result && fhKey) {
    try {
      const { data, source } = await fetchFinnhubCandles(symbol, range, fhKey)
      result = { symbol, range, data, source, isLive: true, lastUpdated: new Date().toISOString() }
    } catch (e) { lastError = e.message }
  }

  if (!result) {
    return res.status(502).json({ error: lastError || 'No chart API configured', symbol, range, status: 'unavailable' })
  }

  set(cacheKey, result, cfg.ttl)
  res.json(result)
})

export default router
