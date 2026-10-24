/* ── World exchanges and their regular sessions ────────────────
   Local wall-clock hours, Monday–Friday. Public holidays and
   half-days aren't modelled, so "open" means "inside regular hours". */
export const EXCHANGES = [
  { id:'NYSE',  name:'New York Stock Exchange', city:'New York',     lat: 40.71, lon: -74.01, tz:'America/New_York',    sessions:[['09:30','16:00']], proxy:'SPY',  proxyName:'S&P 500 (SPY)' },
  { id:'TSX',   name:'Toronto Stock Exchange',  city:'Toronto',      lat: 43.65, lon: -79.38, tz:'America/Toronto',     sessions:[['09:30','16:00']], proxy:'EWC',  proxyName:'Canada (EWC)' },
  { id:'B3',    name:'B3',                      city:'São Paulo',    lat:-23.55, lon: -46.63, tz:'America/Sao_Paulo',   sessions:[['10:00','17:00']], proxy:'EWZ',  proxyName:'Brazil (EWZ)' },
  { id:'LSE',   name:'London Stock Exchange',   city:'London',       lat: 51.51, lon:  -0.09, tz:'Europe/London',       sessions:[['08:00','16:30']], proxy:'EWU',  proxyName:'UK (EWU)' },
  { id:'EPA',   name:'Euronext Paris',          city:'Paris',        lat: 48.87, lon:   2.33, tz:'Europe/Paris',        sessions:[['09:00','17:30']], proxy:'EWQ',  proxyName:'France (EWQ)' },
  { id:'XETRA', name:'Xetra',                   city:'Frankfurt',    lat: 50.11, lon:   8.68, tz:'Europe/Berlin',       sessions:[['09:00','17:30']], proxy:'EWG',  proxyName:'Germany (EWG)' },
  { id:'JSE',   name:'Johannesburg Stock Exchange', city:'Johannesburg', lat:-26.20, lon: 28.05, tz:'Africa/Johannesburg', sessions:[['09:00','17:00']], proxy:'EZA', proxyName:'South Africa (EZA)' },
  { id:'NSE',   name:'National Stock Exchange of India', city:'Mumbai', lat: 19.06, lon: 72.83, tz:'Asia/Kolkata',       sessions:[['09:15','15:30']], proxy:'INDA', proxyName:'India (INDA)' },
  { id:'YSX',   name:'Yangon Stock Exchange',   city:'Yangon',       lat: 16.78, lon:  96.16, tz:'Asia/Yangon',         sessions:[['09:30','13:00']] },
  { id:'SGX',   name:'Singapore Exchange',      city:'Singapore',    lat:  1.28, lon: 103.85, tz:'Asia/Singapore',      sessions:[['09:00','12:00'],['13:00','17:00']], proxy:'EWS', proxyName:'Singapore (EWS)' },
  { id:'HKEX',  name:'Hong Kong Exchanges',     city:'Hong Kong',    lat: 22.28, lon: 114.16, tz:'Asia/Hong_Kong',      sessions:[['09:30','12:00'],['13:00','16:00']], proxy:'EWH', proxyName:'Hong Kong (EWH)' },
  { id:'SSE',   name:'Shanghai Stock Exchange', city:'Shanghai',     lat: 31.23, lon: 121.47, tz:'Asia/Shanghai',       sessions:[['09:30','11:30'],['13:00','15:00']], proxy:'MCHI', proxyName:'China (MCHI)' },
  { id:'KRX',   name:'Korea Exchange',          city:'Seoul',        lat: 37.57, lon: 126.98, tz:'Asia/Seoul',          sessions:[['09:00','15:30']], proxy:'EWY',  proxyName:'South Korea (EWY)' },
  { id:'TSE',   name:'Tokyo Stock Exchange',    city:'Tokyo',        lat: 35.68, lon: 139.77, tz:'Asia/Tokyo',          sessions:[['09:00','11:30'],['12:30','15:30']], proxy:'EWJ', proxyName:'Japan (EWJ)' },
  { id:'ASX',   name:'Australian Securities Exchange', city:'Sydney', lat:-33.87, lon: 151.21, tz:'Australia/Sydney',   sessions:[['10:00','16:00']], proxy:'EWA',  proxyName:'Australia (EWA)' },
]

const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }

/* Where an exchange is in its day right now */
export function sessionState(ex, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ex.tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const get = t => parts.find(p => p.type === t)?.value
  const weekday = !['Sat', 'Sun'].includes(get('weekday'))
  const mins = Number(get('hour')) * 60 + Number(get('minute'))
  const open = weekday && ex.sessions.some(([a, b]) => mins >= toMin(a) && mins < toMin(b))
  const onBreak = weekday && !open && mins > toMin(ex.sessions[0][0]) && mins < toMin(ex.sessions.at(-1)[1])
  const localTime = new Intl.DateTimeFormat('en-US', { timeZone: ex.tz, hour: 'numeric', minute: '2-digit' }).format(now)
  return { open, onBreak, localTime, label: open ? 'Open' : onBreak ? 'Lunch break' : 'Closed' }
}

export const hoursLabel = ex => ex.sessions.map(([a, b]) => `${a}–${b}`).join(', ')
