import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Bell, Brain, TrendingUp, TrendingDown, Search, Plus, X,
  Pause, Play, Trash2, Mail, Monitor, BellOff, Activity,
  Clock, Zap, AlertTriangle, CheckCircle, Minus, Target,
  Shield, ChevronDown, ChevronUp, Filter,
} from 'lucide-react'
import { stocks as allStocks, aiAlerts as mockSignals } from '../data/mockData'
import { useBatchQuotes } from '../hooks/useBatchQuotes'

/* ── Persistence ─────────────────────────────────────────────── */
const STORAGE_KEY = 'foliyo_user_alerts'

const SEED_ALERTS = [
  {
    id: 'a1',
    stock: { symbol:'AAPL', name:'Apple Inc.', price:189.84 },
    type: 'price_above', targetValue: 210, targetSentiment: null,
    notifMethod: 'both', status: 'active', createdAt: '2025-04-28T10:00:00Z',
  },
  {
    id: 'a2',
    stock: { symbol:'TSLA', name:'Tesla Inc.', price:248.42 },
    type: 'price_below', targetValue: 220, targetSentiment: null,
    notifMethod: 'email', status: 'active', createdAt: '2025-04-27T14:30:00Z',
  },
  {
    id: 'a3',
    stock: { symbol:'NVDA', name:'NVIDIA Corp.', price:877.35 },
    type: 'daily_move', targetValue: 5, targetSentiment: null,
    notifMethod: 'dashboard', status: 'paused', createdAt: '2025-04-26T09:15:00Z',
  },
]

function loadAlerts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : SEED_ALERTS
  } catch { return SEED_ALERTS }
}
function saveAlerts(alerts) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts)) } catch {}
}

/* ── Config maps ─────────────────────────────────────────────── */
const ALERT_TYPES = [
  { key:'price_above',      label:'Price Above',  Icon:TrendingUp,   desc:'Notify when price exceeds a target' },
  { key:'price_below',      label:'Price Below',  Icon:TrendingDown, desc:'Notify when price drops below a target' },
  { key:'daily_move',       label:'Daily Move',   Icon:Activity,     desc:'Notify if daily movement exceeds X%' },
  { key:'sentiment_change', label:'AI Sentiment', Icon:Brain,        desc:'Notify if AI verdict changes' },
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
    case 'sentiment_change': return `AI sentiment changes to ${a.targetSentiment || 'Bullish'}`
    case 'news_event':       return `Major news event for ${a.stock.symbol}`
    default: return 'Custom alert'
  }
}

function distanceLabel(a) {
  const cur = a.stock.price
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

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
  } catch { return 'Unknown' }
}

