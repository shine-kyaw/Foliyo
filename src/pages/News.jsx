import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Newspaper, TrendingUp, TrendingDown, Search, ExternalLink, Minus, Loader2 } from 'lucide-react'
import { useMarketNews } from '../hooks/useMarketNews'
import PageHeader, { StatusPill } from '../components/PageHeader'

const CATEGORIES = ['All','Macro','Earnings','Corporate','Regulatory','Commodities','Crypto']

/* Articles open at their source in a new tab; sample items without a URL stay put */
const hasUrl = url => !!url && url !== '#'
const articleLink = url => hasUrl(url) ? { href:url, target:'_blank', rel:'noopener noreferrer' } : {}

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
    : s === 'bearish' ? <TrendingDown size={11} className="text-red-400"/> : <Minus size={11} style={{ color:'var(--text-3)' }}/>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 page-enter">
      {/* Header */}
      <PageHeader title="News" subtitle="Market headlines, each tagged bullish, bearish or neutral.">
        {loading
          ? <Loader2 size={14} className="animate-spin" aria-label="Loading news" style={{ color:'var(--text-3)' }}/>
          : isLive
            ? <StatusPill tone="live" pulse>Live</StatusPill>
            : <StatusPill tone="muted">Sample articles</StatusPill>}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-3)' }}/>
          <input aria-label="Search news" className="input pl-9 w-52 text-sm" placeholder="Search headlines or sources" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </PageHeader>

      {/* Sentiment Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Bullish stories', count: newsArticles.filter(n=>n.sentiment==='bullish').length, color:'text-emerald-400', bg:'rgb(var(--up) / .08)',   border:'rgb(var(--up) / .2)' },
          { label:'Bearish stories', count: newsArticles.filter(n=>n.sentiment==='bearish').length, color:'text-red-400',     bg:'rgb(var(--down) / .08)', border:'rgb(var(--down) / .2)' },
          { label:'Neutral / watch', count: newsArticles.filter(n=>n.sentiment==='neutral').length,  color:'',                bg:'var(--bg-2)',            border:'var(--border)' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3.5 border flex items-center gap-3"
            style={{ background:s.bg, borderColor:s.border }}>
            <span className={`text-3xl font-black font-mono ${s.color}`} style={s.color ? undefined : { color:'var(--text-2)' }}>{s.count}</span>
            <span className="text-xs font-semibold" style={{ color:'var(--text-2)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={()=>setCategory(c)}
            className="text-xs px-3.5 py-2 rounded-md font-semibold border transition-colors"
            style={category===c
              ? { background:'rgba(var(--accent-rgb),.12)', color:'var(--text-1)', borderColor:'rgba(var(--accent-rgb),.25)' }
              : { background:'transparent', borderColor:'transparent', color:'var(--text-2)' }
            }>{c}</button>
        ))}
      </div>

      {/* Featured */}
      {category === 'All' && !search && newsArticles.length > 0 && (
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          className="rounded-xl overflow-hidden border"
          style={{ background:'var(--bg-2)', borderColor:'rgba(var(--accent-rgb),.25)' }}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md ${newsArticles[0].sentiment==='bullish'?'bg-emerald-400/10 text-emerald-400':newsArticles[0].sentiment==='bearish'?'bg-red-400/10 text-red-400':''}`}
                style={newsArticles[0].sentiment==='bullish'||newsArticles[0].sentiment==='bearish' ? undefined : { background:'var(--bg-3)', color:'var(--text-2)' }}>
                <SentimentIcon s={newsArticles[0].sentiment}/> {newsArticles[0].sentiment || 'neutral'}
              </span>
              <span className="badge-accent text-xs">{newsArticles[0].category}</span>
              <span className="text-xs ml-auto" style={{ color:'var(--text-3)' }}>{newsArticles[0].source} · {newsArticles[0].time}</span>
            </div>
            <h2 className="text-xl font-black mb-2 leading-snug" style={{ color:'var(--text-1)' }}>{newsArticles[0].title}</h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color:'var(--text-2)' }}>{newsArticles[0].summary}</p>
            <div className="flex items-center gap-3 flex-wrap">
              {newsArticles[0].relatedSymbols?.map(s => (
                <span key={s} className="text-xs px-2 py-1 rounded-md font-mono" style={{ background:'var(--bg-3)', color:'var(--text-2)' }}>{s}</span>
              ))}
              {hasUrl(newsArticles[0].url) && (
                <a {...articleLink(newsArticles[0].url)}
                  className="ml-auto flex items-center gap-1.5 text-xs font-semibold hover:text-accent transition-colors" style={{ color:'var(--text-2)' }}>
                  Read full article <ExternalLink size={11}/>
                </a>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Grid */}
      {loading && (
        <div className="flex items-center justify-center py-16" style={{ color:'var(--text-3)' }}>
          <Loader2 size={24} className="animate-spin mr-3"/>
          <span className="text-sm">Loading news</span>
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div key={category+search} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((article, i) => (
            <motion.a key={article.id}
              {...articleLink(article.url)}
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.07 }}
              className={`card flex flex-col group ${hasUrl(article.url) ? 'cursor-pointer' : ''}`}>
              <div className="flex gap-2 flex-wrap mb-3">
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${article.sentiment==='bullish'?'bg-emerald-400/10 text-emerald-400':article.sentiment==='bearish'?'bg-red-400/10 text-red-400':''}`}
                  style={article.sentiment==='bullish'||article.sentiment==='bearish' ? undefined : { background:'var(--bg-3)', color:'var(--text-2)' }}>
                  <SentimentIcon s={article.sentiment}/> {article.sentiment || 'neutral'}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background:'var(--bg-3)', color:'var(--text-2)' }}>{article.category}</span>
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
                  {hasUrl(article.url) && <ExternalLink size={12} className="group-hover:text-accent transition-colors" style={{ color:'var(--text-3)' }}/>}
                </div>
              </div>
            </motion.a>
          ))}
        </motion.div>
      </AnimatePresence>

      {!loading && !filtered.length && (
        <div className="text-center py-20" style={{ color:'var(--text-3)' }}>
          <Newspaper size={32} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">No articles match. Clear the search or choose another category.</p>
        </div>
      )}
    </div>
  )
}
