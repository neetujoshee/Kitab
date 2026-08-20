import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Navbar from '../../components/Navbar'
import ReviewCard from '../../components/ReviewCard'
import RatingStars from '../../components/RatingStars'
import { coverUrl, bookCoverUrl, olKeyToSlug } from '../../lib/openlibrary'
import { CURATED_BOOKS, curatedToOLBook } from '../../lib/curated-books'

// ISBNs for the banner mosaic
const BANNER_ISBNS = [
  '9780439708180','9780141439518','9780261102217','9780307588371',
  '9780441013593','9780062315007','9780525478812','9780735211292',
  '9780439023481','9780553418026','9780062316097','9780375842207',
]

type UserData = {
  user: { id: string; username: string; name: string; bio?: string; avatar_url?: string; location?: string; website?: string }
  stats: { books_read: string; reviews_count: string; followers: string; following: string; lists_count: string }
  favorites: any[]
  recentReviews: any[]
}

type DiaryEntry = {
  id: string; book_ol_key: string; book_title: string; book_cover_id?: number
  entry_type: string; rating?: number; content?: string; logged_at: string
}

type StatsData = {
  overview: { books_read: number; reading_now: number; want_to_read: number; dnf: number; reviews_count: number; avg_rating: number; ratings_count: number }
  byMonth: { month: string; count: number }[]
  ratingDist: { star: string; count: number }[]
}

const TABS = ['Reviews', 'Books', 'Diary', 'Stats'] as const
type Tab = typeof TABS[number]

const ENTRY_LABELS: Record<string, { text: string; color: string }> = {
  started:  { text: 'started reading', color: '#60a5fa' },
  finished: { text: 'finished',        color: '#4ade80' },
  dnf:      { text: 'did not finish',  color: '#f87171' },
  progress: { text: 'made progress',   color: '#c084fc' },
  reread:   { text: 're-read',         color: '#f5c842' },
}