/* ── Status badge ────────────────────────────────────────────── */
const STATUS_CFG = {
  active:    { color:'#10b981', bg:'rgba(16,185,129,.1)',  border:'rgba(16,185,129,.2)',  label:'Active'    },
  triggered: { color:'var(--accent)', bg:`rgba(var(--accent-rgb),.1)`, border:`rgba(var(--accent-rgb),.2)`, label:'Triggered' },
  paused:    { color:'#6b7280', bg:'rgba(107,114,128,.1)', border:'rgba(107,114,128,.2)', label:'Paused'    },
}

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.active
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ color:c.color, background:c.bg, border:`1px solid ${c.border}` }}>
      {c.label}
    </span>
  )
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
      <div className="relative flex items-center rounded-xl border overflow-hidden transition-all"
        style={{
          background:'var(--bg-2)',
          borderColor: focused ? 'rgba(var(--accent-rgb),.5)' : 'var(--border)',
          boxShadow: focused ? `0 0 0 3px rgba(var(--accent-rgb),.08)` : 'none',
        }}>
        <Search size={14} className="ml-3.5 shrink-0" style={{ color:'var(--text-3)' }}/>
        <input
          className="flex-1 bg-transparent text-sm px-3 py-3 outline-none"
          style={{ color:'var(--text-1)' }}
          placeholder="Search ticker or company — e.g. AAPL, Tesla…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 160)}
        />
        {q && (
          <button className="mr-3 opacity-50 hover:opacity-100 transition-opacity text-xs"
            style={{ color:'var(--text-3)' }} onClick={() => setQ('')}>
            <X size={13}/>
          </button>
        )}
      </div>
      <AnimatePresence>
        {focused && results.length > 0 && (
          <motion.div
            initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:4 }}
            className="absolute left-0 right-0 mt-1.5 rounded-xl border shadow-2xl overflow-hidden z-50"
            style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
            {results.map(s => (
              <button key={s.symbol} onMouseDown={() => pick(s)}
                className="w-full flex items-center justify-between px-4 py-3 text-left border-b last:border-0 transition-colors"
                style={{ borderColor:'var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
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
                  <div className={`text-xs font-bold ${s.changePct == null ? 'text-slate-500' : s.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
  const [alertType, setAlertType] = useState('price_above')
  const [targetVal,  setTargetVal] = useState(String((stock.price * 1.1).toFixed(2)))
  const [targetSent, setTargetSent] = useState('Bullish')
  const [notifMethod, setNotifMethod] = useState('email')
  const [saving, setSaving] = useState(false)

  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    const result = await Notification.requestPermission()
    return result === 'granted'
  }

  const handleCreate = async () => {
    setSaving(true)
    let finalMethod = notifMethod
    if (notifMethod === 'browser' || notifMethod === 'both') {
      const granted = await requestBrowserPermission()
      if (!granted) finalMethod = notifMethod === 'both' ? 'email' : 'dashboard'
    }
    onSave({
      id: `a${Date.now()}`,
      stock: { symbol: stock.symbol, name: stock.name, price: stock.price },
      type: alertType,
      targetValue: alertType === 'daily_move' ? parseFloat(targetVal) || 5 : parseFloat(targetVal) || stock.price,
      targetSentiment: targetSent,
      notifMethod: finalMethod,
      status: 'active',
      createdAt: new Date().toISOString(),
    })
    setSaving(false)
  }

  const needsValue   = ['price_above','price_below','daily_move'].includes(alertType)
  const needsSentiment = alertType === 'sentiment_change'

  return (
    <motion.div
      initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}
      className="rounded-2xl border p-5 space-y-5"
      style={{ background:'var(--bg-2)', borderColor:`rgba(var(--accent-rgb),.25)` }}>

      {/* Stock header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm"
            style={{ background:`rgba(var(--accent-rgb),.12)`, color:'var(--accent)' }}>
            {stock.symbol.charAt(0)}
          </div>
          <div>
            <div className="font-black" style={{ color:'var(--text-1)' }}>{stock.symbol}</div>
            <div className="text-xs" style={{ color:'var(--text-3)' }}>{stock.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold" style={{ color:'var(--text-1)' }}>${stock.price.toFixed(2)}</div>
          <div className={`text-xs font-bold ${stock.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}% today
          </div>
        </div>
        <button onClick={onCancel} className="ml-3 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
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
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all"
              style={alertType === t.key
                ? { background:`rgba(var(--accent-rgb),.1)`, borderColor:`rgba(var(--accent-rgb),.3)`, color:'var(--accent)' }
                : { background:'var(--bg-1)', borderColor:'var(--border)', color:'var(--text-3)' }
              }>
              <t.Icon size={13}/>
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
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>
            {alertType === 'daily_move' ? 'Movement Threshold (%)' : 'Target Price ($)'}
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm"
              style={{ color:'var(--text-3)' }}>
              {alertType === 'daily_move' ? '±' : '$'}
            </span>
            <input
              type="number" step="0.01" min="0"
              className="input text-sm pl-8 py-2.5 w-full font-mono"
              value={targetVal}
              onChange={e => setTargetVal(e.target.value)}
              placeholder={alertType === 'daily_move' ? '5' : stock.price.toFixed(2)}
            />
          </div>
          {alertType === 'price_above' && parseFloat(targetVal) > 0 && (
            <p className="text-xs mt-1.5" style={{ color:'var(--text-3)' }}>
              {((parseFloat(targetVal) - stock.price) / stock.price * 100).toFixed(1)}% above current price
            </p>
          )}
          {alertType === 'price_below' && parseFloat(targetVal) > 0 && (
            <p className="text-xs mt-1.5" style={{ color:'var(--text-3)' }}>
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
                className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all"
                style={targetSent === s
                  ? s === 'Bullish' ? { background:'rgba(16,185,129,.12)', borderColor:'rgba(16,185,129,.3)', color:'#10b981' }
                    : s === 'Bearish' ? { background:'rgba(239,68,68,.12)', borderColor:'rgba(239,68,68,.3)', color:'#ef4444' }
                    : { background:'rgba(245,158,11,.12)', borderColor:'rgba(245,158,11,.3)', color:'#f59e0b' }
                  : { background:'var(--bg-1)', borderColor:'var(--border)', color:'var(--text-3)' }
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
            <button key={m.key} onClick={() => setNotifMethod(m.key)}
              className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border transition-all"
              style={notifMethod === m.key
                ? { background:`rgba(var(--accent-rgb),.1)`, borderColor:`rgba(var(--accent-rgb),.3)`, color:'var(--accent)' }
                : { background:'var(--bg-1)', borderColor:'var(--border)', color:'var(--text-3)' }
              }>
              <m.Icon size={15}/>
              <span className="text-xs font-semibold text-center leading-tight">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={handleCreate} disabled={saving}
          className="btn-primary flex-1 py-2.5 justify-center text-sm">
          <Plus size={14}/>
          {saving ? 'Creating…' : 'Create Alert'}
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
      className="card border" style={{ borderColor:'var(--border)' }}>

      {/* Top row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
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
          <button onClick={() => onPause(alert.id)}
            className="p-2 rounded-lg transition-all hover:bg-white/5"
            title={alert.status === 'paused' ? 'Resume' : 'Pause'}
            style={{ color:'var(--text-3)' }}>
            {alert.status === 'paused' ? <Play size={14}/> : <Pause size={14}/>}
          </button>
          <button onClick={() => onDelete(alert.id)}
            className="p-2 rounded-lg transition-all hover:bg-red-400/10"
            style={{ color:'var(--text-3)' }}>
            <Trash2 size={14}/>
          </button>
        </div>
      </div>

      {/* Condition row */}
      <div className="mt-3 rounded-xl p-3 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
        <p className="text-sm font-medium" style={{ color:'var(--text-2)' }}>
          {conditionLabel(alert)}
        </p>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        <div className="rounded-xl p-2.5 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
          <div className="text-xs mb-0.5" style={{ color:'var(--text-3)' }}>Current</div>
          <div className="text-sm font-mono font-bold" style={{ color:'var(--text-1)' }}>
            ${alert.stock.price.toFixed(2)}
          </div>
        </div>
        {(alert.type === 'price_above' || alert.type === 'price_below') && (
          <div className="rounded-xl p-2.5 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
            <div className="text-xs mb-0.5" style={{ color:'var(--text-3)' }}>Target</div>
            <div className="text-sm font-mono font-bold" style={{ color:'var(--accent)' }}>
              ${alert.targetValue}
            </div>
          </div>
        )}
        <div className="rounded-xl p-2.5 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
          <div className="text-xs mb-0.5" style={{ color:'var(--text-3)' }}>Distance</div>
          <div className="text-sm font-semibold" style={{ color:'var(--text-2)' }}>
            {distanceLabel(alert)}
          </div>
        </div>
        <div className="rounded-xl p-2.5 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
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
        <span className="ml-auto flex items-center gap-1">
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

/* ── AI Signals tab content (preserved) ─────────────────────── */
function AISignalsTab() {
  const [filter, setFilter] = useState('All')
  const [expanded, setExpanded] = useState(null)

  const typeStyle = {
    BUY:  { color:'#10b981', bg:'rgba(16,185,129,.1)',  border:'rgba(16,185,129,.2)',  Icon:TrendingUp   },
    SELL: { color:'#ef4444', bg:'rgba(239,68,68,.1)',   border:'rgba(239,68,68,.2)',   Icon:TrendingDown  },
    HOLD: { color:'#eab308', bg:'rgba(234,179,8,.1)',   border:'rgba(234,179,8,.2)',   Icon:Minus         },
  }
  const counts = {
    BUY:  mockSignals.filter(a => a.type==='BUY').length,
    SELL: mockSignals.filter(a => a.type==='SELL').length,
    HOLD: mockSignals.filter(a => a.type==='HOLD').length,
  }
  const filtered = filter === 'All' ? mockSignals : mockSignals.filter(a => a.type === filter)

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { type:'BUY',  label:'Buy Signals',  color:'#10b981', bg:'rgba(16,185,129,.08)', border:'rgba(16,185,129,.2)' },
          { type:'SELL', label:'Sell Signals', color:'#ef4444', bg:'rgba(239,68,68,.08)',  border:'rgba(239,68,68,.2)'  },
          { type:'HOLD', label:'Hold Signals', color:'#eab308', bg:'rgba(234,179,8,.08)',  border:'rgba(234,179,8,.2)'  },
        ].map(s => (
          <motion.button key={s.type} whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
            onClick={() => setFilter(filter === s.type ? 'All' : s.type)}
            className="rounded-2xl p-4 text-center border transition-all"
            style={{ background:filter===s.type?s.bg:'var(--bg-2)', borderColor:filter===s.type?s.border:'var(--border)' }}>
            <div className="text-3xl font-black font-mono" style={{ color:s.color }}>{counts[s.type]}</div>
            <div className="text-xs font-semibold mt-1" style={{ color:s.color }}>{s.label}</div>
            <div className="text-xs mt-0.5" style={{ color:'var(--text-3)' }}>Today</div>
          </motion.button>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {['All','BUY','SELL','HOLD'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="text-xs px-4 py-2 rounded-full font-bold border transition-all"
            style={filter === f
              ? { background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)', borderColor:`rgba(var(--accent-rgb),.25)` }
              : { color:'var(--text-3)', borderColor:'var(--border)' }
            }>
            {f}{f !== 'All' && <span className="ml-1 opacity-60">{counts[f]}</span>}
          </button>
        ))}
      </div>

      {/* Signal cards */}
      <div className="space-y-4">
        {filtered.map((alert, i) => {
          const ts = typeStyle[alert.type]
          const isExp = expanded === alert.id
          const upside = Math.abs(((alert.target - alert.price) / alert.price) * 100).toFixed(1)
          return (
            <motion.div key={alert.id}
              initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}
              className="card border" style={{ borderColor:'var(--border)' }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black shrink-0"
                    style={{ background:ts.bg, color:ts.color, border:`1px solid ${ts.border}` }}>
                    {alert.symbol.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/stock/${alert.symbol}`}
                        className="font-black hover:text-accent transition-colors"
                        style={{ color:'var(--text-1)' }}>{alert.symbol}</Link>
                      <span className="text-xs font-black px-2 py-0.5 rounded-full"
                        style={{ background:ts.bg, color:ts.color, border:`1px solid ${ts.border}` }}>
                        <ts.Icon size={10} className="inline mr-0.5"/>{alert.type}
                      </span>
                      <span className="text-xs flex items-center gap-1" style={{ color:'var(--text-3)' }}>
                        <Clock size={9}/>{alert.timestamp}
                      </span>
                    </div>
                    <div className="text-sm" style={{ color:'var(--text-3)' }}>{alert.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs" style={{ color:'var(--text-3)' }}>Entry</div>
                    <div className="font-black font-mono text-sm" style={{ color:'var(--text-1)' }}>${alert.price.toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs" style={{ color:'var(--text-3)' }}>Target</div>
                    <div className={`font-black font-mono text-sm ${alert.type==='SELL'?'text-red-400':'text-emerald-400'}`}>${alert.target.toFixed(2)}</div>
                  </div>
                  <div className="rounded-xl px-3 py-2 text-center" style={{ background:ts.bg, border:`1px solid ${ts.border}` }}>
                    <div className="text-xs" style={{ color:'var(--text-3)' }}>Upside</div>
                    <div className="font-black text-sm font-mono" style={{ color:ts.color }}>
                      {alert.type==='BUY'?'+':'-'}{upside}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Confidence */}
              <div className="mt-4">
                <div className="flex justify-between mb-1.5 text-xs" style={{ color:'var(--text-3)' }}>
                  <span>AI Confidence Score</span><span>{alert.timeframe}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background:'var(--bg-3)' }}>
                    <motion.div className="h-1.5 rounded-full"
                      initial={{ width:0 }} animate={{ width:`${alert.confidence}%` }}
                      transition={{ duration:0.9, ease:[0.22,1,0.36,1] }}
                      style={{ background: alert.confidence>=85?'#10b981':alert.confidence>=70?'#f59e0b':'#ef4444' }}/>
                  </div>
                  <span className="text-xs font-black font-mono w-9 text-right"
                    style={{ color:alert.confidence>=85?'#10b981':alert.confidence>=70?'#f59e0b':'#ef4444' }}>
                    {alert.confidence}%
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {alert.signals.map(s => <span key={s} className="badge-accent text-xs">{s}</span>)}
              </div>

              <button onClick={() => setExpanded(isExp ? null : alert.id)}
                className="mt-3 flex items-center gap-1.5 text-xs hover:text-accent transition-colors"
                style={{ color:'var(--text-3)' }}>
                {isExp ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                {isExp ? 'Hide analysis' : 'View full analysis'}
              </button>

              <AnimatePresence>
                {isExp && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}>
                    <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor:'var(--border)' }}>
                      <div className="rounded-xl p-4 border" style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Brain size={12} style={{ color:'var(--accent)' }}/>
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color:'var(--accent)' }}>AI Reasoning</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color:'var(--text-2)' }}>{alert.reasoning}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label:'Entry', val:`$${alert.price.toFixed(2)}`,    color:'var(--accent)',  Icon:Target    },
                          { label:'Target',val:`$${alert.target.toFixed(2)}`,   color:'#10b981',        Icon:TrendingUp },
                          { label:'Stop',  val:`$${alert.stopLoss.toFixed(2)}`, color:'#ef4444',        Icon:Shield    },
                        ].map(l => (
                          <div key={l.label} className="rounded-xl p-3 border text-center"
                            style={{ background:'var(--bg-1)', borderColor:'var(--border)' }}>
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <l.Icon size={10} style={{ color:l.color }}/>
                              <span className="text-xs" style={{ color:'var(--text-3)' }}>{l.label}</span>
                            </div>
                            <div className="font-black font-mono text-sm" style={{ color:l.color }}>{l.val}</div>
                          </div>
                        ))}
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
  const [alerts, setAlerts]     = useState(loadAlerts)
  const [creating, setCreating] = useState(false)
  const [selectedStock, setSelected] = useState(null)
  const [alertFilter, setAlertFilter] = useState('all')

  useEffect(() => { saveAlerts(alerts) }, [alerts])

  const handleAddStock = (stock) => { setSelected(stock); setCreating(true) }

  const handleSave = (newAlert) => {
    setAlerts(prev => [newAlert, ...prev])
    setCreating(false)
    setSelected(null)
  }

  const handlePause = (id) => {
    setAlerts(prev => prev.map(a => a.id === id
      ? { ...a, status: a.status === 'paused' ? 'active' : 'paused' }
      : a
    ))
  }

  const handleDelete = (id) => setAlerts(prev => prev.filter(a => a.id !== id))

  const FILTERS = [
    { key:'all',       label:'All' },
    { key:'active',    label:'Active' },
    { key:'triggered', label:'Triggered' },
    { key:'paused',    label:'Paused' },
    { key:'price',     label:'Price Alerts' },
    { key:'sentiment', label:'AI Sentiment' },
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

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2.5" style={{ color:'var(--text-1)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background:'linear-gradient(135deg, var(--accent), #8b5cf6)' }}>
              <Brain size={16} className="text-white"/>
            </div>
            AI Alerts
          </h1>
          <p className="text-sm mt-0.5" style={{ color:'var(--text-3)' }}>
            Personalized alerts + AI-generated market signals
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full px-4 py-1.5"
          style={{ background:`rgba(var(--accent-rgb),.1)`, border:`1px solid rgba(var(--accent-rgb),.2)` }}>
          <Zap size={11} style={{ color:'var(--accent)' }}/>
          <span className="text-xs font-semibold" style={{ color:'var(--accent)' }}>AI Engine Active</span>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:'var(--accent)' }}/>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl w-fit border"
        style={{ background:'var(--bg-2)', borderColor:'var(--border)' }}>
        {[
          { key:'my-alerts', label:'My Alerts', badge: alerts.length },
          { key:'ai-signals', label:'AI Signals', badge: mockSignals.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={tab === t.key
              ? { background:`rgba(var(--accent-rgb),.12)`, color:'var(--accent)', border:`1px solid rgba(var(--accent-rgb),.2)` }
              : { color:'var(--text-3)', border:'1px solid transparent' }
            }>
            {t.label}
            <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
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
          <div className="card border space-y-4" style={{ borderColor:'var(--border)' }}>
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

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label:'Active',    count:activeCnt,    color:'#10b981', bg:'rgba(16,185,129,.08)',  border:'rgba(16,185,129,.18)' },
              { label:'Paused',    count:pausedCnt,    color:'#6b7280', bg:'rgba(107,114,128,.08)', border:'rgba(107,114,128,.18)' },
              { label:'Triggered', count:triggeredCnt, color:'var(--accent)', bg:`rgba(var(--accent-rgb),.08)`, border:`rgba(var(--accent-rgb),.18)` },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4 border text-center"
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
                className="text-xs px-3.5 py-1.5 rounded-full font-semibold border transition-all"
                style={alertFilter === f.key
                  ? { background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)', borderColor:`rgba(var(--accent-rgb),.25)` }
                  : { color:'var(--text-3)', borderColor:'var(--border)' }
                }>
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
            {visibleAlerts.length === 0 && (
              <div className="text-center py-16" style={{ color:'var(--text-3)' }}>
                <Bell size={36} className="mx-auto mb-3 opacity-20"/>
                <p className="text-sm font-medium" style={{ color:'var(--text-2)' }}>No alerts</p>
                <p className="text-xs mt-1">
                  {alertFilter === 'all' ? 'Search for a stock above to create your first alert' : `No ${alertFilter} alerts`}
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
        <span className="font-semibold" style={{ color:'var(--text-2)' }}>Disclaimer:</span>{' '}
        Alerts are informational and may be delayed depending on market data availability. Not financial advice.
      </div>
    </div>
  )
}
