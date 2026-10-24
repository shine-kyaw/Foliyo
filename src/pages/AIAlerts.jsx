import { useState, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Bell, Brain, TrendingUp, TrendingDown, Search, Plus, X,
  Pause, Play, Trash2, Mail, Monitor, BellOff, Activity,
  Clock, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { stocks as allStocks } from '../data/mockData'
import { useApp } from '../context/AppContext'
import { useAlerts, requestBrowserNotifications, browserNotificationsState } from '../context/AlertsContext'
import { useSignals } from '../hooks/useSignals'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import PageHeader, { StatusPill } from '../components/PageHeader'

/* Pill-choice states, shared by every chip group on this page */
const PILL_ON  = { background:'var(--btn-bg)', color:'var(--btn-fg)', borderColor:'var(--btn-bg)' }
const PILL_OFF = { background:'transparent', color:'var(--text-2)', borderColor:'var(--border-light)' }
/* Filter pills use the quieter grey fill */
const FILTER_ON  = { background:'var(--bg-3)', color:'var(--text-1)', borderColor:'transparent' }
const FILTER_OFF = { background:'transparent', color:'var(--text-2)', borderColor:'transparent' }

const UP   = 'rgb(var(--up))'
const DOWN = 'rgb(var(--down))'
const tone = v => v >= 0 ? UP : DOWN

/* ── Config maps ─────────────────────────────────────────────── */
const ALERT_TYPES = [
  { key:'price_above',      label:'Price Above',  Icon:TrendingUp,   desc:'Notify when price exceeds a target' },
  { key:'price_below',      label:'Price Below',  Icon:TrendingDown, desc:'Notify when price drops below a target' },
  { key:'daily_move',       label:'Daily Move',   Icon:Activity,     desc:'Notify if daily movement exceeds X%' },
  { key:'sentiment_change', label:'Sentiment',    Icon:Brain,        desc:'Notify if the sentiment verdict changes' },
  { key:'news_event',       label:'Major News',   Icon:Bell,         desc:'Notify on significant news events' },
]
const NOTIF_METHODS = [
  { key:'email',     label:'Email',           Icon:Mail,    note:'Email alert' },
  { key:'browser',   label:'Browser',         Icon:Monitor, note:'Push notification' },
  { key:'both',      label:'Email + Browser', Icon:Bell,    note:'Both channels' },
  { key:'dashboard', label:'Dashboard Only',  Icon:BellOff, note:'No external alerts' },
]

/* ── Helpers ─────────────────────────────────────────────────── */
function conditionLabel(a) {
  switch (a.type) {
    case 'price_above':      return `Price exceeds $${a.targetValue}`
    case 'price_below':      return `Price drops below $${a.targetValue}`
    case 'daily_move':       return `Daily move exceeds ±${a.targetValue}%`
    case 'sentiment_change': return `Sentiment changes to ${a.targetSentiment || 'Bullish'}`
    case 'news_event':       return `Major news event for ${a.stock.symbol}`
    default: return 'Custom alert'
  }
}

function distanceLabel(a) {
  const cur = a.stock.price
  if (cur == null) return 'Waiting for price'
  if (a.type === 'price_above') {
    const d = ((a.targetValue - cur) / cur * 100)
    return d > 0 ? `+${d.toFixed(1)}% away` : 'Target reached'
  }
  if (a.type === 'price_below') {
    const d = ((cur - a.targetValue) / cur * 100)
    return d > 0 ? `−${d.toFixed(1)}% away` : 'Target reached'
  }
  if (a.type === 'daily_move') return `±${a.targetValue}% threshold`
  return 'Monitoring'
}

function fmtDateTime(iso) {
  try {
    return new Date(iso).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })
  } catch { return '' }
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
  } catch { return 'Unknown' }
}

/* ── Status badge ────────────────────────────────────────────── */
const STATUS_CFG = {
  active:    { tone:'live',   label:'Active'    },
  triggered: { tone:'accent', label:'Triggered' },
  paused:    { tone:'muted',  label:'Paused'    },
}

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.active
  return <StatusPill tone={c.tone}>{c.label}</StatusPill>
}

