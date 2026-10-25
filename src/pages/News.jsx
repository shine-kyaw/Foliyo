import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Loader2, ChevronRight } from 'lucide-react'
import { FACEBOOK_PAGE } from '../data/foliyoPosts'
import { useFoliyoPosts, postDate } from '../hooks/useFoliyoPosts'
import { excerpt, LangToggle } from './FoliyoPost'
import { useMarketNews } from '../hooks/useMarketNews'
import PageHeader, { StatusPill } from '../components/PageHeader'

const CATEGORIES = ['All','Macro','Earnings','Corporate','Regulatory','Commodities','Crypto','Technology']

/* Articles open at their source in a new tab; items without a URL stay put */
const hasUrl = url => !!url && url !== '#'
const articleLink = url => hasUrl(url) ? { href:url, target:'_blank', rel:'noopener noreferrer' } : {}

const ago = ms => {
  if (!ms) return ''
  const m = Math.max(1, Math.round((Date.now() - ms) / 60_000))
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}
const when = a => ago(a.datetime) || a.time

/* ── Stories — same look as the home page ──────────────────── */
function LeadStory({ a }) {
  return (
    <a {...articleLink(a.url)} className={`group grid gap-5 items-start ${a.image ? 'sm:grid-cols-[1.1fr_1fr]' : ''}`}>
      {a.image && (
        <div className="aspect-[16/10] rounded-xl overflow-hidden" style={{ background:'var(--bg-3)' }}>
          <img src={a.image} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            onError={e => { e.currentTarget.parentElement.style.display = 'none' }} />
        </div>
      )}
      <div>
        <div className="section-label mb-2">{a.category}</div>
        <h2 className="text-[1.9rem] sm:text-[2.3rem] font-bold leading-[1.08] group-hover:underline decoration-2 underline-offset-4"
          style={{ color:'var(--text-1)' }}>{a.title}</h2>
        {a.summary && a.summary !== a.title && (
          <p className="mt-3 text-[15px] leading-relaxed line-clamp-4" style={{ color:'var(--text-2)' }}>{a.summary}</p>
        )}
        <div className="mt-3 text-xs" style={{ color:'var(--text-3)' }}>{a.source} · {when(a)}</div>
      </div>
    </a>
  )
}

function StoryCard({ a }) {
  return (
    <a {...articleLink(a.url)} className="group block">
      {a.image && (
        <div className="aspect-[16/9] rounded-lg overflow-hidden mb-2.5" style={{ background:'var(--bg-3)' }}>
          <img src={a.image} alt="" loading="lazy" className="w-full h-full object-cover"
            onError={e => { e.currentTarget.parentElement.style.display = 'none' }} />
        </div>
      )}
      <h3 className="text-[15px] font-semibold leading-snug line-clamp-3 group-hover:underline" style={{ color:'var(--text-1)' }}>{a.title}</h3>
      <div className="mt-1.5 text-xs" style={{ color:'var(--text-3)' }}>{a.source} · {when(a)}</div>
    </a>
  )
}

function StoryRow({ a }) {
  return (
    <a {...articleLink(a.url)} className="group flex gap-4 py-3.5 border-t" style={{ borderColor:'var(--border)' }}>
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-semibold leading-snug group-hover:underline" style={{ color:'var(--text-1)' }}>{a.title}</h3>
        {a.summary && a.summary !== a.title && (
          <p className="mt-1 text-[13px] leading-snug line-clamp-2 hidden sm:block" style={{ color:'var(--text-2)' }}>{a.summary}</p>
        )}
        <div className="mt-1 text-xs" style={{ color:'var(--text-3)' }}>{a.source} · {when(a)}</div>
      </div>
      {a.image && (
        <div className="w-28 h-[72px] rounded-md overflow-hidden shrink-0" style={{ background:'var(--bg-3)' }}>
          <img src={a.image} alt="" loading="lazy" className="w-full h-full object-cover" onError={e => { e.currentTarget.parentElement.style.display = 'none' }}/>
        </div>
      )}
    </a>
  )
}

/* ── Foliyo's own articles (from the Facebook page) ─────────── */
function FoliyoCard({ p, lang, big }) {
  const v = p[lang]
  return (
    <Link to={`/news/foliyo/${p.slug}`} className="group block rounded-xl border p-5 h-full transition-colors hover:border-[var(--border-light)]"
      style={{ borderColor:'var(--border)', background:'var(--bg-2)' }}>
      <div className="eyebrow mb-3">Foliyo{postDate(p.date) ? <span className="normal-case tracking-normal font-medium" style={{ color:'var(--text-3)' }}> · {postDate(p.date)}</span> : null}</div>
      <h3 className={`${big ? 'text-[1.6rem]' : 'text-[1.15rem]'} font-bold leading-snug group-hover:underline ${lang === 'my' ? 'lang-my' : 'headline'}`}
        style={{ color:'var(--text-1)' }} lang={lang === 'my' ? 'my' : 'en'}>
        {v.title}
      </h3>
      <p className={`mt-2 text-sm leading-relaxed line-clamp-3 ${lang === 'my' ? 'lang-my' : ''}`} style={{ color:'var(--text-2)' }}>
        {excerpt(v.body, big ? 260 : 150)}
      </p>
      <span className="inline-flex items-center gap-1 mt-3 text-[13px] font-semibold link">Read article <ChevronRight size={14}/></span>
    </Link>
  )
}

