import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Newspaper, TrendingUp, TrendingDown, Search, ExternalLink, Minus, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { useMarketNews } from '../hooks/useMarketNews'

const CATEGORIES = ['All','Macro','Earnings','Corporate','Regulatory','Commodities','Crypto']

export default function News() {
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')

  const { articles: newsArticles, isLive, loading } = useMarketNews()

  const filtered = newsArticles.filter(n =>
    (category === 'All' || n.category === category) &&
    (n.title.toLowerCase().includes(search.toLowerCase()) || n.source.toLowerCase().includes(search.toLowerCase()))
  )

  const SentimentIcon = ({ s }) => s === 'bullish'
    ? <TrendingUp size={11} className="text-emerald-400"/>
    : s === 'bearish' ? <TrendingDown size={11} className="text-red-400"/> : <Minus size={11} className="text-gray-400"/>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2.5" style={{ color:'var(--text-1)' }}>
            <Newspaper size={22} style={{ color:'var(--accent)' }}/>
            Market News
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm" style={{ color:'var(--text-3)' }}>AI-curated news with real-time sentiment analysis</p>
            {loading ? (
              <Loader2 size={12} className="animate-spin" style={{ color:'var(--text-3)' }}/>
            ) : isLive ? (
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background:'rgba(16,185,129,.1)', color:'#10b981', border:'1px solid rgba(16,185,129,.2)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>Live
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background:'rgba(148,163,184,.08)', color:'#94a3b8', border:'1px solid rgba(148,163,184,.15)' }}>
                <WifiOff size={10}/>Mock data
              </span>
            )}
          </div>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-3)' }}/>
          <input className="input pl-9 w-52 text-sm" placeholder="Search news…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      {/* Sentiment Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Bullish Stories', count: newsArticles.filter(n=>n.sentiment==='bullish').length, color:'text-emerald-400', bg:'rgba(16,185,129,.08)', border:'rgba(16,185,129,.2)' },
          { label:'Bearish Stories', count: newsArticles.filter(n=>n.sentiment==='bearish').length, color:'text-red-400',     bg:'rgba(239,68,68,.08)',  border:'rgba(239,68,68,.2)'  },
          { label:'Neutral / Watch', count: newsArticles.filter(n=>n.sentiment==='neutral').length,  color:'text-gray-400',   bg:'rgba(148,163,184,.06)',border:'rgba(148,163,184,.15)'},
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3.5 border flex items-center gap-3"
            style={{ background:s.bg, borderColor:s.border }}>
            <span className={`text-3xl font-black font-mono ${s.color}`}>{s.count}</span>
            <span className="text-xs font-semibold" style={{ color:'var(--text-2)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={()=>setCategory(c)}
            className="text-xs px-4 py-2 rounded-full font-semibold border transition-all"
            style={category===c
              ? { background:`rgba(var(--accent-rgb),.1)`, color:'var(--accent)', borderColor:`rgba(var(--accent-rgb),.25)` }
              : { borderColor:'var(--border)', color:'var(--text-3)' }
            }>{c}</button>
        ))}
      </div>

      {/* Featured */}
      {category === 'All' && !search && newsArticles.length > 0 && (
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          className={`relative rounded-2xl overflow-hidden border p-px`}
          style={{ background:`linear-gradient(135deg, rgba(var(--accent-rgb),.2), rgba(139,92,246,.15))`, borderColor:'rgba(var(--accent-rgb),.2)' }}>
          <div className="rounded-[15px] p-6" style={{ background:'var(--bg-2)' }}>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${newsArticles[0].sentiment==='bullish'?'bg-emerald-400/10 text-emerald-400':newsArticles[0].sentiment==='bearish'?'bg-red-400/10 text-red-400':'bg-gray-400/10 text-gray-400'}`}>
                <SentimentIcon s={newsArticles[0].sentiment}/> {newsArticles[0].sentiment || 'neutral'}
              </span>
              <span className="badge-accent text-xs">{newsArticles[0].category}</span>
              <span className="text-xs ml-auto" style={{ color:'var(--text-3)' }}>{newsArticles[0].source} · {newsArticles[0].time}</span>
            </div>
            <h2 className="text-xl font-black mb-2 leading-snug" style={{ color:'var(--text-1)' }}>{newsArticles[0].title}</h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color:'var(--text-2)' }}>{newsArticles[0].summary}</p>
            <div className="flex items-center gap-3 flex-wrap">
              {newsArticles[0].relatedSymbols?.map(s => (
                <span key={s} className="text-xs px-2 py-1 rounded-lg font-mono" style={{ background:'var(--bg-3)', color:'var(--text-2)' }}>{s}</span>
              ))}
              <button className="ml-auto flex items-center gap-1.5 text-xs font-semibold hover:text-accent transition-colors" style={{ color:'var(--text-3)' }}>
                Read full article <ExternalLink size={11}/>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Grid */}
      {loading && (
        <div className="flex items-center justify-center py-16" style={{ color:'var(--text-3)' }}>
          <Loader2 size={24} className="animate-spin mr-3"/>
          <span className="text-sm">Loading news…</span>
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div key={category+search} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((article, i) => (
            <motion.div key={article.id}
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.07 }}
              className="card border flex flex-col cursor-pointer group transition-all hover:border-accent/30"
              style={{ borderColor:'var(--border)' }}>
              <div className={`h-28 rounded-xl bg-gradient-to-br ${article.imageColor || 'from-slate-700 to-slate-800'} mb-4 flex items-end p-3`}>
                <div className="flex gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-black/40 ${article.sentiment==='bullish'?'text-emerald-300':article.sentiment==='bearish'?'text-red-300':'text-gray-300'}`}>
                    <SentimentIcon s={article.sentiment}/> {article.sentiment}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/40 text-white/80">{article.category}</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold" style={{ color:'var(--text-3)' }}>{article.source}</span>
                  <span style={{ color:'var(--border)' }}>·</span>
                  <span className="text-xs" style={{ color:'var(--text-3)' }}>{article.time}</span>
                </div>
                <h3 className="text-sm font-bold leading-snug mb-2 flex-1 group-hover:text-accent transition-colors" style={{ color:'var(--text-1)' }}>
                  {article.title}
                </h3>
                <p className="text-xs leading-relaxed line-clamp-2 mb-3" style={{ color:'var(--text-3)' }}>{article.summary}</p>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex gap-1.5 flex-wrap">
                    {article.relatedSymbols?.slice(0,3).map(s => (
                      <span key={s} className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background:'var(--bg-3)', color:'var(--text-3)' }}>{s}</span>
                    ))}
                  </div>
                  <ExternalLink size={12} className="group-hover:text-accent transition-colors" style={{ color:'var(--text-3)' }}/>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {!filtered.length && (
        <div className="text-center py-20" style={{ color:'var(--text-3)' }}>
          <Newspaper size={40} className="mx-auto mb-3 opacity-25"/>
          <p className="text-sm">No articles match your filters</p>
        </div>
      )}
    </div>
  )
}
