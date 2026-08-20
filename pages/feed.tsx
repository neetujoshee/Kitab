import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Navbar from '../components/Navbar'
import ReviewCard from '../components/ReviewCard'
import { bookCoverUrl, olKeyToSlug } from '../lib/openlibrary'
import { CURATED_BOOKS, curatedToOLBook } from '../lib/curated-books'

const TABS = [
  { key: 'following', label: 'Following' },
  { key: 'popular',   label: 'Popular'   },
  { key: 'recent',    label: 'Recent'    },
] as const
type Tab = 'following' | 'popular' | 'recent'

const ENTRY_VERBS: Record<string, { label: string; color: string }> = {
  started:  { label: 'started reading',  color: '#60a5fa' },
  progress: { label: 'made progress in', color: '#c084fc' },
  finished: { label: 'finished',         color: '#4ade80' },
  dnf:      { label: 'did not finish',   color: '#f87171' },
  reread:   { label: 're-read',          color: '#f5c842' },
}

// Pick 9 visually diverse books for the featured grid
const FEATURED_BOOKS = [0, 5, 10, 15, 20, 25, 30, 35, 40]
  .map(i => CURATED_BOOKS[i]).filter(Boolean).slice(0, 9)
  .map(curatedToOLBook)

// 3 picks for sidebar
const SIDEBAR_PICKS = [2, 18, 44]
  .map(i => CURATED_BOOKS[i]).filter(Boolean)