export default function UserProfile() {
  const router = useRouter()
  const { data: session } = useSession()
  const username = router.query.username as string

  const [data, setData] = useState<UserData | null>(null)
  const [books, setBooks] = useState<any[]>([])
  const [diary, setDiary] = useState<DiaryEntry[]>([])
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('Reviews')
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  const me = (session?.user as any)?.username
  const isMe = me === username

  useEffect(() => {
    if (!username) return
    setLoading(true)
    Promise.all([
      fetch(`/api/users/${username}`).then(r => r.json()),
      fetch(`/api/reading-status?username=${username}`).then(r => r.json()),
    ]).then(([ud, statusData]) => {
      setData(ud)
      setBooks(Array.isArray(statusData) ? statusData : [])
    }).finally(() => setLoading(false))
    if (session && !isMe) {
      fetch(`/api/follow?username=${username}`).then(r => r.json()).then(d => setIsFollowing(d.following))
    }
  }, [username, session])

  useEffect(() => {
    if (!username || tab !== 'Diary') return
    fetch(`/api/diary?username=${username}&limit=40`)
      .then(r => r.json()).then(d => setDiary(Array.isArray(d) ? d : []))
  }, [username, tab])

  useEffect(() => {
    if (!username || tab !== 'Stats') return
    fetch(`/api/stats?username=${username}`)
      .then(r => r.json()).then(d => setStatsData(d))
  }, [username, tab])

  const handleFollow = async () => {
    if (!session) { router.push('/auth/signin'); return }
    setFollowLoading(true)
    await fetch('/api/follow', {
      method: isFollowing ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    setIsFollowing(f => !f)
    setFollowLoading(false)
  }

  if (loading) return (
    <>
      <Navbar />
      <div style={{ height: '220px', background: '#0f0f1c' }} className="animate-pulse" />
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-4">
        <div className="w-24 h-24 rounded-full skeleton -mt-12" />
        <div className="h-6 w-48 skeleton rounded" />
        <div className="h-4 w-32 skeleton rounded" />
      </div>
    </>
  )

  if (!data?.user) return (
    <>
      <Navbar />
      <div className="text-center py-32 text-muted">User not found.</div>
    </>
  )

  const { user, stats, favorites, recentReviews } = data
  const initials = (user.name || user.username || '?')[0].toUpperCase()
  const readBooks   = books.filter(b => b.status === 'read')
  const readingBooks = books.filter(b => b.status === 'reading')
  const wantBooks   = books.filter(b => b.status === 'want-to-read')

  return (
    <>
      <Head><title>{user.name || user.username} · Kitab</title></Head>
      <Navbar />

      {/* ── Banner ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ height: '200px', background: '#07070f' }}>
        {/* Book cover mosaic */}
        <div className="absolute inset-0 flex gap-1" style={{ filter: 'blur(1px)', transform: 'scale(1.05)' }}>
          {BANNER_ISBNS.map(isbn => (
            <div key={isbn} className="flex-1 min-w-0" style={{ minWidth: '80px' }}>
              <img
                src={`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`}
                alt=""
                style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
              />
            </div>
          ))}
        </div>
        {/* Overlays */}
        <div className="absolute inset-0" style={{ background: 'rgba(7,7,15,0.55)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(7,7,15,0.9) 80%, #07070f 100%)' }} />
        {/* Ambient gold */}
        <div className="absolute" style={{
          top: '-60px', left: '50%', transform: 'translateX(-50%)',
          width: '500px', height: '300px',
          background: 'radial-gradient(ellipse, rgba(245,200,66,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      </div>

      <main className="max-w-4xl mx-auto px-4 pb-16">
        {/* ── Profile header (overlaps banner) ── */}
        <div className="-mt-16 relative z-10 flex flex-col sm:flex-row gap-5 items-end sm:items-end animate-up">

          {/* Avatar */}
          <div className="shrink-0" style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))' }}>
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                className="w-24 h-24 rounded-full object-cover"
                style={{ border: '3px solid #07070f', outline: '2px solid rgba(245,200,66,0.4)' }}
                alt=""
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black text-gray-900"
                style={{
                  background: 'linear-gradient(135deg, #f5c842, #ffb347)',
                  border: '3px solid #07070f',
                  outline: '2px solid rgba(245,200,66,0.3)',
                }}
              >
                {initials}
              </div>
            )}
          </div>

          {/* Name + actions */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div>
                <h1 className="font-display font-black text-white text-2xl" style={{ letterSpacing: '-0.02em' }}>
                  {user.name || user.username}
                </h1>
                <p className="text-muted text-sm">@{user.username}</p>
              </div>
              <div className="flex gap-2">
                {isMe ? (
                  <Link href="/settings" className="btn-sm btn-outline">Edit profile</Link>
                ) : session && (
                  <>
                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`btn-sm ${isFollowing ? 'btn-outline' : 'btn-gold'}`}
                    >
                      {isFollowing ? 'Following' : '+ Follow'}
                    </button>
                    <Link href={`/messages/${username}`} className="btn-sm btn-outline flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Message
                    </Link>
                  </>
                )}
                <Link href={`/diary/${username}`} className="btn-sm btn-outline">Diary</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bio + meta */}
        <div className="mt-4 animate-up" style={{ animationDelay: '0.05s' }}>
          {user.bio && (
            <p className="text-gray-300 text-sm leading-relaxed max-w-xl mb-3">{user.bio}</p>
          )}
          {(user.location || user.website) && (
            <div className="flex gap-4 text-xs text-muted mb-3">
              {user.location && <span>📍 {user.location}</span>}
              {user.website && <a href={user.website} className="hover:text-accent transition-colors" target="_blank" rel="noopener noreferrer">🔗 {user.website}</a>}
            </div>
          )}
        </div>

        {/* ── Stat pills ── */}
        <div
          className="flex gap-0 rounded-2xl overflow-hidden mb-8 animate-up"
          style={{ border: '1px solid rgba(255,255,255,0.07)', animationDelay: '0.08s' }}
        >
          {[
            { value: stats.books_read,    label: 'books read',  accent: '#f5c842' },
            { value: stats.reviews_count, label: 'reviews',     accent: '#c084fc' },
            { value: stats.followers,     label: 'followers',   accent: '#60a5fa' },
            { value: stats.following,     label: 'following',   accent: '#4ade80' },
          ].map(({ value, label, accent }, i) => (
            <div
              key={label}
              className="flex-1 py-4 text-center"
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              }}
            >
              <div className="font-display font-black text-xl" style={{ color: Number(value) > 0 ? accent : 'rgba(255,255,255,0.2)', letterSpacing: '-0.02em' }}>
                {value}
              </div>
              <div className="text-[11px] text-muted uppercase tracking-wide mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Currently reading ── */}
        {readingBooks.length > 0 && (
          <div className="mb-8 animate-up" style={{ animationDelay: '0.1s' }}>
            <p className="text-xs text-muted uppercase tracking-widest mb-4">Currently reading</p>
            <div className="flex gap-3 flex-wrap">
              {readingBooks.map(b => (
                <Link
                  key={b.book_ol_key}
                  href={`/book/${olKeyToSlug(b.book_ol_key)}`}
                  className="group flex items-center gap-3 rounded-xl p-3 hover:border-accent/30 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="rounded-lg overflow-hidden shadow-md shrink-0" style={{ width: '40px', aspectRatio: '2/3' }}>
                    <img src={coverUrl(b.book_cover_id, 'S')} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white group-hover:text-accent transition-colors line-clamp-2 max-w-[120px]">{b.book_title}</p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                      <span className="text-[10px] text-blue-400 font-medium">Reading</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Favorites ── */}
        {favorites.length > 0 && (
          <div className="mb-8 animate-up" style={{ animationDelay: '0.12s' }}>
            <p className="text-xs text-muted uppercase tracking-widest mb-4">Favorite books</p>
            <div className="flex gap-2 flex-wrap">
              {favorites.map(f => (
                <Link key={f.book_ol_key} href={`/book/${olKeyToSlug(f.book_ol_key)}`} title={f.book_title}
                  className="group">
                  <div className="rounded-xl overflow-hidden shadow-lg" style={{ width: '64px', aspectRatio: '2/3' }}>
                    <img
                      src={coverUrl(f.book_cover_id, 'M')}
                      alt={f.book_title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex border-b mb-7 animate-up" style={{ borderColor: 'rgba(255,255,255,0.07)', animationDelay: '0.15s' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-5 py-2.5 text-sm font-semibold transition-all duration-200 -mb-px"
              style={{
                color: tab === t ? '#f5c842' : 'rgba(255,255,255,0.35)',
                borderBottom: tab === t ? '2px solid #f5c842' : '2px solid transparent',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Reviews tab ── */}
        {tab === 'Reviews' && (
          <div className="space-y-3 stagger">
            {recentReviews.length === 0 ? (
              <EmptyTab
                icon="✍️"
                title="No reviews yet."
                subtitle={isMe ? 'Finish a book and share your thoughts.' : `${user.name || user.username} hasn't reviewed any books yet.`}
              />
            ) : recentReviews.map(r => <ReviewCard key={r.id} review={r} showBook />)}
          </div>
        )}

        {/* ── Books tab ── */}
        {tab === 'Books' && (
          <div className="space-y-10 stagger">
            {[
              { label: 'Read',         items: readBooks,  dot: '#4ade80', count: stats.books_read },
              { label: 'Want to Read', items: wantBooks,  dot: '#c084fc', count: String(wantBooks.length) },
            ].map(({ label, items, dot, count }) => items.length > 0 && (
              <div key={label}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
                  <p className="text-xs text-muted uppercase tracking-widest font-semibold">{label}</p>
                  <span className="text-xs text-muted">({count})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.slice(0, 24).map(b => (
                    <Link key={b.book_ol_key} href={`/book/${olKeyToSlug(b.book_ol_key)}`} title={b.book_title}
                      className="group">
                      <div className="rounded-lg overflow-hidden shadow-md" style={{ width: '56px', aspectRatio: '2/3' }}>
                        <img
                          src={coverUrl(b.book_cover_id, 'S')}
                          alt={b.book_title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    </Link>
                  ))}
                  {items.length > 24 && (
                    <div className="rounded-lg flex items-center justify-center text-xs text-muted font-semibold"
                         style={{ width: '56px', aspectRatio: '2/3', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      +{items.length - 24}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {books.length === 0 && (
              <EmptyTab icon="📚" title="No books tracked yet."
                subtitle={isMe ? 'Log your first book to start your shelf.' : undefined} />
            )}
          </div>
        )}

        {/* ── Diary tab ── */}
        {tab === 'Diary' && (
          diary.length === 0
            ? <EmptyTab icon="📔" title="No diary entries yet."
                subtitle={isMe ? 'Start logging your reads.' : undefined} />
            : (
              <div className="stagger">
                <div className="space-y-1.5 mb-5">
                  {diary.slice(0, 20).map(e => {
                    const verb = ENTRY_LABELS[e.entry_type] || { text: e.entry_type, color: '#9ca3af' }
                    const date = new Date(e.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    return (
                      <Link key={e.id} href={`/book/${olKeyToSlug(e.book_ol_key)}`}
                        className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
                        <div className="rounded overflow-hidden shadow shrink-0" style={{ width: '32px', aspectRatio: '2/3' }}>
                          <img src={coverUrl(e.book_cover_id, 'S')} alt=""
                            className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white group-hover:text-accent transition-colors line-clamp-1 font-medium">
                            {e.book_title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-medium" style={{ color: verb.color }}>{verb.text}</span>
                            {e.rating && <span className="text-[11px] text-muted">· {e.rating}★</span>}
                          </div>
                        </div>
                        <span className="text-[11px] text-muted shrink-0">{date}</span>
                      </Link>
                    )
                  })}
                </div>
                <Link href={`/diary/${username}`}
                  className="btn-md btn-outline w-full text-center block">
                  View full diary →
                </Link>
              </div>
            )
        )}

        {/* ── Stats tab ── */}
        {tab === 'Stats' && (
          statsData ? (
            <div className="space-y-8 stagger">
              {/* Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Books Read',   value: statsData.overview?.books_read ?? 0,    color: '#f5c842' },
                  { label: 'Avg Rating',   value: statsData.overview?.avg_rating ? `${Number(statsData.overview.avg_rating).toFixed(1)}★` : '—', color: '#ffb347' },
                  { label: 'Reviews',      value: statsData.overview?.reviews_count ?? 0,  color: '#c084fc' },
                  { label: 'Want to Read', value: statsData.overview?.want_to_read ?? 0,   color: '#60a5fa' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="card p-5 text-center">
                    <div className="font-display font-black text-3xl" style={{ color, letterSpacing: '-0.02em' }}>{value}</div>
                    <div className="text-[11px] text-muted mt-1 uppercase tracking-wider">{label}</div>
                  </div>
                ))}
              </div>

              {/* Monthly chart */}
              {statsData.byMonth?.length > 0 && (
                <div>
                  <p className="text-xs text-muted uppercase tracking-widest mb-5">Books finished · last 12 months</p>
                  <div className="flex items-end gap-1.5 h-28">
                    {statsData.byMonth.map(({ month, count }) => {
                      const max = Math.max(...statsData.byMonth.map(m => m.count))
                      const pct = max ? (count / max) * 100 : 0
                      return (
                        <div key={month} className="flex-1 flex flex-col items-center gap-1.5 group cursor-default">
                          <span className="text-[10px] text-accent font-bold opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                          <div className="w-full rounded-t-lg transition-all duration-300 group-hover:opacity-80"
                               style={{
                                 height: `${Math.max(pct, pct > 0 ? 8 : 0)}%`,
                                 minHeight: pct > 0 ? '8px' : '0',
                                 background: pct > 0 ? 'linear-gradient(to top, #f5c842, #ffb347)' : 'rgba(255,255,255,0.05)',
                               }} />
                          <span className="text-[9px] text-muted">{month.slice(5)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Rating distribution */}
              {statsData.ratingDist?.length > 0 && (
                <div>
                  <p className="text-xs text-muted uppercase tracking-widest mb-4">Rating distribution</p>
                  <div className="space-y-2">
                    {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map(star => {
                      const found = statsData.ratingDist.find(r => parseFloat(r.star) === star)
                      if (!found) return null
                      const total = statsData.ratingDist.reduce((s, r) => s + r.count, 0)
                      const pct = total ? Math.round((found.count / total) * 100) : 0
                      return (
                        <div key={star} className="flex items-center gap-3 text-xs">
                          <span className="text-muted w-7 text-right tabular-nums">{star}★</span>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full transition-all duration-500"
                                 style={{ width: `${pct}%`, background: 'linear-gradient(to right, #f5c842, #ffb347)' }} />
                          </div>
                          <span className="text-muted w-8 tabular-nums">{pct}%</span>
                          <span className="text-muted/50 w-4 tabular-nums">{found.count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-muted text-sm animate-pulse">Loading stats…</div>
          )
        )}
      </main>
    </>
  )
}

function EmptyTab({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-3 animate-float inline-block">{icon}</div>
      <p className="text-white font-semibold text-base">{title}</p>
      {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
    </div>
  )
}
