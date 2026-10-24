import express from 'express'
import { get, set } from '../cache.js'

/**
 * Yangon Stock Exchange (YSX) — real daily price history.
 *
 * Source: the official site, https://ysx-mm.com. Every listed company has a
 * server-rendered profile page that ends with a "Historical price" table of
 * EVERY trading day since listing (date, open, high, low, close, volume,
 * value, shares, market cap). No auth, no JS challenge, robots.txt allows it.
 * The pages are big (0.3–3 MB, ~8 s for FMI) and not gzipped, so we cache the
 * parsed series per code and de-duplicate concurrent fetches.
 *
 * The exchange publishes the day's close after the session (~13:00 MMT), so
 * the newest row is normally yesterday's or today's close.
 *
 *   GET /api/ysx/history?code=FMI&days=30
 *   GET /api/ysx/quotes
 *   GET /api/ysx/companies
 */

const router = express.Router()
const BASE = 'https://ysx-mm.com'
const UA   = 'Mozilla/5.0 (compatible; FoliyoBot/1.0; +https://foliyo-delta.vercel.app)'

const SERIES_TTL = 30 * 60_000        // fresh window
const STALE_TTL  = 24 * 60 * 60_000   // last-known-good, used only if YSX is down
const QUOTES_TTL = 10 * 60_000

// code → YSX issue code + page. MB = Main Board (listed), PLB = Pre-Listing Board (registered, not listed).
const COMPANIES = {
  FMI:   { issue: '00001', board: 'MB',  page: '/main-board/listing/company/lc00001/' },
  MTSH:  { issue: '00002', board: 'MB',  page: '/main-board/listing/company/lc00002/' },
  MCB:   { issue: '00003', board: 'MB',  page: '/main-board/listing/company/lc00003/' },
  FPB:   { issue: '00004', board: 'MB',  page: '/main-board/listing/company/lc00004/' },
  TMH:   { issue: '00005', board: 'MB',  page: '/main-board/listing/company/lc00005/' },
  EFR:   { issue: '00006', board: 'MB',  page: '/main-board/listing/company/lc00006/' },
  AMATA: { issue: '00007', board: 'MB',  page: '/main-board/listing/company/lc00007/' },
  MAEX:  { issue: '00008', board: 'MB',  page: '/main-board/listing/company/lc00008/' },
  MADPL: { issue: '00009', board: 'PLB', page: '/pre-listing-board/registered-companies/company-list/lc00009/' },
  ASPGB: { issue: '00010', board: 'PLB', page: '/pre-listing-board/registered-companies/company-list/lc00010/' },
}

const QUOTE_PAGES = [
  { board: 'MB',  path: '/main-board/mktdata/stocktradingdata/' },
  { board: 'PLB', path: '/pre-listing-board/marketdata/stock-trading-data/' },
]

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 }

const num = (s) => {
  const n = Number(String(s).replace(/[,\s+]/g, '').replace('%', ''))
  return Number.isFinite(n) ? n : null
}

const cells = (html) =>
  [...html.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) =>
    m[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim())

const isoDate = (s) => {
  const m = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(s)
  if (!m || !MONTHS[m[2]]) return null
  return `${m[3]}-${String(MONTHS[m[2]]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`
}

async function fetchHtml(path, attempt = 1) {
  try {
    const r = await fetch(BASE + path, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(45_000),
    })
    if (!r.ok) throw new Error(`YSX HTTP ${r.status} for ${path}`)
    return await r.text()
  } catch (e) {
    // ysx-mm.com occasionally drops a connection when hit in parallel; one retry is enough.
    if (attempt < 2) { await new Promise((ok) => setTimeout(ok, 1500)); return fetchHtml(path, attempt + 1) }
    throw new Error(`YSX request failed (${e.cause?.code || e.message})`)
  }
}

/**
 * The page's table has malformed rows (no <tr> after the first), so we walk the
 * flat list of <td> cells in groups of 9 and require the first cell of each
 * group to be a date; anything else means the layout changed and we fail loudly.
 */
function parseHistory(html) {
  const start = html.indexOf('id="stchart"')
  if (start < 0) throw new Error('YSX page layout changed: historical price table not found')
  const table = html.slice(start, html.indexOf('</table>', start))
  const c = cells(table)
  const rows = []
  for (let i = 0; i + 9 <= c.length; i += 9) {
    const date = isoDate(c[i])
    if (!date) throw new Error(`YSX page layout changed: unexpected cell "${c[i]}"`)
    const [open, high, low, close, volume, value] = c.slice(i + 1, i + 7).map(num)
    if (close == null) continue
    rows.push({
      date,
      open, high, low, close,
      volume: volume ?? null,
      value: value ?? null,
      // YSX repeats the previous close on days with zero trades. Flag them so the UI can tell.
      traded: (volume ?? 0) > 0,
    })
  }
  if (!rows.length) throw new Error('YSX returned an empty price table')
  return rows.reverse() // site is newest-first → oldest→newest
}

