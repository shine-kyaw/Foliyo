import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Globe2, TrendingUp, TrendingDown, AlertTriangle,
  ExternalLink, Info, Building2, Users, Calendar, MapPin,
  BarChart2, ShieldAlert, Lightbulb, CheckCircle2, XCircle,
  DollarSign, Activity
} from 'lucide-react'
import { ysxStocks } from '../data/myanmarStocks'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

/* ── Static representative price chart ─────────────────────────── */
function buildChart(price, changePct) {
  const days = 30
  const points = []
  let v = price * (1 - changePct / 100 * 2.5)
  const trend = (price - v) / days
  for (let i = 0; i < days; i++) {
    const noise = (Math.random() - 0.48) * price * 0.012
    v = Math.max(v + trend + noise, price * 0.7)
    points.push({ day: `D-${days - i}`, price: Math.round(v) })
  }
  points.push({ day: 'Now', price })
  return points
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-xl border text-xs font-mono"
      style={{ background: 'var(--bg-1)', borderColor: 'var(--border)', color: 'var(--text-1)' }}>
      {payload[0].value.toLocaleString()} MMK
    </div>
  )
}

/* ── Metric card ────────────────────────────────────────────────── */
function MetricCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border px-4 py-3"
      style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
      <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{label}</div>
      <div className="font-black text-base" style={{ color: 'var(--text-1)' }}>{value}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</div>}
    </div>
  )
}

/* ── Sector + Verdict badges ────────────────────────────────────── */
const SECTOR_COLORS = {
  'Diversified':      { bg: 'rgba(139,92,246,.1)',  color: '#8b5cf6' },
  'Industrials':      { bg: 'rgba(59,130,246,.1)',  color: '#3b82f6' },
  'Financials':       { bg: 'rgba(16,185,129,.1)',  color: '#10b981' },
  'Communication':    { bg: 'rgba(6,182,212,.1)',   color: '#06b6d4' },
  'Consumer Staples': { bg: 'rgba(245,158,11,.1)',  color: '#f59e0b' },
}

function SectorBadge({ sector, sub }) {
  const c = SECTOR_COLORS[sector] || { bg: 'rgba(148,163,184,.1)', color: '#94a3b8' }
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: c.bg, color: c.color }}>
      {sub || sector}
    </span>
  )
}

function VerdictBadge({ verdict }) {
  const cfg = {
    'Buy':     { bg: 'rgba(16,185,129,.1)',  color: '#10b981', border: 'rgba(16,185,129,.25)' },
    'Hold':    { bg: 'rgba(245,158,11,.1)',  color: '#f59e0b', border: 'rgba(245,158,11,.25)' },
    'Sell':    { bg: 'rgba(239,68,68,.1)',   color: '#ef4444', border: 'rgba(239,68,68,.25)'  },
    'Caution': { bg: 'rgba(239,68,68,.1)',   color: '#ef4444', border: 'rgba(239,68,68,.25)'  },
  }[verdict] || { bg: 'rgba(148,163,184,.08)', color: '#94a3b8', border: 'rgba(148,163,184,.2)' }
  return (
    <span className="text-sm font-black px-3 py-1 rounded-full border"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
      {verdict}
    </span>
  )
}