function ActivityItem({ item }: { item: any }) {
  const slug = olKeyToSlug(item.book_ol_key)
  const verb = ENTRY_VERBS[item.entry_type] || { label: item.entry_type, color: '#9ca3af' }
  const date = new Date(item.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const initials = (item.name || item.username || '?')[0].toUpperCase()
  const isFinished = item.entry_type === 'finished'

  return (
    <article
      className="card-hover flex gap-4 p-4 group"
      style={{ borderLeft: isFinished ? '2px solid rgba(245,200,66,0.5)' : '2px solid transparent' }}
    >
      <Link href={`/user/${item.username}`} className="shrink-0 mt-0.5">
        {item.avatar_url
          ? <img src={item.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
          : <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-gray-900"
               style={{ background: 'linear-gradient(135deg,#f5c842,#ffb347)' }}>{initials}</div>
        }
      </Link>

      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <Link href={`/user/${item.username}`}
            className="font-bold text-white hover:text-accent transition-colors">
            {item.name || item.username}
          </Link>
          {' '}
          <span className="font-medium" style={{ color: verb.color }}>{verb.label}</span>
        </p>
        <Link href={`/book/${slug}`}
          className="text-sm text-gray-300 hover:text-accent transition-colors font-medium line-clamp-1 mt-0.5 block">
          {item.book_title}
        </Link>
        {item.content && (
          <p className="text-xs text-muted italic mt-1.5 line-clamp-2 leading-relaxed">"{item.content}"</p>
        )}
        <p className="text-[11px] text-muted/50 mt-1.5">{date}</p>
      </div>

      {(item.book_cover_id || item.book_cover_isbn) && (
        <Link href={`/book/${slug}`} className="shrink-0">
          <div className="rounded overflow-hidden shadow-lg group-hover:shadow-accent/10 transition-shadow"
               style={{ width: 40, aspectRatio: '2/3' }}>
            <img
              src={bookCoverUrl({ cover_id: item.book_cover_id, cover_isbn: item.book_cover_isbn }, 'S')}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>
      )}
    </article>
  )
}

function FeaturedBookCard({ book, raw }: { book: ReturnType<typeof curatedToOLBook>; raw: typeof CURATED_BOOKS[0] }) {
  const slug = olKeyToSlug(book.ol_key)
  return (
    <Link href={`/book/${slug}`} className="group block">
      <div className="relative overflow-hidden rounded-xl shadow-lg"
           style={{ aspectRatio: '2/3', background: '#1a1a2e' }}>
        <img
          src={bookCoverUrl(book, 'M')}
          alt={raw.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
             style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)' }}>
          <p className="text-white text-xs font-bold line-clamp-2 leading-snug">{raw.title}</p>
          <p className="text-muted text-[11px] mt-0.5 line-clamp-1">{raw.author}</p>
          <span className="mt-2 inline-block text-[10px] font-bold text-accent uppercase tracking-wider">View book →</span>
        </div>
      </div>
    </Link>
  )
}

export default function Feed() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('following')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  const username = (session?.user as any)?.username

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/auth/signin'); return }
    if (status !== 'authenticated') return
    setLoading(true)
    fetch(`/api/feed?tab=${tab}&limit=40`)
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [tab, status])

  useEffect(() => {
    if (status !== 'authenticated' || !username) return
    fetch(`/api/stats?username=${username}`)
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {})
  }, [status, username])

  const ov = stats?.overview
  const booksRead = ov?.books_read ?? 0
  const readingNow = ov?.reading_now ?? 0

  return (
    <>
      <Head><title>Feed · Kitab</title></Head>
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── Compact header strip ─────────────────────────────── */}
        <div className="flex items-center justify-between mb-7 animate-up">
          <div>
            <p className="text-xs text-muted uppercase tracking-widest mb-0.5">{greeting}</p>
            <h1 className="font-display font-black text-2xl text-white" style={{ letterSpacing: '-0.02em' }}>
              {username}'s{' '}
              <span style={{ background: 'linear-gradient(135deg,#f5c842,#ffb347)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                reading feed
              </span>
            </h1>
          </div>

          {/* Stat pills */}
          <div className="hidden sm:flex items-center gap-3">
            {ov && (
              <>
                <div className="px-4 py-2 rounded-full text-sm font-semibold"
                     style={{ background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.2)', color: '#f5c842' }}>
                  {booksRead} read
                </div>
                {readingNow > 0 && (
                  <div className="px-4 py-2 rounded-full text-sm font-semibold"
                       style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa' }}>
                    {readingNow} reading now
                  </div>
                )}
              </>
            )}
            <Link href="/discover" className="btn-md btn-gold">+ Log a book</Link>
          </div>
        </div>

        <div className="flex gap-8 items-start">

          {/* ── Main column ──────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Tab bar */}
            <div className="flex border-b mb-6" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="px-5 py-2.5 text-sm font-semibold transition-all duration-200 -mb-px"
                  style={{
                    color: tab === t.key ? '#f5c842' : 'rgba(255,255,255,0.35)',
                    borderBottom: tab === t.key ? '2px solid #f5c842' : '2px solid transparent',
                    letterSpacing: '0.01em',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Loading ── */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="card p-4 flex gap-4">
                    <div className="w-9 h-9 skeleton rounded-full shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 skeleton rounded w-1/2" />
                      <div className="h-3 skeleton rounded w-2/3" />
                    </div>
                    <div className="w-10 skeleton rounded" style={{ aspectRatio: '2/3' }} />
                  </div>
                ))}
              </div>

            ) : items.length > 0 ? (
              /* ── Has activity ── */
              <div className="space-y-2 stagger">
                {items.map(item => (
                  item.entry_type
                    ? <ActivityItem key={item.id} item={item} />
                    : <ReviewCard key={item.id} review={item} showBook />
                ))}
              </div>

            ) : (
              /* ── Empty state: book covers immediately visible ── */
              <div className="animate-up">

                {/* CTA banner */}
                <div
                  className="flex items-center justify-between gap-4 rounded-2xl p-5 mb-8"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,200,66,0.07) 0%, rgba(168,85,247,0.05) 100%)',
                    border: '1px solid rgba(245,200,66,0.15)',
                  }}
                >
                  <div>
                    <p className="font-display font-bold text-white text-lg" style={{ letterSpacing: '-0.01em' }}>
                      {tab === 'following' ? 'Your feed is empty for now.' : 'Nothing here yet.'}
                    </p>
                    <p className="text-muted text-sm mt-0.5">
                      {tab === 'following'
                        ? 'Log a book or follow readers to see activity.'
                        : 'Activity will appear here as readers log books.'}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href="/discover" className="btn-md btn-gold whitespace-nowrap">Browse books</Link>
                  </div>
                </div>

                {/* Featured book grid — visible immediately, no scrolling required */}
                <p className="text-xs text-muted uppercase tracking-widest mb-4">Handpicked for you</p>
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {FEATURED_BOOKS.map((book, i) => (
                    <FeaturedBookCard
                      key={book.ol_key}
                      book={book}
                      raw={CURATED_BOOKS[[0,5,10,15,20,25,30,35,40][i]]}
                    />
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <Link href="/discover"
                    className="text-sm text-muted hover:text-accent transition-colors font-medium">
                    See all books by genre →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ──────────────────────────────────────────── */}
          <div className="hidden lg:flex flex-col gap-5 shrink-0 animate-up" style={{ width: '252px', animationDelay: '0.1s' }}>

            {/* Stats */}
            {ov && (
              <div className="card p-5">
                <p className="text-xs text-muted uppercase tracking-widest mb-4">Your reading</p>
                <div className="space-y-3">
                  {[
                    { label: 'Books read',    value: ov.books_read ?? 0,    accent: '#f5c842' },
                    { label: 'Reading now',   value: ov.reading_now ?? 0,   accent: '#60a5fa' },
                    { label: 'Want to read',  value: ov.want_to_read ?? 0,  accent: '#c084fc' },
                    { label: 'Reviews',       value: ov.reviews_count ?? 0, accent: '#4ade80' },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-muted">{label}</span>
                      <span className="font-display font-bold text-base" style={{ color: value > 0 ? accent : 'rgba(255,255,255,0.2)' }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                <Link href={`/user/${username}`}
                  className="mt-4 pt-4 block text-center text-xs text-muted hover:text-accent transition-colors"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  View full profile →
                </Link>
              </div>
            )}

            {/* Today's picks — shows covers */}
            <div>
              <p className="text-xs text-muted uppercase tracking-widest mb-3">Today's picks</p>
              <div className="space-y-2">
                {SIDEBAR_PICKS.map(raw => {
                  const book = curatedToOLBook(raw)
                  const slug = olKeyToSlug(book.ol_key)
                  return (
                    <Link
                      key={raw.isbn}
                      href={`/book/${slug}`}
                      className="card-hover flex gap-3 p-3 group items-start"
                    >
                      <div className="rounded-lg overflow-hidden shadow-md shrink-0"
                           style={{ width: 46, aspectRatio: '2/3' }}>
                        <img
                          src={bookCoverUrl(book, 'S')}
                          alt={raw.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                          {raw.title}
                        </p>
                        <p className="text-[11px] text-muted mt-0.5 line-clamp-1">{raw.author}</p>
                        <span
                          className="text-[10px] mt-1.5 inline-block px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(245,200,66,0.1)', color: '#f5c842' }}>
                          {raw.genre}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Reading diary CTA */}
            <Link
              href={`/diary/${username}`}
              className="card-hover p-4 flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: 'rgba(245,200,66,0.1)' }}>
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-accent transition-colors">Reading Diary</p>
                <p className="text-xs text-muted">All your entries</p>
              </div>
              <svg className="w-4 h-4 text-muted ml-auto group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

          </div>
        </div>
      </div>
    </>
  )
}
