import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { useAlerts } from '../context/AlertsContext'

/* ── Fired alerts, shown in the corner wherever you are in the app ── */
export default function AlertToasts() {
  const { toasts, dismissToast } = useAlerts()
  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 items-end pointer-events-none" aria-live="polite">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} role="status"
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}
            className="pointer-events-auto w-full sm:w-[360px] rounded-xl border p-4 flex gap-3 shadow-2xl"
            style={{ background:'var(--bg-1)', borderColor:'rgba(var(--accent-rgb),.35)' }}>
            <Bell size={16} className="shrink-0 mt-0.5" style={{ color:'var(--accent)' }}/>
            <div className="flex-1 min-w-0 text-sm">
              <div className="font-bold" style={{ color:'var(--text-1)' }}>Alert triggered</div>
              <p className="mt-0.5 leading-snug" style={{ color:'var(--text-2)' }}>{t.text}</p>
              <div className="flex gap-4 mt-2 text-xs font-semibold">
                <Link to={`/stock/${encodeURIComponent(t.symbol)}`} onClick={() => dismissToast(t.id)} style={{ color:'var(--accent)' }}>
                  Open {t.symbol}
                </Link>
                <Link to="/ai-alerts" onClick={() => dismissToast(t.id)} style={{ color:'var(--text-2)' }}>All alerts</Link>
              </div>
            </div>
            <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="self-start p-1 rounded hover:bg-white/5"
              style={{ color:'var(--text-3)' }}>
              <X size={14}/>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
