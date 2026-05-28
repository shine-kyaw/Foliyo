/**
 * Helpers for rendering live data with a "—" fallback (no mock values).
 * Used everywhere the app shows a price/change before live data arrives.
 */

export const fmtPrice = (v, opts = {}) => {
  if (v == null || isNaN(v)) return '—'
  const { decimals = 2, prefix = '$' } = opts
  return prefix + Number(v).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export const fmtPct = (v, opts = {}) => {
  if (v == null || isNaN(v)) return '—'
  const { decimals = 2 } = opts
  const sign = v >= 0 ? '+' : ''
  return `${sign}${Number(v).toFixed(decimals)}%`
}

export const fmtChange = (v, opts = {}) => {
  if (v == null || isNaN(v)) return '—'
  const { decimals = 2 } = opts
  const sign = v >= 0 ? '+' : ''
  return `${sign}${Number(v).toFixed(decimals)}`
}

/** Returns a Tailwind color class for a numeric change. Gray when null. */
export const changeColor = (v) =>
  v == null || isNaN(v) ? 'text-slate-500' : v >= 0 ? 'text-emerald-400' : 'text-red-400'