/* ── Main ───────────────────────────────────────────────────────── */
export default function MyanmarStockDetail() {
  const { code } = useParams()
  const stock = ysxStocks.find(s => s.code === code)

  if (!stock) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <Globe2 size={40} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--text-3)' }} />
        <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text-1)' }}>Stock not found</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
          "{code}" is not a listed YSX company in our database.
        </p>
        <Link to="/myanmar-stocks"
          className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl"
          style={{ background: `rgba(var(--accent-rgb),.12)`, color: 'var(--accent)' }}>
          <ArrowLeft size={14} /> Back to Myanmar Stocks
        </Link>
      </div>
    )
  }

  const up = stock.changePct >= 0
  const chartData = buildChart(stock.price, stock.changePct)
  const chartColor = up ? '#10b981' : '#ef4444'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 page-enter">

      {/* Back link */}
      <Link to="/myanmar-stocks"
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors hover:opacity-80"
        style={{ color: 'var(--text-3)' }}>
        <ArrowLeft size={14} /> Myanmar Stocks
      </Link>

      {/* Data delay banner */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs mb-6"
        style={{ background: 'rgba(245,158,11,.06)', borderColor: 'rgba(245,158,11,.2)', color: '#f59e0b' }}>
        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
        <span>
          YSX data may be delayed. Prices shown are based on the latest available YSX publications and are
          not real-time. Always verify at <a href="https://www.ysx.com.mm" target="_blank" rel="noopener noreferrer"
            className="underline font-semibold">ysx.com.mm</a>.
        </span>
      </div>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border p-5 mb-5"
        style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0"
              style={{ background: `rgba(var(--accent-rgb),.1)`, color: 'var(--accent)' }}>
              {stock.code.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xl font-black" style={{ color: 'var(--text-1)' }}>{stock.code}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `rgba(var(--accent-rgb),.1)`, color: 'var(--accent)' }}>YSX</span>
                <SectorBadge sector={stock.sector} sub={stock.subsector} />
                <VerdictBadge verdict={stock.aiInsights.verdict} />
              </div>
              <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-1)' }}>{stock.name}</div>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-3)' }}>
                <span className="flex items-center gap-1"><MapPin size={11} />{stock.headquarters}</span>
                <span className="flex items-center gap-1"><Calendar size={11} />Listed {stock.listedDate}</span>
              </div>
            </div>
          </div>

          {/* Price block */}
          <div className="text-right shrink-0">
            <div className="font-black font-mono text-2xl" style={{ color: 'var(--text-1)' }}>
              {stock.price.toLocaleString()} <span className="text-base">MMK</span>
            </div>
            <div className="text-sm text-gray-400 font-mono mb-1">≈ ${stock.priceUSD.toFixed(2)} USD</div>
            <div className={`flex items-center justify-end gap-1 font-bold text-sm ${up ? 'text-emerald-400' : 'text-red-400'}`}>
              {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {up ? '+' : ''}{stock.changePct.toFixed(2)}%
              <span className="font-mono text-xs opacity-70">({up ? '+' : ''}{stock.change.toLocaleString()} MMK)</span>
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Vol: {stock.volume.toLocaleString()} shares</div>
          </div>
        </div>
      </motion.div>

      {/* Key metrics */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <MetricCard label="Market Cap"          value={stock.mktCap}                     sub="approximate" />
        <MetricCard label="Shares Outstanding"  value={stock.sharesOutstanding}          sub="total issued" />
        <MetricCard label="P/E Ratio"           value={stock.keyMetrics.pe}              sub="price / earnings" />
        <MetricCard label="P/B Ratio"           value={stock.keyMetrics.pb}              sub="price / book" />
        <MetricCard label="Dividend Yield"      value={`${stock.keyMetrics.dividendYield}%`} sub="annual estimate" />
        <MetricCard label="ROE"                 value={`${stock.keyMetrics.roe}%`}       sub="return on equity" />
        <MetricCard label="Founded"             value={stock.founded}                    sub={`${new Date().getFullYear() - parseInt(stock.founded)}y operating`} />
        <MetricCard label="Employees"           value={stock.employees}                  sub="approx." />
      </motion.div>

      {/* Representative chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="rounded-2xl border p-5 mb-5"
        style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity size={15} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>30-Day Price Trend</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(245,158,11,.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.2)' }}>
            Representative — not real-time
          </span>
        </div>
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
              interval={Math.floor(chartData.length / 5)} />
            <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(0)}K`} domain={['auto', 'auto']} width={36} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2}
              fill="url(#mmkGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Two-column: AI Analysis + Risk Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

        {/* AI Analysis */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border p-5"
          style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={15} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>AI Analysis</span>
            <VerdictBadge verdict={stock.aiInsights.verdict} />
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>
            {stock.aiInsights.summary}
          </p>
          <div className="mb-3">
            <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-3)' }}>POSITIVE FACTORS</div>
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
            <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-3)' }}>KEY RISKS</div>
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
          className="rounded-2xl border p-5"
          style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={15} style={{ color: '#ef4444' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Risk Factors</span>
          </div>
          <div className="space-y-2 mb-4">
            {stock.risks.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm px-3 py-2 rounded-lg"
                style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.1)' }}>
                <AlertTriangle size={12} className="shrink-0 mt-0.5 text-red-400" />
                <span style={{ color: 'var(--text-2)' }}>{r}</span>
              </div>
            ))}
          </div>

          {/* Liquidity warning */}
          <div className="rounded-xl p-3 text-xs"
            style={{ background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)', color: '#f59e0b' }}>
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <BarChart2 size={11} /> Liquidity Notice
            </div>
            <p>
              YSX daily trading volume is typically very low (under {stock.volume.toLocaleString()} shares/day for this stock).
              Entering and exiting positions may be difficult. Spreads can be wide.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Company profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
        className="rounded-2xl border p-5 mb-5"
        style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={15} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Company Profile</span>
        </div>

        <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-2)' }}>
          {stock.description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-3)' }}>MANAGEMENT</div>
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
            <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-3)' }}>BUSINESS DIVISIONS</div>
            <div className="flex flex-wrap gap-1.5">
              {stock.divisions.map((d, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: `rgba(var(--accent-rgb),.08)`, color: 'var(--accent)', border: `1px solid rgba(var(--accent-rgb),.15)` }}>
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Full disclaimer */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
        className="rounded-2xl border p-5"
        style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Info size={15} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Data & Disclaimer</span>
        </div>
        <div className="text-sm leading-relaxed space-y-2" style={{ color: 'var(--text-2)' }}>
          <p>
            Myanmar stock data shown here may be delayed or based on the most recently available YSX publication.
            The YSX does not offer a real-time public API. The price chart above is a representative trend
            for illustrative purposes and does not represent actual tick-by-tick market data.
          </p>
          <p>
            This page is for informational analysis only and is <strong>not financial advice</strong>.
            Investment in Myanmar stocks involves significant risks including political risk, currency (MMK)
            depreciation, limited liquidity, and regulatory uncertainty. Always verify data with official
            YSX publications and consult a qualified financial advisor before making investment decisions.
          </p>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <a href="https://www.ysx.com.mm" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ background: `rgba(var(--accent-rgb),.1)`, color: 'var(--accent)' }}>
            <ExternalLink size={11} /> Official YSX Website
          </a>
          <Link to="/myanmar-stocks"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}>
            <ArrowLeft size={11} /> All Myanmar Stocks
          </Link>
        </div>
      </motion.div>

    </div>
  )
}
