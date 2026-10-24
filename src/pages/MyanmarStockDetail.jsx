import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Globe2, TrendingUp, TrendingDown, AlertTriangle,
  ExternalLink, Info, Building2, Users, Calendar, MapPin,
  BarChart2, ShieldAlert, Lightbulb, CheckCircle2, XCircle,
  Activity, RefreshCw
} from 'lucide-react'
import PageHeader, { StatusPill } from '../components/PageHeader'
import { ysxStocks, YSX_URL } from '../data/myanmarStocks'
import { useYsxHistory, useYsxQuotes, withQuote } from '../hooks/useYsx'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const BOARD = '/global-markets?region=myanmar'

/* ── Price chart (real YSX closes) ─────────────────────────────── */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmtDay = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="px-3 py-2 rounded-lg border text-xs font-mono"
      style={{ background: 'var(--bg-1)', borderColor: 'var(--border)', color: 'var(--text-1)' }}>
      <div style={{ color: 'var(--text-3)' }}>{p.day}</div>
      <div>{p.price.toLocaleString()} MMK</div>
      {!p.traded && <div style={{ color: 'rgb(var(--caution))' }}>No trades</div>}
    </div>
  )
}

/* ── Metric card ────────────────────────────────────────────────── */
function MetricCard({ label, value, sub }) {
  return (
    <div className="card-flat !px-4 !py-3">
      <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{label}</div>
      <div className="font-black font-mono text-base" style={{ color: 'var(--text-1)' }}>{value}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</div>}
    </div>
  )
}

/* ── Sector + Verdict badges ────────────────────────────────────── */
const SECTOR_COLORS = {
  'Diversified':      { bg: 'rgba(201,138,107,.1)',  color: '#c98a6b' },
  'Industrials':      { bg: 'rgba(111,163,184,.1)',  color: '#6fa3b8' },
  'Financials':       { bg: 'rgba(143,179,138,.1)',  color: '#8fb38a' },
  'Communication':    { bg: 'rgba(232,164,62,.1)',   color: '#e8a43e' },
  'Consumer Staples': { bg: 'rgba(216,199,166,.1)',  color: '#d8c7a6' },
}

function SectorBadge({ sector, sub }) {
  const c = SECTOR_COLORS[sector] || { bg: 'var(--bg-3)', color: 'var(--text-2)' }
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-md"
      style={{ background: c.bg, color: c.color }}>
      {sub || sector}
    </span>
  )
}

function VerdictBadge({ verdict }) {
  const cfg = {
    'Buy':     { bg: 'rgb(var(--up) / .1)',      color: 'rgb(var(--up))',      border: 'rgb(var(--up) / .25)' },
    'Hold':    { bg: 'rgb(var(--caution) / .1)', color: 'rgb(var(--caution))', border: 'rgb(var(--caution) / .25)' },
    'Sell':    { bg: 'rgb(var(--down) / .1)',    color: 'rgb(var(--down))',    border: 'rgb(var(--down) / .25)' },
    'Caution': { bg: 'rgb(var(--down) / .1)',    color: 'rgb(var(--down))',    border: 'rgb(var(--down) / .25)' },
  }[verdict] || { bg: 'var(--bg-3)', color: 'var(--text-2)', border: 'var(--border)' }
  return (
    <span className="text-sm font-black px-3 py-1 rounded-md border"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
      {verdict}
    </span>
  )
}

/* ── Main ───────────────────────────────────────────────────────── */
export default function MyanmarStockDetail() {
  const { code } = useParams()
  const stock = ysxStocks.find(s => s.code === code)
  if (!stock) return <NotFound code={code} />
  return <StockView stock={stock} />
}

function NotFound({ code }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-24 text-center">
      <Globe2 size={40} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--text-3)' }} />
      <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text-1)' }}>Stock not found</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
        "{code}" is not a listed YSX company in our database. It may have been mistyped, or it isn't covered here.
      </p>
      <Link to={BOARD} className="btn-primary">
        <ArrowLeft size={14} /> Back to the Myanmar board
      </Link>
    </div>
  )
}

