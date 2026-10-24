import { account, getToken } from '../services/account'

/* ── Saved user data ───────────────────────────────────────────
   Pages keep writing to localStorage as before, through persist().
   When someone is signed in, each write is also sent to their
   account (debounced), and signing in pulls the account's copy.  */
const SYNCED = {
  foliyo_watchlist:      'watchlist',
  foliyo_watchlist_meta: 'watchlist_meta',
  foliyo_portfolio:      'portfolio',
  foliyo_sim_cash:       'sim_cash',
  foliyo_sim_holdings:   'sim_holdings',
  foliyo_sim_trades:     'sim_trades',
}

const timers = {}

export function persist(localKey, value) {
  try { localStorage.setItem(localKey, JSON.stringify(value)) } catch {}
  const remoteKey = SYNCED[localKey]
  if (!remoteKey || !getToken()) return
  clearTimeout(timers[localKey])
  timers[localKey] = setTimeout(() => {
    account.putData(remoteKey, value).catch(() => { /* next write retries */ })
  }, 800)
}

/* After sign-in: the account's copy wins where it has one; anything
 * only this browser has is uploaded so it isn't lost. */
export async function pullUserData() {
  const { data } = await account.getData()
  const uploads = []
  for (const [localKey, remoteKey] of Object.entries(SYNCED)) {
    if (data[remoteKey] !== undefined) {
      try { localStorage.setItem(localKey, JSON.stringify(data[remoteKey])) } catch {}
    } else {
      const raw = localStorage.getItem(localKey)
      if (raw != null) {
        try { uploads.push(account.putData(remoteKey, JSON.parse(raw))) } catch {}
      }
    }
  }
  await Promise.allSettled(uploads)
}

/* Signing out leaves this browser without the account's data */
export function clearUserData() {
  for (const localKey of Object.keys(SYNCED)) {
    try { localStorage.removeItem(localKey) } catch {}
  }
}