const inflight = new Map()

async function getSeries(code) {
  const key = `ysx:series:${code}`
  const hit = get(key)
  if (hit) return hit
  if (inflight.has(code)) return inflight.get(code)

  const company = COMPANIES[code]
  const p = (async () => {
    try {
      const rows = parseHistory(await fetchHtml(company.page))
      const out = { rows, fetchedAt: new Date().toISOString(), stale: false }
      set(key, out, SERIES_TTL)
      set(`${key}:stale`, out, STALE_TTL)
      return out
    } catch (e) {
      const stale = get(`${key}:stale`)
      if (stale) return { ...stale, stale: true }
      throw e
    } finally {
      inflight.delete(code)
    }
  })()
  inflight.set(code, p)
  return p
}

router.get('/history', async (req, res) => {
  const code = String(req.query.code || '').toUpperCase().trim()
  const company = COMPANIES[code]
  if (!company) {
    return res.status(404).json({ error: `Unknown YSX code "${code}"`, source: 'YSX', codes: Object.keys(COMPANIES) })
  }
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 6000)
  const sourceUrl = BASE + company.page

  try {
    const { rows, fetchedAt, stale } = await getSeries(code)
    // "days" = calendar days back from the newest published trading day.
    const last = new Date(rows[rows.length - 1].date + 'T00:00:00Z')
    const cutoff = new Date(last.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10)
    const data = rows.filter((r) => r.date >= cutoff)
    res.json({
      code,
      issueCode: company.issue,
      board: company.board,
      source: 'Yangon Stock Exchange (ysx-mm.com)',
      sourceUrl,
      currency: 'MMK',
      days,
      asOf: rows[rows.length - 1].date,
      stale,
      data,
      fetchedAt,
    })
  } catch (e) {
    res.status(502).json({ error: e.message, source: 'Yangon Stock Exchange (ysx-mm.com)', sourceUrl })
  }
})

// Latest session for every listing, from YSX's "Stock trading data" pages (~90 KB each).
async function getQuotes() {
  const hit = get('ysx:quotes')
  if (hit) return hit
  const quotes = []
  let asOf = null
  for (const { board, path } of QUOTE_PAGES) {
    const html = await fetchHtml(path)
    const d = /As of\s+(\d{1,2})(?:st|nd|rd|th)\s+([A-Z][a-z]{2})[a-z]*\.?\s+(\d{4})/.exec(html.replace(/<[^>]*>/g, ' '))
    const date = d && MONTHS[d[2]] ? `${d[3]}-${String(MONTHS[d[2]]).padStart(2, '0')}-${d[1].padStart(2, '0')}` : null
    if (board === 'MB') asOf = date
    const start = html.indexOf('id="stocktrading"')
    if (start < 0) throw new Error('YSX page layout changed: stock trading table not found')
    const c = cells(html.slice(start, html.indexOf('</table>', start)))
    const byIssue = Object.fromEntries(Object.entries(COMPANIES).map(([k, v]) => [v.issue, k]))
    for (let i = 0; i + 12 <= c.length; i += 12) { // 12 columns per row on both boards
      const code = byIssue[c[i + 1]]
      if (!code) continue
      const close = num(c[i + 2])
      if (close == null) continue
      quotes.push({
        code, board, date,
        close,
        change: num(c[i + 3]),
        changePct: num(c[i + 4]),
        open: num(c[i + 5]), high: num(c[i + 6]), low: num(c[i + 7]),
        volume: num(c[i + 8]),
        value: num(c[i + 9]),
        traded: (num(c[i + 8]) ?? 0) > 0,
      })
    }
  }
  if (!quotes.length) throw new Error('YSX returned no quotes')
  const out = { source: 'Yangon Stock Exchange (ysx-mm.com)', sourceUrl: BASE + QUOTE_PAGES[0].path, currency: 'MMK', asOf, data: quotes, fetchedAt: new Date().toISOString() }
  set('ysx:quotes', out, QUOTES_TTL)
  return out
}

router.get('/quotes', async (_req, res) => {
  try {
    res.json(await getQuotes())
  } catch (e) {
    res.status(502).json({ error: e.message, source: 'Yangon Stock Exchange (ysx-mm.com)' })
  }
})

router.get('/companies', (_req, res) => {
  res.json({
    source: 'Yangon Stock Exchange (ysx-mm.com)',
    data: Object.entries(COMPANIES).map(([code, v]) => ({ code, issueCode: v.issue, board: v.board, sourceUrl: BASE + v.page })),
  })
})

export default router
