import crypto from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(crypto.scrypt)

/* ── Passwords — scrypt, per-user salt ─────────────────────── */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const key  = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  if (!stored) return false
  const [scheme, saltHex, keyHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false
  const key = await scrypt(password, Buffer.from(saltHex, 'hex'), 64)
  const expected = Buffer.from(keyHex, 'hex')
  return expected.length === key.length && crypto.timingSafeEqual(expected, key)
}

/* ── Session tokens — HMAC-signed, sent as a Bearer header ─────
   The frontend (vercel.app) and API (onrender.com) are different
   sites, so third-party cookies would be blocked; a header isn't. */
const SECRET   = process.env.AUTH_SECRET
const TOKEN_TTL = 30 * 24 * 60 * 60 * 1000   // 30 days

export const authEnabled = !!SECRET && SECRET.length >= 32

const b64 = buf => Buffer.from(buf).toString('base64url')
const sign = payload => crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')

export function issueToken(userId) {
  const payload = b64(JSON.stringify({ uid: userId, exp: Date.now() + TOKEN_TTL }))
  return `${payload}.${sign(payload)}`
}

export function readToken(token) {
  if (!authEnabled || !token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const good = Buffer.from(sign(payload))
  const given = Buffer.from(sig)
  if (good.length !== given.length || !crypto.timingSafeEqual(good, given)) return null
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return exp > Date.now() ? uid : null
  } catch { return null }
}

export function requireUser(req, res, next) {
  const header = req.get('authorization') || ''
  const uid = readToken(header.startsWith('Bearer ') ? header.slice(7) : '')
  if (!uid) return res.status(401).json({ error: 'Sign in to continue.' })
  req.userId = uid
  next()
}

/* ── Simple per-IP throttle for sign-in attempts ───────────── */
const attempts = new Map()
export function throttle(limit = 10, windowMs = 15 * 60_000) {
  return (req, res, next) => {
    const key = req.ip
    const now = Date.now()
    const list = (attempts.get(key) || []).filter(t => now - t < windowMs)
    if (list.length >= limit) {
      return res.status(429).json({ error: 'Too many attempts. Wait a few minutes and try again.' })
    }
    list.push(now)
    attempts.set(key, list)
    next()
  }
}
