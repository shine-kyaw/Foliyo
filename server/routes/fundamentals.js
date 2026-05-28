import express from 'express'
import { get, set } from '../cache.js'

const router = express.Router()
const FINNHUB = 'https://finnhub.io/api/v1'
const AV = 'https://www.alphavantage.co/query'
const TTL = 24 * 60 * 60_000  // 24 h

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
    mktCap: profile.marketCapitalization ? `$${(profile.marketCapitalization / 1000).toFixed(1)}B` : null,
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
    mktCap: d.MarketCapitalization ? `$${(parseInt(d.MarketCapitalization) / 1e9).toFixed(1)}B` : null,
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

export default router