function FoliyoSection({ all, lang, setLang }) {
  const { articles: foliyoPosts } = useFoliyoPosts()
  const list = all ? foliyoPosts : foliyoPosts.slice(0, 3)
  return (
    <section aria-label="From Foliyo" className="mb-10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="section-title text-[1.35rem]">From Foliyo</h2>
          <p className="text-sm mt-0.5" style={{ color:'var(--text-2)' }}>
            Plain-language explainers from our <a href={FACEBOOK_PAGE} target="_blank" rel="noopener noreferrer" className="link">Facebook page</a>, in English and Burmese.
          </p>
        </div>
        <LangToggle lang={lang} setLang={setLang} />
      </div>
      <div className={`grid gap-4 ${all ? 'sm:grid-cols-2' : 'md:grid-cols-3'}`}>
        {list.map((p, i) => <FoliyoCard key={p.slug} p={p} lang={lang} big={all && i === 0} />)}
      </div>
    </section>
  )
}

export default function News() {
  const [params, setParams] = useSearchParams()
  const [category, setCategoryState] = useState(() => params.get('tab') === 'foliyo' ? 'Foliyo' : 'All')
  const setCategory = c => { setCategoryState(c); setParams(c === 'Foliyo' ? { tab:'foliyo' } : {}, { replace:true }) }
  const [lang, setLangState] = useState(() => { try { return localStorage.getItem('foliyo_read_lang') || 'en' } catch { return 'en' } })
  const setLang = l => { setLangState(l); try { localStorage.setItem('foliyo_read_lang', l) } catch {} }
  const [search, setSearch] = useState('')

  const { articles: newsArticles, isLive, loading } = useMarketNews()

  const q = search.toLowerCase()
  const filtered = useMemo(() => {
    const list = newsArticles.filter(n =>
      (category === 'All' || category === 'Foliyo' || n.category === category) &&
      (n.title.toLowerCase().includes(q) || n.source.toLowerCase().includes(q))
    )
    // stories with a picture lead, as on the home page
    return [...list.filter(a => a.image), ...list.filter(a => !a.image)]
  }, [newsArticles, category, q])

  // Only offer categories that actually have stories right now
  const tabs = ['All', 'Foliyo', ...CATEGORIES.filter(c => c !== 'All' && (c === category || newsArticles.some(n => n.category === c)))]

  const [lead, ...more] = filtered

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 page-enter">
      {/* ── Header ── */}
      <PageHeader title="News" subtitle="Market headlines from across the wires, newest first." className="mb-5">
        {loading
          ? <Loader2 size={14} className="animate-spin" aria-label="Loading news" style={{ color:'var(--text-3)' }}/>
          : isLive && <StatusPill tone="live" pulse>Live</StatusPill>}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-3)' }}/>
          <input aria-label="Search news" className="input pl-9 w-full sm:w-64 text-sm" placeholder="Search headlines or sources" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </PageHeader>

      {/* ── Category tabs ── */}
      <div role="tablist" aria-label="News categories" className="flex gap-6 overflow-x-auto border-b mb-6" style={{ borderColor:'var(--border)' }}>
        {tabs.map(c => (
          <button key={c} role="tab" aria-selected={category === c} onClick={() => setCategory(c)}
            className="shrink-0 whitespace-nowrap py-3 text-sm -mb-px border-b-[3px] transition-colors"
            style={category === c
              ? { color:'var(--text-1)', fontWeight:700, borderColor:'var(--brand)' }
              : { color:'var(--text-2)', fontWeight:500, borderColor:'transparent' }}>
            {c}
          </button>
        ))}
      </div>

      {/* ── Foliyo articles: a row on All, the full set on their own tab ── */}
      {category === 'All' && !search && <FoliyoSection lang={lang} setLang={setLang} />}
      {category === 'Foliyo' && <FoliyoSection all lang={lang} setLang={setLang} />}

      {category !== 'Foliyo' && <>
      {category === 'All' && !search && <h2 className="section-title text-[1.35rem] mb-4">Market headlines</h2>}

      {/* ── Stories ── */}
      {loading && (
        <div className="space-y-4" aria-hidden="true">
          <div className="h-64 rounded-xl shimmer"/>
          <div className="grid sm:grid-cols-3 gap-5"><div className="h-36 rounded-lg shimmer"/><div className="h-36 rounded-lg shimmer"/><div className="h-36 rounded-lg shimmer"/></div>
        </div>
      )}

      {!loading && lead && (
        <div>
          <LeadStory a={lead} />
          {more.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-5 mt-8">
              {more.slice(0, 3).map(a => <StoryCard key={a.id} a={a} />)}
            </div>
          )}
          {more.length > 3 && (
            <div className="mt-6">
              {more.slice(3).map(a => <StoryRow key={a.id} a={a} />)}
            </div>
          )}
          <p className="text-xs mt-6" style={{ color:'var(--text-3)' }}>
            {filtered.length} {filtered.length === 1 ? 'story' : 'stories'}{category !== 'All' ? ` in ${category}` : ''}{search ? ` matching “${search}”` : ''}. Headlines link to the publisher’s site.
          </p>
        </div>
      )}

      {!loading && !lead && (
        <p className="text-sm py-12 text-center" style={{ color:'var(--text-3)' }}>
          {newsArticles.length
            ? 'No stories match. Clear the search or choose another category.'
            : 'Headlines aren’t loading right now. Try refreshing in a minute.'}
        </p>
      )}
      </>}
    </div>
  )
}
