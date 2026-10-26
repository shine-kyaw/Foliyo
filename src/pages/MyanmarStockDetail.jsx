import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Globe2, AlertTriangle, ExternalLink, RefreshCw, CheckCircle2, XCircle,
} from 'lucide-react'
import { ysxStocks, YSX_URL } from '../data/myanmarStocks'
import { useYsxHistory, useYsxQuotes, withQuote } from '../hooks/useYsx'
import PriceChart, { rangeChange } from '../components/PriceChart'

const BOARD = '/global-markets?region=myanmar'

/* ── Price chart (real YSX closes) ─────────────────────────────── */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmtDay = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="px-3 py-2 rounded-lg border text-xs num"
      style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text-1)' }}>
      <div style={{ color: 'var(--text-3)' }}>{p.day}</div>
      <div className="font-semibold">{p.price.toLocaleString()} MMK</div>
      {!p.traded && <div style={{ color: 'rgb(var(--caution))' }}>No trades</div>}
    </div>
  )
}

/* ── Small pieces ───────────────────────────────────────────────── */
function SectionHead({ children, right }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-3">
      <h2 className="section-title">{children}</h2>
      {right}
    </div>
  )
}

/* Label / value row — grey label left, bold value right, thin rule beneath */
function Stat({ label, value, note }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 border-b text-sm" style={{ borderColor: 'var(--border)' }}>
      <span style={{ color: 'var(--text-3)' }}>{label}{note && <span className="text-xs"> · {note}</span>}</span>
      <span className="font-semibold num text-right" style={{ color: 'var(--text-1)' }}>{value}</span>
    </div>
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
    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border"
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
      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>Stock not found</h2>
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
  const changeColor = hasChange ? (up ? 'rgb(var(--up))' : 'rgb(var(--down))') : 'var(--text-3)'

  const chartData = rows.map(r => ({ day: fmtDay(r.date), price: r.close, traded: r.traded }))
  // Sessions close at 13:00 Yangon time (UTC+6:30)
  const ysxPts = rows.map(r => ({
    t: Date.parse(`${r.date}T13:00:00+06:30`), close: r.close, open: r.open, high: r.high, low: r.low, volume: r.volume,
    note: r.traded === false ? 'No trades this session — price carried from the previous close' : null,
  }))
  const [ysxMode, setYsxMode] = useState('line')
  const noTradeDays = rows.filter(r => !r.traded).length
  const range30 = rows.length ? {
    high: Math.max(...rows.map(r => r.close)),
    low: Math.min(...rows.map(r => r.close)),
    volume: rows.reduce((n, r) => n + (r.volume || 0), 0),
  } : null
  const chartUp = chartData.length > 1 ? chartData[chartData.length - 1].price >= chartData[0].price : up
  const chartColor = chartUp ? 'rgb(var(--up))' : 'rgb(var(--down))'

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 page-enter">

      {/* Back link */}
      <Link to={BOARD}
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-4 link">
        <ArrowLeft size={14} /> Myanmar board
      </Link>

      {/* ── Quote header ── */}
      <header className="mb-6">
        <div className="text-xs" style={{ color: 'var(--text-3)' }}>YSX · End of day · MMK</div>
        <h1 className="text-[1.7rem] sm:text-[2.1rem] font-bold leading-[1.1] mt-1" style={{ color: 'var(--text-1)' }}>
          {stock.name} ({stock.code})
        </h1>
        <div className="text-sm mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: 'var(--text-2)' }}>
          <span>{stock.subsector || stock.sector}</span>
          <span style={{ color: 'var(--text-3)' }}>·</span>
          <span>{stock.headquarters}</span>
          <span style={{ color: 'var(--text-3)' }}>·</span>
          <span>Listed <span className="num">{stock.listedDate}</span></span>
        </div>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-[2.25rem] sm:text-[2.6rem] font-bold leading-none num" style={{ color: 'var(--text-1)' }}>
            {live.price.toLocaleString()}
          </span>
          {hasChange && (
            <span className="text-lg font-semibold num" style={{ color: changeColor }}>
              {live.change != null && <>{up ? '+' : ''}{live.change.toLocaleString()} </>}({up ? '+' : ''}{live.changePct.toFixed(2)}%)
            </span>
          )}
        </div>
        <div className="text-xs mt-1.5" style={{ color: 'var(--text-3)' }}>
          {live.live ? 'Close' : 'Last known close'} <span className="num">{live.date}</span>
          {live.volume != null && (
            <> · {live.traded ? <>Vol <span className="num">{live.volume.toLocaleString()}</span> shares</> : 'No trades in the latest session'}</>
          )}
        </div>
      </header>

      {/* Data delay notice */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-[10px] border text-xs mb-6"
        style={{ background: 'rgb(var(--caution) / .06)', borderColor: 'rgb(var(--caution) / .2)', color: 'rgb(var(--caution))' }}>
        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
        <span>
          Prices are end-of-day closes from the Yangon Stock Exchange, published after each session. They are
          not real-time. Always verify at <a href={YSX_URL} target="_blank" rel="noopener noreferrer"
            className="underline font-semibold">ysx-mm.com</a>.
        </span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-x-10 gap-y-8">
        <div className="min-w-0 space-y-10">

          {/* ── Price chart ── */}
          <section aria-label="30-day price chart">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <div className="flex items-center gap-1" aria-label="Range">
                <span className="text-[13px] font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--bg-3)', color: 'var(--text-1)' }}>30D</span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-3)' }}>Daily closes</span>
              </div>
              {history && (
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  as of <span className="num">{history.asOf}</span>
                </span>
              )}
            </div>

            <div className="rounded-[10px] border p-3 sm:p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-2)' }}>
              {chartLoading && <div className="h-[260px] rounded-lg shimmer" />}

              {chartError && (
                <div className="h-[260px] flex flex-col items-center justify-center gap-3 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>Couldn’t load prices from the Yangon Stock Exchange right now.</p>
                  <button onClick={refetch} className="btn-ghost !py-1.5 !px-3.5 text-xs">
                    <RefreshCw size={12} /> Try again
                  </button>
                </div>
              )}

              {!chartLoading && !chartError && chartData.length > 0 && (
                <>
                  <div className="flex justify-end mb-2">
                    <div className="inline-flex p-0.5 rounded-full" style={{ background:'var(--bg-1)' }} role="group" aria-label="Chart type">
                      {[['line','Line'],['candle','Candles']].map(([k, l]) => (
                        <button key={k} onClick={() => setYsxMode(k)} aria-pressed={ysxMode === k}
                          className="text-xs px-3 py-1 rounded-full font-semibold"
                          style={ysxMode === k ? { background:'var(--bg-0)', color:'var(--text-1)', boxShadow:'0 1px 3px rgba(var(--shadow-color),.15)' } : { color:'var(--text-2)' }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <PriceChart data={ysxPts} mode={ysxMode} tz="Asia/Yangon" prefix="" suffix=" MMK" decimals={0}
                    height={320} ariaLabel={`${stock.code} 30-day chart`} />
                  <div className="mt-2 text-xs" style={{ color: 'var(--text-3)' }}>
                    Source:{' '}
                    <a href={history.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="link font-semibold">Yangon Stock Exchange</a>
                    {' '}· as of <span className="num">{history.asOf}</span>
                    {history.stale && ' · cached copy, the exchange site is not responding'}
                  </div>
                </>
              )}

              {!chartLoading && !chartError && chartData.length === 0 && (
                <p className="text-sm py-10 text-center" style={{ color: 'var(--text-3)' }}>No price history published for this period.</p>
              )}
            </div>
          </section>

          {/* ── Key statistics ── */}
          <section aria-label="Key statistics">
            <SectionHead>Key statistics</SectionHead>
            <div className="grid sm:grid-cols-2 gap-x-10 border-t" style={{ borderColor: 'var(--border)' }}>
              <div>
                <Stat label="Market cap" value={live.mktCap} note="shares × close" />
                <Stat label="Shares outstanding" value={stock.sharesOutstanding} />
                {/* Range and turnover come from the exchange's own daily rows, not estimates */}
                <Stat label="30-day high" value={range30 ? `${range30.high.toLocaleString()} MMK` : '—'} />
                <Stat label="30-day low" value={range30 ? `${range30.low.toLocaleString()} MMK` : '—'} />
              </div>
              <div>
                <Stat label="Sessions traded" value={rows.length ? `${rows.length - noTradeDays} / ${rows.length}` : '—'} note="last 30 days" />
                <Stat label="30-day volume" value={rows.length ? `${range30.volume.toLocaleString()} shares` : '—'} />
                <Stat label="Listed" value={stock.listedDate} />
                <Stat label="Founded" value={stock.founded} note={`${new Date().getFullYear() - parseInt(stock.founded)}y operating`} />
                <Stat label="Employees" value={stock.employees} note="approx." />
              </div>
            </div>
          </section>

          {/* ── AI analysis ── */}
          <section aria-label="AI analysis">
            <SectionHead right={<VerdictBadge verdict={stock.aiInsights.verdict} />}>AI analysis</SectionHead>
            <p className="text-sm leading-relaxed mb-5 max-w-3xl" style={{ color: 'var(--text-2)' }}>
              {stock.aiInsights.summary}
            </p>
            <div className="grid sm:grid-cols-2 gap-x-10 gap-y-6">
              <div>
                <div className="section-label mb-2">Positive factors</div>
                <ul>
                  {stock.aiInsights.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm py-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5" style={{ color: 'rgb(var(--up))' }} />
                      <span style={{ color: 'var(--text-2)' }}>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="section-label mb-2">Key risks</div>
                <ul>
                  {stock.aiInsights.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm py-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      <XCircle size={14} className="shrink-0 mt-0.5" style={{ color: 'rgb(var(--down))' }} />
                      <span style={{ color: 'var(--text-2)' }}>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ── Risk factors ── */}
          <section aria-label="Risk factors">
            <SectionHead>Risk factors</SectionHead>
            <ul className="mb-4">
              {stock.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm py-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
                  <AlertTriangle size={13} className="shrink-0 mt-1" style={{ color: 'rgb(var(--down))' }} />
                  <span style={{ color: 'var(--text-2)' }}>{r}</span>
                </li>
              ))}
            </ul>

            {/* Liquidity warning */}
            <div className="rounded-[10px] p-3 text-xs"
              style={{ background: 'rgb(var(--caution) / .06)', border: '1px solid rgb(var(--caution) / .2)', color: 'rgb(var(--caution))' }}>
              <div className="font-bold mb-1">Liquidity notice</div>
              <p>
                Trading on the YSX is thin.
                {chartData.length > 0 && !chartError && <> {noTradeDays === 0 ? 'It traded in every session shown above.' : <>It had no trades in <span className="num">{noTradeDays}</span> of the last <span className="num">{chartData.length}</span> sessions shown above.</>}</>}
                {' '}Entering and exiting positions may be difficult. Spreads can be wide.
              </p>
            </div>
          </section>

          {/* ── Data & disclaimer ── */}
          <section aria-label="Data and disclaimer">
            <SectionHead>Data & disclaimer</SectionHead>
            <div className="text-sm leading-relaxed space-y-2 max-w-3xl" style={{ color: 'var(--text-2)' }}>
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
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <a href={YSX_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost !py-1.5 !px-3.5 text-xs">
                <ExternalLink size={11} /> Official YSX website
              </a>
              <Link to={BOARD} className="btn-ghost !py-1.5 !px-3.5 text-xs">
                <ArrowLeft size={11} /> All Myanmar stocks
              </Link>
            </div>
          </section>
        </div>

        {/* ── Right rail: company profile ── */}
        <aside className="space-y-6 lg:pt-[3.2rem]" aria-label="Company profile">
          <div className="rounded-[10px] border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-2)' }}>
            <SectionHead>Company profile</SectionHead>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>
              {stock.description}
            </p>

            <div className="border-t" style={{ borderColor: 'var(--border)' }}>
              <Stat label="Sector" value={stock.sector} />
              <Stat label="CEO" value={stock.ceo} />
              <Stat label="Headquarters" value={stock.headquarters} />
              {stock.website && stock.website !== '#' && (
                <div className="flex items-baseline justify-between gap-4 py-2.5 border-b text-sm" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--text-3)' }}>Website</span>
                  <a href={stock.website} target="_blank" rel="noopener noreferrer"
                    className="font-semibold link text-right break-all">
                    {stock.website.replace('https://', '')}
                  </a>
                </div>
              )}
            </div>

            <div className="section-label mt-5 mb-2">Business divisions</div>
            <div className="flex flex-wrap gap-1.5">
              {stock.divisions.map((d, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--bg-3)', color: 'var(--text-2)' }}>
                  {d}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
