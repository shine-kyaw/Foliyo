import express from 'express'
import { dbEnabled, query } from '../db.js'
import { authEnabled, requireUser } from '../auth.js'

const router = express.Router()

const TYPES    = new Set(['price_above', 'price_below', 'daily_move', 'sentiment_change', 'news_event'])
const METHODS  = new Set(['email', 'browser', 'both', 'dashboard'])
const STATUSES = new Set(['active', 'paused'])
const SENTIMENTS = new Set(['Bullish', 'Bearish', 'Neutral'])
const MAX_ALERTS = 50

/* Row → the shape the AI Alerts page already uses */
export const toClient = r => ({
  id: r.id,
  stock: { symbol: r.symbol, name: r.name, price: r.last_price },
  type: r.type,
  targetValue: r.target_value,
  targetSentiment: r.target_sentiment,
  notifMethod: r.notif_method,
  status: r.status,
  baseline: r.baseline,
  createdAt: r.created_at,
  triggeredAt: r.triggered_at,
  triggerPrice: r.trigger_price,
  triggerNote: r.trigger_note,
  emailedAt: r.emailed_at,
})

router.use((_req, res, next) => {
  if (!dbEnabled || !authEnabled) return res.status(503).json({ reason: 'unconfigured', error: 'Accounts are not switched on yet.' })
  next()
}, requireUser)

router.get('/', async (req, res) => {
  const { rows } = await query('SELECT * FROM alerts WHERE user_id = $1 ORDER BY created_at DESC', [req.userId])
  res.json({ alerts: rows.map(toClient) })
})

router.post('/', async (req, res) => {
  const b = req.body || {}
  const symbol = String(b.stock?.symbol || '').toUpperCase().trim().slice(0, 16)
  const name = String(b.stock?.name || '').slice(0, 120)
  if (!symbol) return res.status(400).json({ error: 'Pick a stock for this alert.' })
  if (!TYPES.has(b.type)) return res.status(400).json({ error: 'Unknown alert type.' })
  const needsNumber = ['price_above', 'price_below', 'daily_move'].includes(b.type)
  const target = Number(b.targetValue)
  if (needsNumber && !(target > 0)) return res.status(400).json({ error: 'Enter a target above zero.' })
  const sentiment = b.type === 'sentiment_change' ? (SENTIMENTS.has(b.targetSentiment) ? b.targetSentiment : 'Bullish') : null
  const method = METHODS.has(b.notifMethod) ? b.notifMethod : 'dashboard'

  const count = await query('SELECT count(*)::int AS n FROM alerts WHERE user_id = $1', [req.userId])
  if (count.rows[0].n >= MAX_ALERTS) return res.status(400).json({ error: `You can keep up to ${MAX_ALERTS} alerts. Delete one to add another.` })

  const { rows } = await query(
    `INSERT INTO alerts (user_id, symbol, name, type, target_value, target_sentiment, notif_method, last_price)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.userId, symbol, name, b.type, needsNumber ? target : null, sentiment, method, Number(b.stock?.price) || null],
  )
  res.status(201).json({ alert: toClient(rows[0]) })
})

/* Pause / resume, or re-arm a triggered alert */
router.patch('/:id', async (req, res) => {
  const status = req.body?.status
  if (!STATUSES.has(status)) return res.status(400).json({ error: 'Status must be active or paused.' })
  const { rows } = await query(
    `UPDATE alerts SET status = $1,
       triggered_at  = CASE WHEN $1 = 'active' THEN NULL ELSE triggered_at END,
       trigger_note  = CASE WHEN $1 = 'active' THEN NULL ELSE trigger_note END,
       trigger_price = CASE WHEN $1 = 'active' THEN NULL ELSE trigger_price END,
       emailed_at    = CASE WHEN $1 = 'active' THEN NULL ELSE emailed_at END
     WHERE id = $2 AND user_id = $3 RETURNING *`,
    [status, req.params.id, req.userId],
  )
  if (!rows.length) return res.status(404).json({ error: 'Alert not found.' })
  res.json({ alert: toClient(rows[0]) })
})

router.delete('/:id', async (req, res) => {
  await query('DELETE FROM alerts WHERE id = $1 AND user_id = $2', [req.params.id, req.userId])
  res.status(204).end()
})

/* Signed-out alerts kept in the browser are handed over at sign-in */
router.post('/import', async (req, res) => {
  const list = Array.isArray(req.body?.alerts) ? req.body.alerts.slice(0, MAX_ALERTS) : []
  let added = 0
  for (const a of list) {
    const symbol = String(a?.stock?.symbol || '').toUpperCase().trim().slice(0, 16)
    if (!symbol || !TYPES.has(a.type)) continue
    await query(
      `INSERT INTO alerts (user_id, symbol, name, type, target_value, target_sentiment, notif_method, status, last_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [req.userId, symbol, String(a.stock?.name || '').slice(0, 120), a.type,
       Number(a.targetValue) || null, SENTIMENTS.has(a.targetSentiment) ? a.targetSentiment : null,
       METHODS.has(a.notifMethod) ? a.notifMethod : 'dashboard',
       a.status === 'paused' ? 'paused' : 'active', Number(a.stock?.price) || null],
    )
    added++
  }
  res.json({ added })
})

export default router
