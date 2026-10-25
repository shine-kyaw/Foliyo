import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import quoteRouter, { batchHandler as quotesBatch, warmCache } from './routes/quote.js'
import chartRouter        from './routes/chart.js'
import newsRouter         from './routes/news.js'
import fundamentalsRouter from './routes/fundamentals.js'
import searchRouter       from './routes/search.js'
import globalRouter       from './routes/global.js'
import trendingRouter     from './routes/trending.js'
import ysxRouter          from './routes/ysx.js'
import accountRouter      from './routes/account.js'
import alertsRouter       from './routes/alerts.js'
import foliyoPostsRouter  from './routes/foliyoPosts.js'
import { dbEnabled, migrate } from './db.js'
import { authEnabled } from './auth.js'
import { mailEnabled } from './mailer.js'
import { startAlertWorker } from './alertWorker.js'

const app  = express()
const PORT = process.env.API_PORT || 3001

app.use(cors({
  origin: [
    'http://localhost:5190',
    'http://localhost:5180',
    /\.vercel\.app$/,
    process.env.FRONTEND_URL,   // set this in Render if you have a custom domain
  ].filter(Boolean),
  credentials: true,
}))
app.set('trust proxy', 1)   // Render sits behind a proxy; needed for per-IP throttling
app.use(express.json({ limit: '256kb' }))

// ── API Routes ────────────────────────────────────────────────
app.use('/api/quote',        quoteRouter)
app.get('/api/quotes',       quotesBatch)   // batch: ?symbols=AAPL,TSLA,MSFT
app.use('/api/chart',        chartRouter)
app.use('/api/news',         newsRouter)
app.use('/api/market-news',  newsRouter)    // same handler, no symbol → market-wide
app.use('/api/fundamentals', fundamentalsRouter)
app.use('/api/search',       searchRouter)
app.use('/api',              globalRouter)  // /api/commodities, /api/crypto, /api/forex
app.use('/api/stocks',       trendingRouter)// /api/stocks/trending, /api/stocks/indices
app.use('/api/ysx',          ysxRouter)     // real Yangon Stock Exchange history
app.use('/api/auth',         accountRouter) // sign-in, profile, synced data
app.use('/api/alerts',       alertsRouter)  // signed-in users' alerts
app.use('/api/foliyo-posts', foliyoPostsRouter) // Foliyo's Facebook articles (live with FB_PAGE_TOKEN)

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apis: {
      finnhub:      !!process.env.FINNHUB_API_KEY,
      twelveData:   !!process.env.TWELVE_DATA_API_KEY,
      alphaVantage: !!process.env.ALPHA_VANTAGE_API_KEY,
    },
    accounts: { database: dbEnabled, auth: authEnabled, google: !!process.env.GOOGLE_CLIENT_ID, email: mailEnabled },
    facebookPosts: !!process.env.FB_PAGE_TOKEN,
  })
})

// ── Errors — always JSON, never a stack trace ─────────────────
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.expose ? err.message : 'Something went wrong on our side. Try again.' })
})

// ── Local dev: start the HTTP server ─────────────────────────
// On Vercel the platform handles listening; we just export the app.
if (!process.env.VERCEL) {
  const apiKey = process.env.FINNHUB_API_KEY
  app.listen(PORT, () => {
    console.log(`\n🚀 Foliyo API server → http://localhost:${PORT}`)
    console.log(`   Finnhub:       ${apiKey                            ? '✓ configured' : '✗ missing'}`)
    console.log(`   Twelve Data:   ${process.env.TWELVE_DATA_API_KEY   ? '✓ configured' : '✗ missing'}`)
    console.log(`   Alpha Vantage: ${process.env.ALPHA_VANTAGE_API_KEY ? '✓ configured' : '✗ missing'}`)
    // Warm cache at boot, then keep refreshing every 40 s (just before 45 s TTL)
    warmCache(apiKey)
    setInterval(() => warmCache(apiKey), 40_000)
    console.log(`   Accounts:      ${dbEnabled && authEnabled ? '✓ configured' : '✗ set DATABASE_URL + AUTH_SECRET'}`)
    migrate()
      .then(startAlertWorker)
      .catch(e => console.error('   Database migration failed:', e.message))
  })
}

// Default export for Vercel serverless runtime
export default app
