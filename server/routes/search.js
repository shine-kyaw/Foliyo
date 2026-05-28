import express from 'express'
import { get, set } from '../cache.js'

const router = express.Router()
const FINNHUB = 'https://finnhub.io/api/v1'
const TTL = 5 * 60_000

// YSX stocks that Finnhub doesn't cover — supplement search results
const YSX_STOCKS = [
  { symbol: 'FMI',   name: 'First Myanmar Investment Public Company Limited',  type: 'YSX', exchange: 'YSX' },
  { symbol: 'MTSH',  name: 'Myanmar Thilawa SEZ Holdings Public Limited',      type: 'YSX', exchange: 'YSX' },
  { symbol: 'MCB',   name: 'Myanmar Citizens Bank Ltd',                        type: 'YSX', exchange: 'YSX' },
  { symbol: 'FPB',   name: 'First Private Bank Limited',                       type: 'YSX', exchange: 'YSX' },
  { symbol: 'TMH',   name: 'TMH Telecom Public Co. Ltd.',                      type: 'YSX', exchange: 'YSX' },
  { symbol: 'EFR',   name: 'Ever Flow River Group Public Co., Ltd.',           type: 'YSX', exchange: 'YSX' },
  { symbol: 'AMATA', name: 'Amata Holding Public Company Limited',             type: 'YSX', exchange: 'YSX' },
  { symbol: 'MAEX',  name: 'Myanmar Agro Exchange Public Company Limited',     type: 'YSX', exchange: 'YSX' },
]

router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim()
  if (!q || q.length < 1) return res.status(400).json({ error: 'q required', results: [] })

  const cacheKey = `search:${q.toLowerCase()}`
  const cached = get(cacheKey)
  if (cached) return res.json(cached)

  const apiKey = process.env.FINNHUB_API_KEY
  let results = []

  if (apiKey) {
    try {
      const r = await fetch(`${FINNHUB}/search?q=${encodeURIComponent(q)}&token=${apiKey}`, {
        signal: AbortSignal.timeout(6000),
      })
      if (r.ok) {
        const d = await r.json()
        if (Array.isArray(d.result)) {
          results = d.result
            .filter(item => item.type === 'Common Stock' || item.type === 'ETP' || item.type === 'DR')
            .slice(0, 8)
            .map(item => ({
              symbol: item.displaySymbol || item.symbol,
              name: item.description,
              type: item.type,
              exchange: item.primaryExchange ?? '',
            }))
        }
      }
    } catch { /* fall through */ }
  }

  // Supplement with YSX matches
  const ql = q.toLowerCase()
  const ysxMatches = YSX_STOCKS.filter(
    s => s.symbol.toLowerCase().includes(ql) || s.name.toLowerCase().includes(ql)
  )
  results = [...results, ...ysxMatches].slice(0, 10)

  const result = { results, query: q, lastUpdated: new Date().toISOString() }
  set(cacheKey, result, TTL)
  res.json(result)
})

export default router
