import express from 'express'
import { get, set } from '../cache.js'

const router = express.Router()
const FINNHUB = 'https://finnhub.io/api/v1'
const AV = 'https://www.alphavantage.co/query'
const TTL = 24 * 60 * 60_000  // 24 h

/* Market cap in USD, from millions → "$5.12T" / "$842.3B" / "$410.0M" */
export function fmtCap(millions) {
  if (!Number.isFinite(millions) || millions <= 0) return null
  if (millions >= 1e6) return `$${(millions / 1e6).toFixed(2)}T`
  if (millions >= 1e3) return `$${(millions / 1e3).toFixed(1)}B`
  return `$${millions.toFixed(1)}M`
}

async function fetchFinnhub(symbol, apiKey) {
  const [metricRes, profileRes] = await Promise.allSettled([
    fetch(`${FINNHUB}/stock/metric?symbol=${symbol}&metric=all&token=${apiKey}`, { signal: AbortSignal.timeout(8000) }),
    fetch(`${FINNHUB}/stock/profile2?symbol=${symbol}&token=${apiKey}`, { signal: AbortSignal.timeout(8000) }),
  ])

  const metric  = metricRes.status  === 'fulfilled' && metricRes.value.ok  ? await metricRes.value.json()  : {}
  const profile = profileRes.status === 'fulfilled' && profileRes.value.ok ? await profileRes.value.json() : {}
  const m = metric.metric || {}

  return {
    pe: m.peBasicExclExtraTTM ?? m.peAnnual ?? null,
    pb: m.pbAnnual ?? null,
    ps: m.psAnnual ?? null,
    roe: m.roeRfy ?? null,
    roa: m.roaRfy ?? null,
    beta: m['52WeekPriceReturnBeta'] ?? m.beta ?? null,
    eps: m.epsBasicExclExtraAnnual ?? null,
    dividendYield: m.dividendYieldIndicatedAnnual ?? null,
    week52High: m['52WeekHigh'] ?? null,
    week52Low: m['52WeekLow'] ?? null,
    mktCap: fmtCap(profile.marketCapitalization),
    mktCapUsdM: profile.marketCapitalization ?? null,
    avgVolume10d: m['10DayAverageTradingVolume'] != null ? m['10DayAverageTradingVolume'] * 1e6 : null,
    sharesOutstanding: profile.shareOutstanding ?? null,
    name: profile.name ?? null,
    exchange: profile.exchange ?? null,
    industry: profile.finnhubIndustry ?? null,
    country: profile.country ?? null,
    website: profile.weburl ?? null,
    logo: profile.logo ?? null,
    ipo: profile.ipo ?? null,
    description: null,
    source: 'Finnhub',
  }
}

async function fetchAlphaVantage(symbol, apiKey) {
  const url = `${AV}?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!r.ok) throw new Error(`Alpha Vantage HTTP ${r.status}`)
  const d = await r.json()
  if (d.Note || d.Information || !d.Symbol) throw new Error('Alpha Vantage rate limit or no data')

  return {
    pe: parseFloat(d.PERatio) || null,
    pb: parseFloat(d.PriceToBookRatio) || null,
    ps: parseFloat(d.PriceToSalesRatioTTM) || null,
    roe: parseFloat(d.ReturnOnEquityTTM) ? parseFloat(d.ReturnOnEquityTTM) * 100 : null,
    roa: parseFloat(d.ReturnOnAssetsTTM) ? parseFloat(d.ReturnOnAssetsTTM) * 100 : null,
    beta: parseFloat(d.Beta) || null,
    eps: parseFloat(d.EPS) || null,
    dividendYield: parseFloat(d.DividendYield) ? parseFloat(d.DividendYield) * 100 : null,
    week52High: parseFloat(d['52WeekHigh']) || null,
    week52Low: parseFloat(d['52WeekLow']) || null,
    mktCap: fmtCap(parseInt(d.MarketCapitalization) / 1e6),
    sharesOutstanding: parseInt(d.SharesOutstanding) || null,
    name: d.Name ?? null,
    exchange: d.Exchange ?? null,
    industry: d.Industry ?? null,
    country: d.Country ?? null,
    website: d.OfficialSite ?? null,
    logo: null,
    ipo: d.IPODate ?? null,
    description: d.Description ?? null,
    source: 'Alpha Vantage',
  }
}

router.get('/', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase().trim()
  if (!symbol) return res.status(400).json({ error: 'symbol required' })

  const cacheKey = `fundamentals:${symbol}`
  const cached = get(cacheKey)
  if (cached) return res.json(cached)

  const fhKey = process.env.FINNHUB_API_KEY
  const avKey = process.env.ALPHA_VANTAGE_API_KEY

  let data = null
  let lastError = null

  if (fhKey) {
    try {
      data = await fetchFinnhub(symbol, fhKey)
    } catch (e) { lastError = e.message }
  }

  // Use Alpha Vantage to fill gaps (especially description)
  if (avKey && (!data?.description || !data?.pe)) {
    try {
      const avData = await fetchAlphaVantage(symbol, avKey)
      if (data) {
        // merge: prefer Finnhub numbers, use AV for description/gaps
        data.description = data.description || avData.description
        data.pe          = data.pe          ?? avData.pe
        data.pb          = data.pb          ?? avData.pb
        data.beta        = data.beta        ?? avData.beta
        data.eps         = data.eps         ?? avData.eps
        data.dividendYield = data.dividendYield ?? avData.dividendYield
        data.week52High  = data.week52High  ?? avData.week52High
        data.week52Low   = data.week52Low   ?? avData.week52Low
        data.source      = 'Finnhub + Alpha Vantage'
      } else {
        data = avData
      }
    } catch (e) { lastError = e.message }
  }

  if (!data) {
    return res.status(502).json({ error: lastError || 'No fundamentals API configured', symbol, status: 'unavailable' })
  }

  const result = { ...data, symbol, isLive: true, lastUpdated: new Date().toISOString() }
  set(cacheKey, result, TTL)
  res.json(result)
})

/* ── Batch: /api/fundamentals/batch?symbols=AAPL,MSFT,… ──────────
   Answers at once with what's cached and fills the rest in the
   background, one symbol every ~2.5 s, so tables can ask again.   */
const queue = new Set()
let draining = false
async function drain() {
  if (draining) return
  draining = true
  const apiKey = process.env.FINNHUB_API_KEY
  try {
    while (queue.size && apiKey) {
      const symbol = queue.values().next().value
      queue.delete(symbol)
      if (get(`fundamentals:${symbol}`)) continue
      try {
        const data = await fetchFinnhub(symbol, apiKey)
        if (data.name || data.pe != null || data.mktCap) {
          set(`fundamentals:${symbol}`, { ...data, symbol, isLive: true, lastUpdated: new Date().toISOString() }, TTL)
        }
      } catch { /* try again on a later request */ }
      await new Promise(r => setTimeout(r, 2500))
    }
  } finally { draining = false }
}

router.get('/batch', (req, res) => {
  const symbols = String(req.query.symbols || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 80)
  const data = {}, pending = []
  for (const s of symbols) {
    const c = get(`fundamentals:${s}`)
    if (c) data[s] = { mktCap: c.mktCap, mktCapUsdM: c.mktCapUsdM ?? null, pe: c.pe, avgVolume10d: c.avgVolume10d ?? null, week52High: c.week52High, week52Low: c.week52Low, dividendYield: c.dividendYield }
    else { pending.push(s); queue.add(s) }
  }
  drain()
  res.json({ data, pending, source: 'Finnhub', lastUpdated: new Date().toISOString() })
})

export default router