function StockView({ stock }) {
  const { quotes } = useYsxQuotes()
  const { history, data: rows, loading: chartLoading, error: chartError, refetch } = useYsxHistory(stock.code, 30)
  const live = withQuote(stock, quotes[stock.code])
  const hasChange = live.changePct != null
  const up = (live.changePct ?? 0) >= 0

  const chartData = rows.map(r => ({ day: fmtDay(r.date), price: r.close, traded: r.traded }))
  const noTradeDays = rows.filter(r => !r.traded).length
  const range30 = rows.length ? {
    high: Math.max(...rows.map(r => r.close)),
    low: Math.min(...rows.map(r => r.close)),
    volume: rows.reduce((n, r) => n + (r.volume || 0), 0),
  } : null
  const chartUp = chartData.length > 1 ? chartData[chartData.length - 1].price >= chartData[0].price : up
  const chartColor = chartUp ? '#45c08a' : '#ef6b5b'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 page-enter">

      {/* Back link */}
      <Link to={BOARD}
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors hover:opacity-80"
        style={{ color: 'var(--text-3)' }}>
        <ArrowLeft size={14} /> Myanmar board
      </Link>

      {/* Data delay banner */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border text-xs mb-6"
        style={{ background: 'rgb(var(--caution) / .06)', borderColor: 'rgb(var(--caution) / .2)', color: 'rgb(var(--caution))' }}>
        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
        <span>
          Prices are end-of-day closes from the Yangon Stock Exchange, published after each session. They are
          not real-time. Always verify at <a href={YSX_URL} target="_blank" rel="noopener noreferrer"
            className="underline font-semibold">ysx-mm.com</a>.
        </span>
      </div>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="card-flat mb-5">

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black shrink-0"
              style={{ background: 'rgba(var(--accent-rgb),.1)', color: 'var(--accent)' }}>
              {stock.code.charAt(0)}
            </div>
            <div>
              <h1 className="text-[1.75rem] sm:text-[2.1rem] font-black leading-none mb-2" style={{ color: 'var(--text-1)' }}>
                {stock.code}
              </h1>
              <div className="text-sm font-semibold mb-2" style={{ color: 'var(--text-1)' }}>{stock.name}</div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <StatusPill tone="muted">YSX · end of day</StatusPill>
                <SectorBadge sector={stock.sector} sub={stock.subsector} />
                <VerdictBadge verdict={stock.aiInsights.verdict} />
              </div>
              <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: 'var(--text-3)' }}>
                <span className="flex items-center gap-1"><MapPin size={11} />{stock.headquarters}</span>
                <span className="flex items-center gap-1"><Calendar size={11} />Listed <span className="font-mono">{stock.listedDate}</span></span>
              </div>
            </div>
          </div>

          {/* Price block */}
          <div className="text-right shrink-0">
            <div className="font-black font-mono text-2xl" style={{ color: 'var(--text-1)' }}>
              {live.price.toLocaleString()} <span className="text-base">MMK</span>
            </div>
            <div className="text-sm mb-1" style={{ color: 'var(--text-3)' }}>
              {live.live ? 'Close' : 'Last known close'} <span className="font-mono">{live.date}</span>
            </div>
            {hasChange && (
              <div className={`flex items-center justify-end gap-1 font-bold font-mono text-sm ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {up ? '+' : ''}{live.changePct.toFixed(2)}%
                {live.change != null && <span className="font-mono text-xs opacity-70">({up ? '+' : ''}{live.change.toLocaleString()} MMK)</span>}
              </div>
            )}
            {live.volume != null && (
              <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                {live.traded ? <>Vol: <span className="font-mono">{live.volume.toLocaleString()}</span> shares</> : 'No trades in the latest session'}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Key metrics */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <MetricCard label="Market Cap"          value={live.mktCap}                      sub="shares × close" />
        <MetricCard label="Shares Outstanding"  value={stock.sharesOutstanding}          sub="total issued" />
        {/* Range and turnover come from the exchange's own daily rows, not estimates */}
        <MetricCard label="30-day high"         value={range30 ? range30.high.toLocaleString() : '—'} sub="MMK, highest close" />
        <MetricCard label="30-day low"          value={range30 ? range30.low.toLocaleString() : '—'}  sub="MMK, lowest close" />
        <MetricCard label="Sessions traded"     value={rows.length ? `${rows.length - noTradeDays} / ${rows.length}` : '—'} sub="last 30 days" />
        <MetricCard label="30-day volume"       value={rows.length ? range30.volume.toLocaleString() : '—'} sub="shares" />
        <MetricCard label="Founded"             value={stock.founded}                    sub={`${new Date().getFullYear() - parseInt(stock.founded)}y operating`} />
        <MetricCard label="Employees"           value={stock.employees}                  sub="approx." />
      </motion.div>

      {/* Price chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="card-flat mb-5">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <div className="flex items-center gap-2">
            <Activity size={15} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>30-Day Price Trend</span>
          </div>
          {history && (
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
              as of <span className="font-mono">{history.asOf}</span>
            </span>
          )}
        </div>

        {chartLoading && <div className="h-[200px] rounded-xl shimmer" />}

        {chartError && (
          <div className="h-[200px] flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>Couldn’t load prices from the Yangon Stock Exchange right now.</p>
            <button onClick={refetch} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border"
              style={{ color: 'var(--text-2)', borderColor: 'var(--border)' }}>
              <RefreshCw size={12} /> Try again
            </button>
          </div>
        )}

        {!chartLoading && !chartError && chartData.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mmkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={chartColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false}
                  interval={Math.max(Math.floor(chartData.length / 5), 0)} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v.toLocaleString()} domain={['auto', 'auto']} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2}
                  fill="url(#mmkGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-2 text-xs" style={{ color: 'var(--text-3)' }}>
              Daily closes · Source:{' '}
              <a href={history.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="underline font-semibold" style={{ color: 'var(--text-2)' }}>Yangon Stock Exchange</a>
              {' '}· as of <span className="font-mono">{history.asOf}</span>
              {history.stale && ' · cached copy, the exchange site is not responding'}
            </div>
          </>
        )}

        {!chartLoading && !chartError && chartData.length === 0 && (
          <p className="text-sm py-10 text-center" style={{ color: 'var(--text-3)' }}>No price history published for this period.</p>
        )}
      </motion.div>

      {/* Two-column: AI Analysis + Risk Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

        {/* AI Analysis */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="card-flat">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={15} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>AI Analysis</span>
            <VerdictBadge verdict={stock.aiInsights.verdict} />
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>
            {stock.aiInsights.summary}
          </p>
          <div className="mb-3">
            <div className="section-label mb-2">Positive factors</div>
            <div className="space-y-1.5">
              {stock.aiInsights.reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-emerald-400" />
                  <span style={{ color: 'var(--text-2)' }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="section-label mb-2">Key risks</div>
            <div className="space-y-1.5">
              {stock.aiInsights.risks.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <XCircle size={13} className="shrink-0 mt-0.5 text-red-400" />
                  <span style={{ color: 'var(--text-2)' }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Risk Summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="card-flat">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={15} style={{ color: 'rgb(var(--down))' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Risk Factors</span>
          </div>
          <div className="space-y-2 mb-4">
            {stock.risks.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm px-3 py-2 rounded-lg"
                style={{ background: 'rgb(var(--down) / .05)', border: '1px solid rgb(var(--down) / .1)' }}>
                <AlertTriangle size={12} className="shrink-0 mt-0.5 text-red-400" />
                <span style={{ color: 'var(--text-2)' }}>{r}</span>
              </div>
            ))}
          </div>

          {/* Liquidity warning */}
          <div className="rounded-lg p-3 text-xs"
            style={{ background: 'rgb(var(--caution) / .06)', border: '1px solid rgb(var(--caution) / .2)', color: 'rgb(var(--caution))' }}>
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <BarChart2 size={11} /> Liquidity Notice
            </div>
            <p>
              Trading on the YSX is thin.
              {chartData.length > 0 && !chartError && <> {noTradeDays === 0 ? 'It traded in every session shown above.' : <>It had no trades in <span className="font-mono">{noTradeDays}</span> of the last <span className="font-mono">{chartData.length}</span> sessions shown above.</>}</>}
              {' '}Entering and exiting positions may be difficult. Spreads can be wide.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Company profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
        className="card-flat mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={15} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Company Profile</span>
        </div>

        <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-2)' }}>
          {stock.description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="section-label mb-2">Management</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <Users size={12} style={{ color: 'var(--text-3)' }} />
                <span style={{ color: 'var(--text-2)' }}>CEO: <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{stock.ceo}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={12} style={{ color: 'var(--text-3)' }} />
                <span style={{ color: 'var(--text-2)' }}>{stock.headquarters}</span>
              </div>
              {stock.website && stock.website !== '#' && (
                <div className="flex items-center gap-2">
                  <ExternalLink size={12} style={{ color: 'var(--text-3)' }} />
                  <a href={stock.website} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold underline" style={{ color: 'var(--accent)' }}>
                    {stock.website.replace('https://', '')}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="section-label mb-2">Business divisions</div>
            <div className="flex flex-wrap gap-1.5">
              {stock.divisions.map((d, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(var(--accent-rgb),.08)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),.15)' }}>
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Full disclaimer */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
        className="card-flat">
        <div className="flex items-center gap-2 mb-3">
          <Info size={15} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Data & Disclaimer</span>
        </div>
        <div className="text-sm leading-relaxed space-y-2" style={{ color: 'var(--text-2)' }}>
          <p>
            Myanmar prices shown here are end-of-day figures taken from the Yangon Stock Exchange website after each
            session. They are not real-time. Days with no trades repeat the previous close, and the chart plots
            daily closes only, not intraday movement.
          </p>
          <p>
            This page is for informational analysis only and is <strong>not financial advice</strong>.
            Investment in Myanmar stocks involves significant risks including political risk, currency (MMK)
            depreciation, limited liquidity, and regulatory uncertainty. Always verify data with official
            YSX publications and consult a qualified financial advisor before making investment decisions.
          </p>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <a href={YSX_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors hover:opacity-80"
            style={{ background: 'rgba(var(--accent-rgb),.1)', color: 'var(--accent)' }}>
            <ExternalLink size={11} /> Official YSX Website
          </a>
          <Link to={BOARD}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md"
            style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}>
            <ArrowLeft size={11} /> All Myanmar Stocks
          </Link>
        </div>
      </motion.div>

    </div>
  )
}
