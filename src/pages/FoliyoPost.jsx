import { useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, ChevronRight } from 'lucide-react'
import { foliyoPosts, FACEBOOK_PAGE } from '../data/foliyoPosts'
import { BrandLockup } from '../components/Navbar'

/* A short line with no closing punctuation reads as a section heading */
const isHeading = (line) =>
  line.length < 70 && !/[.?!:;,)။”"]$/.test(line) && !/^[-•*\d]/.test(line)

export function PostBody({ lines, lang }) {
  return (
    <div className={`space-y-4 ${lang === 'my' ? 'lang-my' : ''}`} lang={lang === 'my' ? 'my' : 'en'}>
      {lines.map((l, i) => isHeading(l) && i > 0
        ? <h2 key={i} className="text-[1.35rem] font-bold pt-3" style={{ color:'var(--text-1)' }}>{l}</h2>
        : <p key={i} className="text-[16px] leading-[1.75]" style={{ color:'var(--text-1)' }}>{l}</p>)}
    </div>
  )
}

export const excerpt = (lines, n = 180) => {
  const text = lines.filter(l => !isHeading(l)).join(' ')
  return text.length > n ? `${text.slice(0, n).replace(/\s+\S*$/, '')}…` : text
}

export function LangToggle({ lang, setLang }) {
  return (
    <div className="inline-flex p-1 rounded-full" style={{ background:'var(--bg-3)' }} role="group" aria-label="Language">
      {[['en', 'English'], ['my', 'မြန်မာ']].map(([k, l]) => (
        <button key={k} onClick={() => setLang(k)} aria-pressed={lang === k}
          className="px-3.5 py-1 rounded-full text-[13px] font-semibold transition-colors"
          style={lang === k ? { background:'var(--bg-0)', color:'var(--text-1)', boxShadow:'0 1px 3px rgba(var(--shadow-color),.15)' } : { color:'var(--text-2)' }}>
          <span className={k === 'my' ? 'lang-my' : ''} lang={k === 'my' ? 'my' : 'en'}>{l}</span>
        </button>
      ))}
    </div>
  )
}

export default function FoliyoPost() {
  const { slug } = useParams()
  const post = foliyoPosts.find(p => p.slug === slug)
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('foliyo_read_lang') || 'en' } catch { return 'en' } })
  if (!post) return <Navigate to="/news?tab=foliyo" replace />

  const choose = l => { setLang(l); try { localStorage.setItem('foliyo_read_lang', l) } catch {} }
  const v = post[lang]
  const more = foliyoPosts.filter(p => p.slug !== slug).slice(0, 5)

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-10">
      <article className="min-w-0 max-w-[720px]">
        <Link to="/news?tab=foliyo" className="inline-flex items-center gap-1.5 text-sm mb-6 hover:underline" style={{ color:'var(--text-2)' }}>
          <ArrowLeft size={14}/> Foliyo articles
        </Link>
        <div className="eyebrow mb-3">From Foliyo</div>
        <h1 className={`text-[2.2rem] sm:text-[2.8rem] font-bold leading-[1.08] ${lang === 'my' ? 'lang-my !leading-[1.5]' : ''}`}
          style={{ color:'var(--text-1)' }} lang={lang === 'my' ? 'my' : 'en'}>
          {v.title}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pb-5 border-b" style={{ borderColor:'var(--border)' }}>
          <div className="flex items-center gap-3">
            <BrandLockup size={20} />
            <span className="text-xs" style={{ color:'var(--text-3)' }}>Posted on Facebook</span>
          </div>
          <LangToggle lang={lang} setLang={choose} />
        </div>

        <div className="mt-7">
          <PostBody lines={v.body} lang={lang} />
        </div>

        <div className="mt-10 pt-6 border-t flex flex-wrap items-center gap-3" style={{ borderColor:'var(--border)' }}>
          {v.url && (
            <a href={v.url} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Read and comment on Facebook <ExternalLink size={14}/>
            </a>
          )}
          <a href={FACEBOOK_PAGE} target="_blank" rel="noopener noreferrer" className="btn-ghost">Follow Foliyo</a>
        </div>
        <p className="text-xs mt-4" style={{ color:'var(--text-3)' }}>For education, not financial advice.</p>
      </article>

      <aside className="space-y-4">
        <div className="rounded-xl border p-4" style={{ borderColor:'var(--border)' }}>
          <div className="section-title mb-2">More from Foliyo</div>
          <ul>
            {more.map(p => (
              <li key={p.slug} className="border-t first:border-t-0" style={{ borderColor:'var(--border)' }}>
                <Link to={`/news/foliyo/${p.slug}`} className="flex items-start justify-between gap-3 py-3 group">
                  <span className={`text-[14px] font-semibold leading-snug group-hover:underline ${lang === 'my' ? 'lang-my' : ''}`} style={{ color:'var(--text-1)' }}>
                    {p[lang].title}
                  </span>
                  <ChevronRight size={15} className="shrink-0 mt-0.5" style={{ color:'var(--text-3)' }}/>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
