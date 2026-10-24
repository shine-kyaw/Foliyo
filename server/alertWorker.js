import { dbEnabled, query } from './db.js'
import { fetchAllQuotes } from './routes/quote.js'
import { mailEnabled, sendAlertEmail } from './mailer.js'
import { get, set } from './cache.js'
import { evaluateAlert, needsVerdict, needsNews } from '../src/utils/alertRules.js'
import { generateAIAnalysis } from '../src/utils/aiAnalysis.js'
import { stocks } from '../src/data/mockData.js'

/* ── Background alert checker ──────────────────────────────────
   Every minute: load active alerts, fetch what they need (quotes,
   outlook, latest headline), evaluate with the shared rules, mark
   hits as triggered and email the owner when they asked for it.
   Runs only while the API process is awake.                      */
const FINNHUB = 'https://finnhub.io/api/v1'
const INTERVAL = 60_000
const STATIC = Object.fromEntries(stocks.map(s => [s.symbol, s]))

async function latestHeadline(symbol, apiKey) {
  const key = `alert-news:${symbol}`
  const cached = get(key)
  if (cached !== null) return cached
  const day = d => d.toISOString().slice(0, 10)
  const now = new Date(), from = new Date(now - 3 * 86_400_000)
  try {
    const r = await fetch(`${FINNHUB}/company-news?symbol=${symbol}&from=${day(from)}&to=${day(now)}&token=${apiKey}`, { signal: AbortSignal.timeout(8000) })
    const list = r.ok ? await r.json() : []
    const top = Array.isArray(list) ? list.sort((a, b) => (b.datetime || 0) - (a.datetime || 0))[0] : null
    const result = top ? { id: top.id ?? top.datetime, title: top.headline } : { id: null }
    set(key, result, 5 * 60_000)
    return result
  } catch { return { id: null } }
}

let running = false

export async function checkAlerts() {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!dbEnabled || !apiKey || running) return
  running = true
  try {
    const { rows } = await query(
      `SELECT a.*, u.email, u.name AS user_name FROM alerts a JOIN users u ON u.id = a.user_id WHERE a.status = 'active'`)
    if (!rows.length) return

    const symbols = [...new Set(rows.map(r => r.symbol))]
    const quotes = await fetchAllQuotes(symbols, apiKey)
    const news = {}
    for (const sym of new Set(rows.filter(r => needsNews(r.type)).map(r => r.symbol))) {
      news[sym] = await latestHeadline(sym, apiKey)
    }

    for (const a of rows) {
      const q = quotes[a.symbol]
      const ctx = {
        price: q?.price ?? null,
        changePct: q?.changePct ?? null,
        verdict: needsVerdict(a.type) && q
          ? generateAIAnalysis({ ...(STATIC[a.symbol] || { symbol: a.symbol, name: a.name }), price: q.price, changePct: q.changePct })?.verdict
          : null,
        latestNewsId: news[a.symbol]?.id ?? null,
        latestNewsTitle: news[a.symbol]?.title,
      }
      const alert = { type: a.type, targetValue: a.target_value, targetSentiment: a.target_sentiment, baseline: a.baseline }
      const out = evaluateAlert(alert, ctx)

      if (!out.triggered) {
        await query('UPDATE alerts SET last_price = COALESCE($1, last_price), baseline = $2 WHERE id = $3',
          [ctx.price, JSON.stringify(out.baseline), a.id])
        continue
      }

      // Claim the trigger atomically so a second process can't double-send
      const claimed = await query(
        `UPDATE alerts SET status = 'triggered', triggered_at = now(), trigger_note = $1, trigger_price = $2,
           last_price = COALESCE($2, last_price), baseline = $3
         WHERE id = $4 AND status = 'active' RETURNING id`,
        [out.message, ctx.price, JSON.stringify(out.baseline), a.id])
      if (!claimed.rowCount) continue

      if (mailEnabled && ['email', 'both'].includes(a.notif_method)) {
        try {
          await sendAlertEmail({ to: a.email, name: a.user_name, symbol: a.symbol, message: out.message })
          await query('UPDATE alerts SET emailed_at = now() WHERE id = $1', [a.id])
        } catch (e) {
          console.warn(`Alert email to ${a.email} failed:`, e.message)
        }
      }
    }
  } catch (e) {
    console.warn('Alert check failed:', e.message)
  } finally {
    running = false
  }
}

export function startAlertWorker() {
  if (!dbEnabled) return
  setTimeout(checkAlerts, 5_000)
  setInterval(checkAlerts, INTERVAL)
}
