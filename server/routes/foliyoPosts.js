import express from 'express'
import { get, set } from '../cache.js'
import { foliyoPosts as savedPosts } from '../../src/data/foliyoPosts.js'

/* ── Foliyo's Facebook posts ───────────────────────────────────
   GET /api/foliyo-posts → { source, articles:[{ slug, date, en, my }] }

   With FB_PAGE_TOKEN (a Page access token for the Foliyo page) the
   posts come straight from the Graph API, so anything new on
   facebook.com/FoliyoInvesting shows up here within ~10 minutes.
   Without it — or if Facebook errors — the copy saved in the repo
   is served, so the site never loses its articles.               */
const router = express.Router()
const GRAPH = 'https://graph.facebook.com'
const TTL = 10 * 60_000
const FIELDS = 'id,message,created_time,permalink_url'

const isBurmese = s => /[က-႟]/.test(s) && (s.match(/[က-႟]/g).length > s.length * 0.25)

function toVersion(post) {
  const lines = String(post.message || '').normalize('NFKC').split('\n').map(l => l.trim()).filter(Boolean)
  return { title: lines[0] || '', body: lines.slice(1), url: post.permalink_url || null }
}

export function slugify(s, fallback) {
  const words = String(s).toLowerCase().replace(/['’]/g, '').split(':')[0]
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 8)
  return words.length >= 2 ? words.join('-') : fallback
}

/* Each topic is posted once in English and once in Burmese, close together.
 * Pair an English post with the nearest Burmese one within 36 hours; anything
 * left over stands alone in its own language. */
export function pairPosts(posts) {
  const items = posts
    .filter(p => p.message && p.message.trim().length > 40)
    .map(p => ({ p, my: isBurmese(p.message), t: Date.parse(p.created_time) }))
  const used = new Set()
  const out = []
  for (const it of items) {
    if (used.has(it.p.id)) continue
    used.add(it.p.id)
    let partner = null, best = Infinity
    for (const other of items) {
      if (used.has(other.p.id) || other.my === it.my) continue
      const gap = Math.abs(other.t - it.t)
      if (gap < 36 * 3600_000 && gap < best) { best = gap; partner = other }
    }
    if (partner) used.add(partner.p.id)
    const en = !it.my ? it : partner && !partner.my ? partner : null
    const my = it.my ? it : partner && partner.my ? partner : null
    const enV = en ? toVersion(en.p) : null
    const myV = my ? toVersion(my.p) : null
    out.push({
      slug: slugify(enV?.title || '', `post-${(en || my).p.id.split('_').pop()}`),
      date: new Date(Math.max(en?.t || 0, my?.t || 0)).toISOString(),
      en: enV || myV,          // a Burmese-only post still reads in Burmese
      my: myV || enV,
      langs: [enV && 'en', myV && 'my'].filter(Boolean),
    })
  }
  return out.sort((a, b) => b.date.localeCompare(a.date))
}

async function fetchFromFacebook(token) {
  const pageId = process.env.FB_PAGE_ID || 'me'   // a Page token's "me" is the Page itself
  let url = `${GRAPH}/${pageId}/posts?fields=${FIELDS}&limit=100&access_token=${encodeURIComponent(token)}`
  const posts = []
  for (let page = 0; url && page < 10; page++) {
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    const j = await r.json()
    if (!r.ok || j.error) throw new Error(j.error?.message || `Graph API HTTP ${r.status}`)
    posts.push(...(j.data || []))
    url = j.paging?.next || null
  }
  return posts
}

router.get('/', async (_req, res) => {
  const cached = get('foliyo-posts')
  if (cached) return res.json(cached)

  const saved = { source: 'saved', articles: savedPosts, lastUpdated: null }
  const token = process.env.FB_PAGE_TOKEN
  if (!token) return res.json(saved)

  try {
    const articles = pairPosts(await fetchFromFacebook(token))
    if (!articles.length) return res.json(saved)
    const result = { source: 'facebook', articles, lastUpdated: new Date().toISOString() }
    set('foliyo-posts', result, TTL)
    res.json(result)
  } catch (e) {
    console.warn('Facebook posts:', e.message)
    res.json({ ...saved, error: 'Facebook didn’t answer; showing the saved copy.' })
  }
})

export default router
