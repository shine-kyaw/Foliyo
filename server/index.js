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

const app  = express()
const PORT = process.env.API_PORT || 3001

app.use(cors())
app.use(express.json())

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
  })
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
  })
}

// Default export for Vercel serverless runtime
export default app
