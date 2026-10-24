import express from 'express'
import { dbEnabled, query } from '../db.js'
import { authEnabled, hashPassword, verifyPassword, issueToken, requireUser, throttle } from '../auth.js'
import { mailEnabled } from '../mailer.js'

const router = express.Router()
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || null
const ready = dbEnabled && authEnabled

/* Keys a signed-in user may sync — each maps to one localStorage key on the client */
const DATA_KEYS = new Set(['watchlist', 'watchlist_meta', 'portfolio', 'sim_cash', 'sim_holdings', 'sim_trades'])

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const publicUser = u => ({ id: u.id, email: u.email, name: u.name, provider: u.google_sub && !u.password_hash ? 'google' : 'email' })

/* What the client can offer — read before showing the sign-in form */
router.get('/config', (_req, res) => {
  res.json({ enabled: ready, google: ready ? GOOGLE_CLIENT_ID : null, emailAlerts: ready && mailEnabled })
})

router.use((req, res, next) => {
  if (req.path === '/config') return next()
  if (!ready) return res.status(503).json({ reason: 'unconfigured', error: 'Accounts are not switched on yet.' })
  next()
})

/* ── Email + password ──────────────────────────────────────── */
router.post('/signup', throttle(), async (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 80)
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!name) return res.status(400).json({ error: 'Enter your name.', field: 'name' })
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.', field: 'email' })
  if (password.length < 8) return res.status(400).json({ error: 'Use at least 8 characters for your password.', field: 'password' })

  const existing = await query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rowCount) return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.', field: 'email' })

  const { rows } = await query(
    'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
    [email, name, await hashPassword(password)],
  )
  res.status(201).json({ token: issueToken(rows[0].id), user: publicUser(rows[0]) })
})

router.post('/login', throttle(), async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email])
  const user = rows[0]
  if (user && !user.password_hash && user.google_sub) {
    return res.status(400).json({ error: 'This account uses Google. Use “Continue with Google”.' })
  }
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Email or password is incorrect.' })
  }
  res.json({ token: issueToken(user.id), user: publicUser(user) })
})

/* ── Google — verify the ID token Google Identity Services hands the browser ── */
router.post('/google', throttle(), async (req, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(503).json({ reason: 'unconfigured', error: 'Google sign-in is not switched on.' })
  const credential = String(req.body?.credential || '')
  let info
  try {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, { signal: AbortSignal.timeout(8000) })
    info = r.ok ? await r.json() : null
  } catch { info = null }
  const issuerOk = info && ['accounts.google.com', 'https://accounts.google.com'].includes(info.iss)
  if (!info || !issuerOk || info.aud !== GOOGLE_CLIENT_ID || info.email_verified !== 'true' || Number(info.exp) * 1000 < Date.now()) {
    return res.status(401).json({ error: 'Google sign-in could not be verified. Try again.' })
  }

  const email = info.email.toLowerCase()
  const name = (info.name || email.split('@')[0]).slice(0, 80)
  // Link by Google id first, then by verified email, otherwise create the account
  let { rows } = await query('SELECT * FROM users WHERE google_sub = $1', [info.sub])
  if (!rows.length) {
    ;({ rows } = await query('UPDATE users SET google_sub = $1 WHERE email = $2 RETURNING *', [info.sub, email]))
  }
  if (!rows.length) {
    ;({ rows } = await query('INSERT INTO users (email, name, google_sub) VALUES ($1, $2, $3) RETURNING *', [email, name, info.sub]))
  }
  res.json({ token: issueToken(rows[0].id), user: publicUser(rows[0]) })
})

/* ── Current user ──────────────────────────────────────────── */
router.get('/me', requireUser, async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.userId])
  if (!rows.length) return res.status(401).json({ error: 'Sign in to continue.' })
  res.json({ user: publicUser(rows[0]) })
})

router.delete('/me', requireUser, async (req, res) => {
  await query('DELETE FROM users WHERE id = $1', [req.userId])
  res.status(204).end()
})

/* ── Synced data — watchlist, portfolio, simulator ─────────── */
router.get('/data', requireUser, async (req, res) => {
  const { rows } = await query('SELECT key, value, updated_at FROM user_data WHERE user_id = $1', [req.userId])
  res.json({ data: Object.fromEntries(rows.map(r => [r.key, r.value])) })
})

router.put('/data/:key', requireUser, async (req, res) => {
  const { key } = req.params
  if (!DATA_KEYS.has(key)) return res.status(400).json({ error: 'Unknown data key.' })
  if (!('value' in (req.body || {}))) return res.status(400).json({ error: 'value required' })
  await query(
    `INSERT INTO user_data (user_id, key, value, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [req.userId, key, JSON.stringify(req.body.value)],
  )
  res.status(204).end()
})

export default router
