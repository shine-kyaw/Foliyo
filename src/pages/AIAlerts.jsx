import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Bell, Brain, TrendingUp, TrendingDown, Search, Plus, X,
  Pause, Play, Trash2, Mail, Monitor, BellOff, Activity,
  Clock, AlertTriangle, Minus, Target,
  Shield, ChevronDown, ChevronUp,
} from 'lucide-react'
import { stocks as allStocks } from '../data/mockData'
import { useApp } from '../context/AppContext'
import { useAlerts, requestBrowserNotifications, browserNotificationsState } from '../context/AlertsContext'
import { useSignals } from '../hooks/useSignals'
import { useBatchQuotes } from '../hooks/useBatchQuotes'
import PageHeader, { StatusPill } from '../components/PageHeader'

/* Segmented-control states, shared by every tab/chip group on this page */
const SEG_ON  = { background:'rgba(var(--accent-rgb),.12)', color:'var(--text-1)', borderColor:'rgba(var(--accent-rgb),.25)' }
const SEG_OFF = { background:'transparent', color:'var(--text-2)', borderColor:'var(--border)' }

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
      <div className="relative flex items-center rounded-lg border overflow-hidden transition-all"
        style={{
          background:'var(--bg-2)',
          borderColor: focused ? 'rgba(var(--accent-rgb),.5)' : 'var(--border)',
          boxShadow: focused ? `0 0 0 3px rgba(var(--accent-rgb),.08)` : 'none',
        }}>
        <Search size={14} className="ml-3.5 shrink-0" style={{ color:'var(--text-3)' }}/>
        <input
          className="flex-1 bg-transparent text-sm px-3 py-3 outline-none"
          style={{ color:'var(--text-1)' }}
          aria-label="Search ticker or company"
          placeholder="Search ticker or company — e.g. AAPL, Tesla…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 160)}
        />
        {q && (
          <button className="mr-3 opacity-50 hover:opacity-100 transition-opacity text-xs"
            style={{ color:'var(--text-3)' }} onClick={() => setQ('')} aria-label="Clear search">
            <X size={13}/>
          </button>
        )}
      </div>
      <AnimatePresence>
        {focused && results.length > 0 && (
          <motion.div
            initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:4 }}
            className="absolute left-0 right-0 mt-1.5 rounded-lg border shadow-2xl overflow-hidden z-50"
            style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
            {results.map(s => (
              <button key={s.symbol} onMouseDown={() => pick(s)}
                className="w-full flex items-center justify-between px-4 py-3 text-left border-b last:border-0 transition-colors"
                style={{ borderColor:'var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-black shrink-0"
                    style={{ background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)' }}>
                    {s.symbol.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color:'var(--text-1)' }}>{s.symbol}</div>
                    <div className="text-xs truncate max-w-[180px]" style={{ color:'var(--text-3)' }}>{s.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-semibold" style={{ color: s.price != null ? 'var(--text-1)' : 'var(--text-3)' }}>
                    {s.price != null ? `$${s.price.toFixed(2)}` : '—'}
                  </div>
                  <div className={`text-xs font-bold font-mono ${s.changePct == null ? '' : s.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                    style={s.changePct == null ? { color:'var(--text-3)' } : undefined}>
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
      className="rounded-xl border p-5 space-y-5"
      style={{ background:'var(--bg-2)', borderColor:`rgba(var(--accent-rgb),.25)` }}>

      {/* Stock header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm"
            style={{ background:`rgba(var(--accent-rgb),.12)`, color:'var(--accent)' }}>
            {stock.symbol.charAt(0)}
          </div>
          <div>
            <div className="font-black" style={{ color:'var(--text-1)' }}>{stock.symbol}</div>
            <div className="text-xs" style={{ color:'var(--text-3)' }}>{stock.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold" style={{ color:'var(--text-1)' }}>{hasPrice ? `$${stock.price.toFixed(2)}` : '—'}</div>
          {stock.changePct != null && (
            <div className={`text-xs font-bold font-mono ${stock.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}% today
            </div>
          )}
        </div>
        <button onClick={onCancel} aria-label="Cancel" className="ml-3 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color:'var(--text-3)' }}>
          <X size={15}/>
        </button>
      </div>

      {/* Alert type */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color:'var(--text-3)' }}>Alert Condition</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALERT_TYPES.map(t => (
            <button key={t.key} onClick={() => setAlertType(t.key)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all"
              style={alertType === t.key ? SEG_ON : SEG_OFF}>
              <t.Icon size={13} style={alertType === t.key ? { color:'var(--accent)' } : undefined}/>
              <span className="text-xs font-semibold">{t.label}</span>
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
          <label htmlFor="alert-target" className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>
            {alertType === 'daily_move' ? 'Movement Threshold (%)' : 'Target Price ($)'}
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm"
              style={{ color:'var(--text-3)' }}>
              {alertType === 'daily_move' ? '±' : '$'}
            </span>
            <input
              id="alert-target" type="number" step="0.01" min="0"
              className="input text-sm pl-8 py-2.5 w-full font-mono"
              value={targetVal}
              onChange={e => setTargetVal(e.target.value)}
              placeholder={alertType === 'daily_move' ? '5' : hasPrice ? stock.price.toFixed(2) : '0.00'}
            />
          </div>
          {alertType === 'price_above' && hasPrice && parseFloat(targetVal) > 0 && (
            <p className="text-xs mt-1.5 font-mono" style={{ color:'var(--text-3)' }}>
              {((parseFloat(targetVal) - stock.price) / stock.price * 100).toFixed(1)}% above current price
            </p>
          )}
          {alertType === 'price_below' && hasPrice && parseFloat(targetVal) > 0 && (
            <p className="text-xs mt-1.5 font-mono" style={{ color:'var(--text-3)' }}>
              {((stock.price - parseFloat(targetVal)) / stock.price * 100).toFixed(1)}% below current price
            </p>
          )}
        </div>
      )}

      {/* Sentiment target */}
      {needsSentiment && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>Trigger When Sentiment Changes To</div>
          <div className="flex gap-2">
            {['Bullish','Neutral','Bearish'].map(s => (
              <button key={s} onClick={() => setTargetSent(s)}
                className="flex-1 py-2 rounded-lg text-xs font-bold border transition-all"
                style={targetSent === s
                  ? s === 'Bullish' ? { background:'rgb(var(--up) / .12)', borderColor:'rgb(var(--up) / .3)', color:'rgb(var(--up))' }
                    : s === 'Bearish' ? { background:'rgb(var(--down) / .12)', borderColor:'rgb(var(--down) / .3)', color:'rgb(var(--down))' }
                    : { background:'rgb(var(--caution) / .12)', borderColor:'rgb(var(--caution) / .3)', color:'rgb(var(--caution))' }
                  : SEG_OFF
                }>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notification method */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color:'var(--text-3)' }}>Notification Method</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {NOTIF_METHODS.map(m => (
            <button key={m.key} onClick={() => setNotifMethod(m.key)} disabled={!methodOk(m.key)}
              className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={notifMethod === m.key ? SEG_ON : SEG_OFF}>
              <m.Icon size={15} style={notifMethod === m.key ? { color:'var(--accent)' } : undefined}/>
              <span className="text-xs font-semibold text-center leading-tight">{m.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color:'var(--text-3)' }}>
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

      {error && <p role="alert" className="text-xs text-red-400 font-medium">{error}</p>}

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={handleCreate} disabled={saving}
          className="btn-primary flex-1 py-2.5 justify-center text-sm">
          <Plus size={14}/>
          {saving ? 'Creating…' : 'Create alert'}
        </button>
        <button onClick={onCancel}
          className="btn-ghost px-5 py-2.5 text-sm">
          Cancel
        </button>
      </div>
    </motion.div>
  )
}

/* ── Alert card ──────────────────────────────────────────────── */
function AlertCard({ alert, onPause, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      className="card-flat">

      {/* Top row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
            style={{ background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)' }}>
            {alert.stock.symbol.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/stock/${alert.stock.symbol}`}
                className="font-black text-sm hover:text-accent transition-colors"
                style={{ color:'var(--text-1)' }}>
                {alert.stock.symbol}
              </Link>
              <StatusBadge status={alert.status}/>
            </div>
            <div className="text-xs" style={{ color:'var(--text-3)' }}>{alert.stock.name}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {alert.status !== 'triggered' && (
            <button onClick={() => onPause(alert.id)}
              className="p-2 rounded-lg transition-all hover:bg-white/5"
              title={alert.status === 'paused' ? 'Resume' : 'Pause'}
              aria-label={alert.status === 'paused' ? 'Resume alert' : 'Pause alert'}
              style={{ color:'var(--text-3)' }}>
              {alert.status === 'paused' ? <Play size={14}/> : <Pause size={14}/>}
            </button>
          )}
          <button onClick={() => onDelete(alert.id)} aria-label="Delete alert"
            className="p-2 rounded-lg transition-all hover:bg-red-400/10"
            style={{ color:'var(--text-3)' }}>
            <Trash2 size={14}/>
          </button>
        </div>
      </div>

      {/* Condition row */}
      <div className="mt-3 rounded-lg p-3 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
        <p className="text-sm font-medium" style={{ color:'var(--text-2)' }}>
          {conditionLabel(alert)}
        </p>
      </div>

      {alert.status === 'triggered' && alert.triggerNote && (
        <div className="mt-2 rounded-lg p-3 border text-sm" role="status"
          style={{ background:'rgba(var(--accent-rgb),.07)', borderColor:'rgba(var(--accent-rgb),.25)', color:'var(--text-1)' }}>
          <span className="font-semibold">Triggered {fmtDateTime(alert.triggeredAt)}</span> — {alert.triggerNote}.
          {alert.emailedAt && <span style={{ color:'var(--text-3)' }}> Emailed.</span>}
          <button onClick={() => onPause(alert.id)} className="block mt-1.5 text-xs font-semibold hover:underline" style={{ color:'var(--accent)' }}>
            Watch again
          </button>
        </div>
      )}

      {/* Metrics strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        <div className="rounded-lg p-2.5 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
          <div className="text-xs mb-0.5" style={{ color:'var(--text-3)' }}>Current</div>
          <div className="text-sm font-mono font-bold" style={{ color:'var(--text-1)' }}>
            {alert.stock.price != null ? `$${Number(alert.stock.price).toFixed(2)}` : '—'}
          </div>
        </div>
        {(alert.type === 'price_above' || alert.type === 'price_below') && (
          <div className="rounded-lg p-2.5 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
            <div className="text-xs mb-0.5" style={{ color:'var(--text-3)' }}>Target</div>
            <div className="text-sm font-mono font-bold" style={{ color:'var(--accent)' }}>
              ${alert.targetValue}
            </div>
          </div>
        )}
        <div className="rounded-lg p-2.5 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
          <div className="text-xs mb-0.5" style={{ color:'var(--text-3)' }}>Distance</div>
          <div className="text-sm font-semibold font-mono" style={{ color:'var(--text-2)' }}>
            {distanceLabel(alert)}
          </div>
        </div>
        <div className="rounded-lg p-2.5 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
          <div className="text-xs mb-0.5" style={{ color:'var(--text-3)' }}>Notify</div>
          <div className="flex items-center gap-1.5">
            <NotifIcon method={alert.notifMethod}/>
            <span className="text-xs capitalize" style={{ color:'var(--text-2)' }}>
              {NOTIF_METHODS.find(m => m.key === alert.notifMethod)?.label || alert.notifMethod}
            </span>
          </div>
        </div>
      </div>

      {/* Expand footer */}
      <button onClick={() => setExpanded(!expanded)}
        className="mt-3 flex items-center gap-1.5 text-xs hover:text-accent transition-colors"
        style={{ color:'var(--text-3)' }}>
        {expanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
        {expanded ? 'Less' : 'Details'}
        <span className="ml-auto flex items-center gap-1 font-mono">
          <Clock size={10}/>
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
    BUY:  { color:'rgb(var(--up))',      bg:'rgb(var(--up) / .1)',      border:'rgb(var(--up) / .2)',      Icon:TrendingUp   },
    SELL: { color:'rgb(var(--down))',    bg:'rgb(var(--down) / .1)',    border:'rgb(var(--down) / .2)',    Icon:TrendingDown },
    HOLD: { color:'rgb(var(--caution))', bg:'rgb(var(--caution) / .1)', border:'rgb(var(--caution) / .2)', Icon:Minus        },
  }
  const counts = {
    BUY:  signals.filter(a => a.type==='BUY').length,
    SELL: signals.filter(a => a.type==='SELL').length,
    HOLD: signals.filter(a => a.type==='HOLD').length,
  }
  const filtered = filter === 'All' ? signals : signals.filter(a => a.type === filter)

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed" style={{ color:'var(--text-2)' }}>
        Each US large cap is scored on today’s live move (up to ±2) and its P/E (±1). A total of +1 or more reads Buy,
        −1 or less reads Sell, anything else Hold. It’s a quick screen, not a recommendation.
        {lastUpdated && <span className="font-mono" style={{ color:'var(--text-3)' }}> Prices as of {new Date(lastUpdated).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })}.</span>}
      </p>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { type:'BUY',  label:'Buy'  },
          { type:'SELL', label:'Sell' },
          { type:'HOLD', label:'Hold' },
        ].map(s => {
          const ts = typeStyle[s.type]
          return (
            <button key={s.type}
              onClick={() => setFilter(filter === s.type ? 'All' : s.type)}
              aria-pressed={filter === s.type}
              className="rounded-xl p-4 text-center border transition-colors"
              style={{ background:filter===s.type?ts.bg:'var(--bg-2)', borderColor:filter===s.type?ts.border:'var(--border)' }}>
              <div className="text-3xl font-black font-mono" style={{ color:ts.color }}>{counts[s.type]}</div>
              <div className="text-xs font-semibold mt-1" style={{ color:ts.color }}>{s.label}</div>
            </button>
          )
        })}
      </div>

      {loading && (
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="h-24 rounded-xl shimmer"/>)}</div>
      )}
      {!loading && !signals.length && (
        <div className="text-center py-14 text-sm" style={{ color:'var(--text-3)' }}>
          No live prices yet, so there’s nothing to score. Refresh prices from the top bar in a minute.
        </div>
      )}

      {/* Signal cards */}
      <div className="space-y-3">
        {filtered.map((sig, i) => {
          const ts = typeStyle[sig.type]
          const isExp = expanded === sig.id
          return (
            <motion.div key={sig.id}
              initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}
              className="card-flat">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[11px] font-bold tracking-wider px-2 py-1 rounded w-12 text-center shrink-0"
                    style={{ background:ts.bg, color:ts.color, border:`1px solid ${ts.border}` }}>
                    {sig.type}
                  </span>
                  <div className="min-w-0">
                    <Link to={`/stock/${sig.symbol}`} className="font-black hover:text-accent transition-colors"
                      style={{ color:'var(--text-1)' }}>{sig.symbol}</Link>
                    <div className="text-xs truncate" style={{ color:'var(--text-3)' }}>{sig.name} · {sig.sector}</div>
                  </div>
                </div>
                <div className="flex items-center gap-5 font-mono text-sm">
                  <div className="text-right">
                    <div style={{ color:'var(--text-1)' }}>${sig.price.toFixed(2)}</div>
                    <div className={`text-xs ${sig.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {sig.changePct >= 0 ? '+' : ''}{sig.changePct.toFixed(2)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-sans" style={{ color:'var(--text-3)' }}>Score</div>
                    <div className="font-bold" style={{ color:ts.color }}>{sig.score > 0 ? '+' : ''}{sig.score}</div>
                  </div>
                </div>
              </div>

              {/* Score bar: −3 … +3 */}
              <div className="mt-3 relative h-1.5 rounded-full overflow-hidden" style={{ background:'var(--bg-3)' }}
                aria-label={`Score ${sig.score} on a scale from −3 to +3`}>
                <span className="absolute top-0 bottom-0 w-px left-1/2" style={{ background:'var(--border-light)' }}/>
                <span className="absolute top-0 bottom-0 rounded-full"
                  style={{ background:ts.color, left: sig.score >= 0 ? '50%' : `${50 + sig.score / 6 * 100}%`, width:`${Math.abs(sig.score) / 6 * 100}%` }}/>
              </div>

              <button onClick={() => setExpanded(isExp ? null : sig.id)}
                className="mt-3 flex items-center gap-1.5 text-xs hover:text-accent transition-colors"
                style={{ color:'var(--text-3)' }}>
                {isExp ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                {isExp ? 'Hide reasoning' : 'Why this call'}
              </button>

              <AnimatePresence>
                {isExp && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
                    className="overflow-hidden">
                    <div className="mt-3 pt-3 border-t grid sm:grid-cols-2 gap-4 text-sm" style={{ borderColor:'var(--border)' }}>
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
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 page-enter">

      <PageHeader title="AI Alerts"
        subtitle="Get told when a stock hits your price, moves sharply, changes outlook or makes news — and see today’s rule-based buy, sell and hold screen.">
        <StatusPill tone="muted">{activeCnt} active</StatusPill>
      </PageHeader>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-lg w-fit border"
        style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
        {[
          { key:'my-alerts', label:'My Alerts', badge: alerts.length },
          { key:'ai-signals', label:'Signals', badge: signals.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border transition-all"
            style={tab === t.key ? SEG_ON : { ...SEG_OFF, borderColor:'transparent' }}>
            {t.label}
            <span className="text-xs px-1.5 py-0.5 rounded font-bold font-mono"
              style={{ background:'var(--bg-3)', color:'var(--text-3)' }}>
              {t.badge}
            </span>
          </button>
        ))}
      </div>

      {/* ── My Alerts tab ── */}
      {tab === 'my-alerts' && (
        <div className="space-y-5">

          {/* Create section */}
          <div className="card-flat space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus size={14} style={{ color:'var(--accent)' }}/>
                <span className="text-sm font-bold" style={{ color:'var(--text-1)' }}>Create New Alert</span>
              </div>
            </div>
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
          </div>

          <p className="text-xs leading-relaxed" style={{ color:'var(--text-3)' }}>
            {signedIn
              ? 'Your alerts are saved to your account and checked every minute by Foliyo’s server, even while this tab is closed.'
              : 'Alerts are saved in this browser and checked every minute while Foliyo is open. Sign in to have them checked in the background and sent by email.'}
          </p>
          {(alertsError || actionError) && (
            <p role="alert" className="text-xs text-red-400 font-medium">{actionError || alertsError}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label:'Active',    count:activeCnt,    color:'rgb(var(--up))', bg:'rgb(var(--up) / .08)', border:'rgb(var(--up) / .18)' },
              { label:'Paused',    count:pausedCnt,    color:'var(--text-2)', bg:'var(--bg-2)', border:'var(--border)' },
              { label:'Triggered', count:triggeredCnt, color:'var(--accent)', bg:`rgba(var(--accent-rgb),.08)`, border:`rgba(var(--accent-rgb),.18)` },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 border text-center"
                style={{ background:s.bg, borderColor:s.border }}>
                <div className="text-3xl font-black font-mono" style={{ color:s.color }}>{s.count}</div>
                <div className="text-xs font-semibold mt-1" style={{ color:s.color }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setAlertFilter(f.key)}
                className="text-xs px-3.5 py-1.5 rounded-md font-semibold border transition-all"
                style={alertFilter === f.key ? SEG_ON : SEG_OFF}>
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
              <div className="h-28 rounded-xl shimmer"/>
            )}
            {visibleAlerts.length === 0 && !alertsLoading && (
              <div className="text-center py-16" style={{ color:'var(--text-3)' }}>
                <Bell size={36} className="mx-auto mb-3 opacity-20"/>
                <p className="text-sm font-medium" style={{ color:'var(--text-2)' }}>
                  {alertFilter === 'all' ? 'No alerts yet' : `No ${FILTERS.find(f => f.key === alertFilter)?.label.toLowerCase()} alerts`}
                </p>
                <p className="text-xs mt-1">
                  {alertFilter === 'all' ? 'Search for a stock above to set your first alert.' : 'Pick another filter, or search for a stock above to add one.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AI Signals tab ── */}
      {tab === 'ai-signals' && <AISignalsTab/>}

      {/* Disclaimer */}
      <div className="rounded-xl p-4 border text-xs" style={{ background:'var(--bg-2)', borderColor:'var(--border)', color:'var(--text-3)' }}>
        <AlertTriangle size={11} className="inline mr-1.5" style={{ color:'var(--text-3)' }}/>
        <span className="font-semibold" style={{ color:'var(--text-2)' }}>Not financial advice.</span>{' '}
        Alerts and signals come from live prices and simple rules. They can be delayed or wrong; check before you act.
      </div>
    </div>
  )
}