/* ── Notif icon ──────────────────────────────────────────────── */
function NotifIcon({ method }) {
  const m = NOTIF_METHODS.find(n => n.key === method) || NOTIF_METHODS[3]
  return <m.Icon size={13} style={{ color:'var(--text-3)' }} title={m.label}/>
}

/* ── Stock search autocomplete ───────────────────────────────── */
function StockSearchBox({ onSelect }) {
  const [q, setQ]           = useState('')
  const [focused, setFocused] = useState(false)

  const baseResults = q.trim().length >= 1
    ? allStocks.filter(s =>
        s.symbol.toLowerCase().includes(q.toLowerCase()) ||
        s.name.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 8)
    : []

  const { quotes } = useBatchQuotes(baseResults.map(s => s.symbol), 0)
  const results = baseResults.map(s => {
    const q2 = quotes[s.symbol]
    return q2
      ? { ...s, price: q2.price, change: q2.change, changePct: q2.changePct }
      : { ...s, price: null, change: null, changePct: null }
  })

  const pick = (s) => { onSelect(s); setQ(''); setFocused(false) }

  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'var(--text-3)' }}/>
      <input
        className="input pl-9 pr-9"
        aria-label="Search ticker or company"
        placeholder="Search ticker or company — e.g. AAPL, Tesla…"
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 160)}
      />
      {q && (
        <button className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--bg-3)] transition-colors"
          style={{ color:'var(--text-3)' }} onClick={() => setQ('')} aria-label="Clear search">
          <X size={13}/>
        </button>
      )}
      <AnimatePresence>
        {focused && results.length > 0 && (
          <motion.div
            initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:4 }}
            className="absolute left-0 right-0 mt-1.5 rounded-[10px] border overflow-hidden z-50"
            style={{ background:'var(--bg-2)', borderColor:'var(--border-light)', boxShadow:'0 8px 24px rgba(var(--shadow-color), .12)' }}>
            {results.map(s => (
              <button key={s.symbol} onMouseDown={() => pick(s)}
                className="asset-row w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left border-b last:border-0"
                style={{ borderColor:'var(--border)' }}>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold link">{s.symbol}</div>
                  <div className="text-xs truncate" style={{ color:'var(--text-3)' }}>{s.name}</div>
                </div>
                <div className="text-right num shrink-0">
                  <div className="text-[13px] font-bold" style={{ color: s.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
                    {s.price != null ? `$${s.price.toFixed(2)}` : '—'}
                  </div>
                  <div className="text-xs font-semibold" style={{ color: s.changePct == null ? 'var(--text-3)' : tone(s.changePct) }}>
                    {s.changePct != null ? `${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(2)}%` : '—'}
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* Small label above a group of choices */
const GroupLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-xs font-semibold mb-2" style={{ color:'var(--text-2)' }}>{children}</label>
)

/* ── Alert creation form ─────────────────────────────────────── */
function CreateAlertPanel({ stock, onSave, onCancel }) {
  const { user, accountConfig } = useApp()
  const hasPrice = stock.price != null
  const [alertType, setAlertType] = useState('price_above')
  const [targetVal,  setTargetVal] = useState(hasPrice ? String((stock.price * 1.1).toFixed(2)) : '')
  const [targetSent, setTargetSent] = useState('Bullish')
  const [notifMethod, setNotifMethod] = useState('browser')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Email goes out from the API, so it needs an account and a configured mailbox
  const emailReady = !!user && !!accountConfig?.emailAlerts
  const emailNote = !user ? 'Sign in to get alerts by email.' : !accountConfig?.emailAlerts ? 'Email alerts aren’t switched on yet.' : null
  const methodOk = m => emailReady || !['email', 'both'].includes(m)

  const handleCreate = async () => {
    setError('')
    const needsNum = ['price_above','price_below','daily_move'].includes(alertType)
    const value = parseFloat(targetVal)
    if (needsNum && !(value > 0)) { setError(alertType === 'daily_move' ? 'Enter a move size above 0%.' : 'Enter a target price above $0.'); return }
    setSaving(true)
    let finalMethod = notifMethod
    if (notifMethod === 'browser' || notifMethod === 'both') {
      const granted = await requestBrowserNotifications()
      if (!granted) finalMethod = notifMethod === 'both' ? 'email' : 'dashboard'
    }
    try {
      await onSave({
        stock: { symbol: stock.symbol, name: stock.name, price: stock.price ?? null },
        type: alertType,
        targetValue: needsNum ? value : null,
        targetSentiment: alertType === 'sentiment_change' ? targetSent : null,
        notifMethod: finalMethod,
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const needsValue   = ['price_above','price_below','daily_move'].includes(alertType)
  const needsSentiment = alertType === 'sentiment_change'

  return (
    <motion.div
      initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}
      className="space-y-5">

      {/* Stock header */}
      <div className="flex items-center gap-3 rounded-[10px] px-3 py-2.5" style={{ background:'var(--bg-1)' }}>
        <div className="min-w-0 flex-1">
          <Link to={`/stock/${stock.symbol}`} className="font-bold text-[15px] link">{stock.symbol}</Link>
          <div className="text-xs truncate" style={{ color:'var(--text-3)' }}>{stock.name}</div>
        </div>
        <div className="text-right num">
          <div className="font-bold text-[15px]" style={{ color:'var(--text-1)' }}>{hasPrice ? `$${stock.price.toFixed(2)}` : '—'}</div>
          {stock.changePct != null && (
            <div className="text-xs font-semibold" style={{ color:tone(stock.changePct) }}>
              {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}% today
            </div>
          )}
        </div>
        <button onClick={onCancel} aria-label="Cancel" className="p-1.5 rounded-full hover:bg-[var(--bg-3)] transition-colors"
          style={{ color:'var(--text-3)' }}>
          <X size={15}/>
        </button>
      </div>

      {/* Alert type */}
      <div>
        <GroupLabel>Alert condition</GroupLabel>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Alert condition">
          {ALERT_TYPES.map(t => (
            <button key={t.key} onClick={() => setAlertType(t.key)} aria-pressed={alertType === t.key}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[13px] font-semibold transition-colors"
              style={alertType === t.key ? PILL_ON : PILL_OFF}>
              <t.Icon size={13}/>
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color:'var(--text-3)' }}>
          {ALERT_TYPES.find(t => t.key === alertType)?.desc}
        </p>
      </div>

      {/* Target value */}
      {needsValue && (
        <div>
          <GroupLabel htmlFor="alert-target">
            {alertType === 'daily_move' ? 'Movement threshold (%)' : 'Target price ($)'}
          </GroupLabel>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm"
              style={{ color:'var(--text-3)' }}>
              {alertType === 'daily_move' ? '±' : '$'}
            </span>
            <input
              id="alert-target" type="number" step="0.01" min="0"
              className="input pl-8 num"
              value={targetVal}
              onChange={e => setTargetVal(e.target.value)}
              placeholder={alertType === 'daily_move' ? '5' : hasPrice ? stock.price.toFixed(2) : '0.00'}
            />
          </div>
          {alertType === 'price_above' && hasPrice && parseFloat(targetVal) > 0 && (
            <p className="text-xs mt-1.5 num" style={{ color:'var(--text-3)' }}>
              {((parseFloat(targetVal) - stock.price) / stock.price * 100).toFixed(1)}% above current price
            </p>
          )}
          {alertType === 'price_below' && hasPrice && parseFloat(targetVal) > 0 && (
            <p className="text-xs mt-1.5 num" style={{ color:'var(--text-3)' }}>
              {((stock.price - parseFloat(targetVal)) / stock.price * 100).toFixed(1)}% below current price
            </p>
          )}
        </div>
      )}

      {/* Sentiment target */}
      {needsSentiment && (
        <div>
          <GroupLabel>Trigger when sentiment changes to</GroupLabel>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Target sentiment">
            {['Bullish','Neutral','Bearish'].map(s => (
              <button key={s} onClick={() => setTargetSent(s)} aria-pressed={targetSent === s}
                className="px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-colors"
                style={targetSent === s
                  ? s === 'Bullish' ? { background:'rgb(var(--up) / .1)', borderColor:'rgb(var(--up) / .4)', color:UP }
                    : s === 'Bearish' ? { background:'rgb(var(--down) / .1)', borderColor:'rgb(var(--down) / .4)', color:DOWN }
                    : { background:'rgb(var(--caution) / .1)', borderColor:'rgb(var(--caution) / .4)', color:'rgb(var(--caution))' }
                  : PILL_OFF
                }>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notification method */}
      <div>
        <GroupLabel>Notification method</GroupLabel>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Notification method">
          {NOTIF_METHODS.map(m => (
            <button key={m.key} onClick={() => setNotifMethod(m.key)} disabled={!methodOk(m.key)}
              aria-pressed={notifMethod === m.key}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={notifMethod === m.key ? PILL_ON : PILL_OFF}>
              <m.Icon size={13}/>
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2 leading-relaxed" style={{ color:'var(--text-3)' }}>
          {notifMethod === 'dashboard'
            ? 'Shows on this page and as a notice inside Foliyo.'
            : notifMethod === 'email'
            ? 'Emailed to your account address when it triggers, even while Foliyo is closed.'
            : browserNotificationsState() === 'denied'
            ? 'Your browser is blocking notifications from Foliyo — allow them in site settings, or pick another option.'
            : 'Your browser will ask to allow notifications. They appear while Foliyo is open in a tab.'}
          {emailNote && <> {emailNote}</>}
        </p>
      </div>

      {error && <p role="alert" className="text-xs font-medium" style={{ color:DOWN }}>{error}</p>}

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={handleCreate} disabled={saving}
          className="btn-primary flex-1 justify-center">
          <Plus size={14}/>
          {saving ? 'Creating…' : 'Create alert'}
        </button>
        <button onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
      </div>
    </motion.div>
  )
}

/* ── Alert card ──────────────────────────────────────────────── */
function Metric({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs" style={{ color:'var(--text-3)' }}>{label}</dt>
      <dd className="text-sm font-semibold num mt-0.5">{children}</dd>
    </div>
  )
}

function AlertCard({ alert, onPause, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      className="card-flat !p-4 sm:!p-5">

      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link to={`/stock/${alert.stock.symbol}`} className="font-bold text-[15px] link">
              {alert.stock.symbol}
            </Link>
            <span className="text-sm truncate" style={{ color:'var(--text-3)' }}>{alert.stock.name}</span>
            <StatusBadge status={alert.status}/>
          </div>
          <p className="text-sm font-semibold mt-1.5" style={{ color:'var(--text-1)' }}>
            {conditionLabel(alert)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 -mr-1.5 -mt-1">
          {alert.status !== 'triggered' && (
            <button onClick={() => onPause(alert.id)}
              className="p-2 rounded-full transition-colors hover:bg-[var(--bg-3)]"
              title={alert.status === 'paused' ? 'Resume' : 'Pause'}
              aria-label={alert.status === 'paused' ? 'Resume alert' : 'Pause alert'}
              style={{ color:'var(--text-2)' }}>
              {alert.status === 'paused' ? <Play size={15}/> : <Pause size={15}/>}
            </button>
          )}
          <button onClick={() => onDelete(alert.id)} aria-label="Delete alert"
            className="p-2 rounded-full transition-colors hover:bg-[rgb(var(--down)/.1)]"
            style={{ color:'var(--text-2)' }}>
            <Trash2 size={15}/>
          </button>
        </div>
      </div>

      {alert.status === 'triggered' && alert.triggerNote && (
        <div className="mt-3 rounded-[10px] px-3.5 py-3 text-sm flex items-center justify-between gap-3 flex-wrap" role="status"
          style={{ background:'var(--bg-1)', borderLeft:'3px solid var(--brand)', color:'var(--text-1)' }}>
          <p>
            <span className="font-semibold">Triggered {fmtDateTime(alert.triggeredAt)}</span> — {alert.triggerNote}.
            {alert.emailedAt && <span style={{ color:'var(--text-3)' }}> Emailed.</span>}
          </p>
          <button onClick={() => onPause(alert.id)} className="btn-ghost !py-1.5 !px-3.5 !text-xs">
            Watch again
          </button>
        </div>
      )}

      {/* Metrics strip */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mt-4 pt-3 border-t" style={{ borderColor:'var(--border)' }}>
        <Metric label="Current">
          <span style={{ color:'var(--text-1)' }}>
            {alert.stock.price != null ? `$${Number(alert.stock.price).toFixed(2)}` : '—'}
          </span>
        </Metric>
        {(alert.type === 'price_above' || alert.type === 'price_below') && (
          <Metric label="Target"><span style={{ color:'var(--text-1)' }}>${alert.targetValue}</span></Metric>
        )}
        <Metric label="Distance"><span style={{ color:'var(--text-2)' }}>{distanceLabel(alert)}</span></Metric>
        <Metric label="Notify">
          <span className="inline-flex items-center gap-1.5">
            <NotifIcon method={alert.notifMethod}/>
            <span className="font-normal capitalize" style={{ color:'var(--text-2)' }}>
              {NOTIF_METHODS.find(m => m.key === alert.notifMethod)?.label || alert.notifMethod}
            </span>
          </span>
        </Metric>
      </dl>

      {/* Expand footer */}
      <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded}
        className="mt-3 w-full flex items-center gap-1.5 text-xs font-semibold hover:underline"
        style={{ color:'var(--link)' }}>
        {expanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
        {expanded ? 'Less' : 'Details'}
        <span className="ml-auto flex items-center gap-1 font-normal num" style={{ color:'var(--text-3)' }}>
          <Clock size={11}/>
          Created {fmtDate(alert.createdAt)}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            className="overflow-hidden">
            <div className="pt-3 border-t mt-3" style={{ borderColor:'var(--border)' }}>
              <div className="text-xs leading-relaxed" style={{ color:'var(--text-3)' }}>
                <span className="font-semibold" style={{ color:'var(--text-2)' }}>Alert type:</span>{' '}
                {ALERT_TYPES.find(t => t.key === alert.type)?.desc}
                {alert.type === 'daily_move' && ` — threshold: ±${alert.targetValue}%`}
                {alert.type === 'sentiment_change' && ` — watching for ${alert.targetSentiment}`}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Signals — today's quotes run through the rule-based analysis ── */
function AISignalsTab() {
  const { signals, loading, lastUpdated } = useSignals()
  const [filter, setFilter] = useState('All')
  const [expanded, setExpanded] = useState(null)

  const typeStyle = {
    BUY:  { color:'rgb(var(--up))',      bg:'rgb(var(--up) / .1)'      },
    SELL: { color:'rgb(var(--down))',    bg:'rgb(var(--down) / .1)'    },
    HOLD: { color:'rgb(var(--caution))', bg:'rgb(var(--caution) / .1)' },
  }
  const counts = {
    BUY:  signals.filter(a => a.type==='BUY').length,
    SELL: signals.filter(a => a.type==='SELL').length,
    HOLD: signals.filter(a => a.type==='HOLD').length,
  }
  const filtered = filter === 'All' ? signals : signals.filter(a => a.type === filter)

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed max-w-3xl" style={{ color:'var(--text-2)' }}>
        Each US large cap is scored on today’s live move (up to ±2) and its P/E (±1). A total of +1 or more reads Buy,
        −1 or less reads Sell, anything else Hold. It’s a quick screen, not a recommendation.
        {lastUpdated && <span className="num" style={{ color:'var(--text-3)' }}> Prices as of {new Date(lastUpdated).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })}.</span>}
      </p>

      {/* Filter pills with counts */}
      <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Filter signals">
        <button onClick={() => setFilter('All')} aria-pressed={filter === 'All'}
          className="text-[13px] px-3.5 py-1.5 rounded-full font-semibold border transition-colors"
          style={filter === 'All' ? FILTER_ON : FILTER_OFF}>
          All <span className="num ml-1" style={{ color:'var(--text-3)' }}>{signals.length}</span>
        </button>
        {[
          { type:'BUY',  label:'Buy'  },
          { type:'SELL', label:'Sell' },
          { type:'HOLD', label:'Hold' },
        ].map(s => (
          <button key={s.type}
            onClick={() => setFilter(filter === s.type ? 'All' : s.type)}
            aria-pressed={filter === s.type}
            className="text-[13px] px-3.5 py-1.5 rounded-full font-semibold border transition-colors"
            style={filter === s.type ? FILTER_ON : FILTER_OFF}>
            <span style={{ color:typeStyle[s.type].color }}>{s.label}</span>
            <span className="num ml-1" style={{ color:'var(--text-3)' }}>{counts[s.type]}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-2">{[0,1,2,3,4].map(i => <div key={i} className="h-12 rounded-lg shimmer"/>)}</div>
      )}
      {!loading && !signals.length && (
        <div className="text-center py-14 text-sm" style={{ color:'var(--text-3)' }}>
          No live prices yet, so there’s nothing to score. Refresh prices from the top bar in a minute.
        </div>
      )}

      {/* Screener table */}
      {filtered.length > 0 && (
        <div className="overflow-x-auto border-t" style={{ borderColor:'var(--border)' }}>
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b" style={{ borderColor:'var(--border)' }}>
                {['Signal','Symbol','Name','Price','Change %','Score',''].map((h, i) => (
                  <th key={h || 'why'} scope="col" className={`th whitespace-nowrap ${i < 3 ? 'text-left' : 'text-right'}`}>
                    {h || <span className="sr-only">Reasoning</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(sig => {
                const ts = typeStyle[sig.type]
                const isExp = expanded === sig.id
                return (
                  <Fragment key={sig.id}>
                    <tr className="asset-row border-b cursor-pointer" style={{ borderColor:'var(--border)' }}
                      onClick={() => setExpanded(isExp ? null : sig.id)}>
                      <td className="td">
                        <span className="text-[11px] font-bold tracking-wider px-2 py-1 rounded inline-block w-12 text-center"
                          style={{ background:ts.bg, color:ts.color }}>
                          {sig.type}
                        </span>
                      </td>
                      <td className="td">
                        <Link to={`/stock/${sig.symbol}`} onClick={e => e.stopPropagation()}
                          className="font-bold text-[13px] link">{sig.symbol}</Link>
                      </td>
                      <td className="td">
                        <div className="text-[13px] truncate max-w-[240px]" style={{ color:'var(--text-1)' }}>{sig.name}</div>
                        {sig.sector && <div className="text-xs" style={{ color:'var(--text-3)' }}>{sig.sector}</div>}
                      </td>
                      <td className="td text-right num font-bold whitespace-nowrap">${sig.price.toFixed(2)}</td>
                      <td className="td text-right num font-semibold whitespace-nowrap" style={{ color:tone(sig.changePct) }}>
                        {sig.changePct >= 0 ? '+' : '−'}{Math.abs(sig.changePct).toFixed(2)}%
                      </td>
                      <td className="td text-right num font-bold whitespace-nowrap" style={{ color:ts.color }}>
                        {sig.score > 0 ? '+' : ''}{sig.score}
                      </td>
                      <td className="td text-right whitespace-nowrap">
                        <button onClick={e => { e.stopPropagation(); setExpanded(isExp ? null : sig.id) }}
                          aria-expanded={isExp}
                          className="inline-flex items-center gap-1 text-xs font-semibold hover:underline" style={{ color:'var(--link)' }}>
                          {isExp ? 'Hide reasoning' : 'Why this call'}
                          {isExp ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                        </button>
                      </td>
                    </tr>
                    {isExp && (
                      <tr className="border-b" style={{ borderColor:'var(--border)', background:'var(--bg-1)' }}>
                        <td colSpan={7} className="px-4 py-4">
                          {/* Score bar: −3 … +3 */}
                          <div className="flex items-center gap-3 mb-4 max-w-sm">
                            <span className="text-xs num" style={{ color:'var(--text-3)' }}>−3</span>
                            <div className="relative h-1.5 rounded-full overflow-hidden flex-1" style={{ background:'var(--bg-3)' }}
                              role="img" aria-label={`Score ${sig.score} on a scale from −3 to +3`}>
                              <span className="absolute top-0 bottom-0 w-px left-1/2" style={{ background:'var(--border-light)' }}/>
                              <span className="absolute top-0 bottom-0 rounded-full"
                                style={{ background:ts.color, left: sig.score >= 0 ? '50%' : `${50 + sig.score / 6 * 100}%`, width:`${Math.abs(sig.score) / 6 * 100}%` }}/>
                            </div>
                            <span className="text-xs num" style={{ color:'var(--text-3)' }}>+3</span>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-6 text-sm">
                            <div>
                              <div className="section-label mb-2">In its favour</div>
                              <ul className="space-y-1.5" style={{ color:'var(--text-2)' }}>
                                {sig.reasons.map(r => <li key={r}>{r}</li>)}
                              </ul>
                            </div>
                            <div>
                              <div className="section-label mb-2">Risks</div>
                              <ul className="space-y-1.5" style={{ color:'var(--text-2)' }}>
                                {sig.risks.map(r => <li key={r}>{r}</li>)}
                              </ul>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────── */
export default function AIAlerts() {
  const [tab, setTab]           = useState('my-alerts')
  const { alerts, addAlert, togglePause, removeAlert, loading: alertsLoading, error: alertsError, signedIn } = useAlerts()
  const { signals } = useSignals()
  const [creating, setCreating] = useState(false)
  const [selectedStock, setSelected] = useState(null)
  const [alertFilter, setAlertFilter] = useState('all')

  const handleAddStock = (stock) => { setSelected(stock); setCreating(true) }

  const handleSave = async (draft) => {
    await addAlert(draft)        // throws with a readable message; the panel shows it
    setCreating(false)
    setSelected(null)
  }

  const [actionError, setActionError] = useState('')
  const guard = fn => async id => { setActionError(''); try { await fn(id) } catch (e) { setActionError(e.message) } }
  const handlePause  = guard(togglePause)
  const handleDelete = guard(removeAlert)

  const FILTERS = [
    { key:'all',       label:'All' },
    { key:'active',    label:'Active' },
    { key:'triggered', label:'Triggered' },
    { key:'paused',    label:'Paused' },
    { key:'price',     label:'Price Alerts' },
    { key:'sentiment', label:'Sentiment' },
    { key:'news',      label:'News' },
  ]

  const visibleAlerts = alerts.filter(a => {
    if (alertFilter === 'active')    return a.status === 'active'
    if (alertFilter === 'triggered') return a.status === 'triggered'
    if (alertFilter === 'paused')    return a.status === 'paused'
    if (alertFilter === 'price')     return a.type === 'price_above' || a.type === 'price_below'
    if (alertFilter === 'sentiment') return a.type === 'sentiment_change'
    if (alertFilter === 'news')      return a.type === 'news_event'
    return true
  })

  const activeCnt   = alerts.filter(a => a.status === 'active').length
  const pausedCnt   = alerts.filter(a => a.status === 'paused').length
  const triggeredCnt = alerts.filter(a => a.status === 'triggered').length

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6 page-enter">

      <PageHeader title="AI Alerts"
        subtitle="Get told when a stock hits your price, moves sharply, changes outlook or makes news — and see today’s rule-based buy, sell and hold screen.">
        <StatusPill tone="muted">{activeCnt} active</StatusPill>
      </PageHeader>

      {/* Underline tabs */}
      <div className="flex gap-6 border-b" role="tablist" aria-label="Alerts and signals" style={{ borderColor:'var(--border)' }}>
        {[
          { key:'my-alerts', label:'My alerts', badge: alerts.length },
          { key:'ai-signals', label:'Signals', badge: signals.length },
        ].map(t => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-2 pb-3 -mb-px text-[15px] font-semibold border-b-[3px] transition-colors"
            style={{
              color: tab === t.key ? 'var(--text-1)' : 'var(--text-2)',
              borderColor: tab === t.key ? 'var(--brand)' : 'transparent',
            }}>
            {t.label}
            <span className="text-xs num font-semibold" style={{ color:'var(--text-3)' }}>{t.badge}</span>
          </button>
        ))}
      </div>

      {/* ── My Alerts tab ── */}
      {tab === 'my-alerts' && (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">

          {/* Create flow — first on phones, right rail on desktop */}
          <aside className="order-first lg:order-last space-y-3 min-w-0">
            <section aria-label="Create new alert" className="card-flat space-y-4">
              <h2 className="section-title">Create new alert</h2>
              {!creating ? (
                <StockSearchBox onSelect={handleAddStock}/>
              ) : (
                <AnimatePresence>
                  <CreateAlertPanel
                    stock={selectedStock}
                    onSave={handleSave}
                    onCancel={() => { setCreating(false); setSelected(null) }}
                  />
                </AnimatePresence>
              )}
            </section>
            <p className="text-xs leading-relaxed" style={{ color:'var(--text-3)' }}>
              {signedIn
                ? 'Your alerts are saved to your account and checked every minute by Foliyo’s server, even while this tab is closed.'
                : 'Alerts are saved in this browser and checked every minute while Foliyo is open. Sign in to have them checked in the background and sent by email.'}
            </p>
          </aside>

          <div className="min-w-0 space-y-5">
            {(alertsError || actionError) && (
              <p role="alert" className="text-xs font-medium" style={{ color:DOWN }}>{actionError || alertsError}</p>
            )}

            {/* Stats — big figures split by thin rules */}
            <dl className="grid grid-cols-3 gap-px border-y" style={{ background:'var(--border)', borderColor:'var(--border)' }}>
              {[
                { label:'Active',    count:activeCnt,    color:UP },
                { label:'Paused',    count:pausedCnt,    color:'var(--text-1)' },
                { label:'Triggered', count:triggeredCnt, color:'var(--text-1)' },
              ].map((s, i) => (
                <div key={s.label} className={`py-3.5 px-4 sm:px-6 ${i === 0 ? 'pl-0 sm:pl-0' : ''}`} style={{ background:'var(--bg-0)' }}>
                  <dt className="text-xs font-semibold" style={{ color:'var(--text-3)' }}>{s.label}</dt>
                  <dd className="text-[1.6rem] sm:text-[1.85rem] font-bold leading-tight num" style={{ color:s.color }}>{s.count}</dd>
                </div>
              ))}
            </dl>

            {/* Filter pills */}
            <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Filter alerts">
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setAlertFilter(f.key)} aria-pressed={alertFilter === f.key}
                  className="text-[13px] px-3.5 py-1.5 rounded-full font-semibold border transition-colors"
                  style={alertFilter === f.key ? FILTER_ON : FILTER_OFF}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Alert cards */}
            <div className="space-y-3">
              <AnimatePresence>
                {visibleAlerts.map(a => (
                  <AlertCard key={a.id} alert={a} onPause={handlePause} onDelete={handleDelete}/>
                ))}
              </AnimatePresence>
              {visibleAlerts.length === 0 && alertsLoading && (
                <div className="h-28 rounded-[10px] shimmer"/>
              )}
              {visibleAlerts.length === 0 && !alertsLoading && (
                <div className="py-14 border-t" style={{ color:'var(--text-3)', borderColor:'var(--border)' }}>
                  <p className="text-sm font-semibold" style={{ color:'var(--text-2)' }}>
                    {alertFilter === 'all' ? 'No alerts yet' : `No ${FILTERS.find(f => f.key === alertFilter)?.label.toLowerCase()} alerts`}
                  </p>
                  <p className="text-sm mt-1">
                    {alertFilter === 'all' ? 'Use Create new alert to search for a stock and set your first alert.' : 'Pick another filter, or use Create new alert to add one.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AI Signals tab ── */}
      {tab === 'ai-signals' && <AISignalsTab/>}

      {/* Disclaimer */}
      <p className="text-xs leading-relaxed border-t pt-4" style={{ borderColor:'var(--border)', color:'var(--text-3)' }}>
        <AlertTriangle size={11} className="inline mr-1.5 -mt-0.5"/>
        <span className="font-semibold" style={{ color:'var(--text-2)' }}>Not financial advice.</span>{' '}
        Alerts and signals come from live prices and simple rules. They can be delayed or wrong; check before you act.
      </p>
    </div>
  )
}
