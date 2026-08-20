import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Navbar from '../../components/Navbar'
import RatingStars from '../../components/RatingStars'
import { coverUrl, olKeyToSlug } from '../../lib/openlibrary'

type Entry = {
  id: string
  book_ol_key: string
  book_title: string
  book_cover_id?: number
  entry_type: 'started' | 'progress' | 'finished' | 'dnf' | 'reread'
  rating?: number
  content?: string
  pages_read?: number
  current_page?: number
  logged_at: string
}

const TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  started:  { label: 'Started reading',   color: 'badge-reading', icon: '📖' },
  progress: { label: 'Made progress',     color: 'badge-reading', icon: '📄' },
  finished: { label: 'Finished',          color: 'badge-read',    icon: '✓' },
  dnf:      { label: 'Did not finish',    color: 'badge-dnf',     icon: '✕' },
  reread:   { label: 'Re-read',           color: 'badge-read',    icon: '↻' },
}

function groupByMonth(entries: Entry[]) {
  const map = new Map<string, Entry[]>()
  for (const e of entries) {
    const d = new Date(e.logged_at)
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return map
}

export default function DiaryPage() {
  const router = useRouter()
  const { username } = router.query as { username: string }
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!username) return
    fetch(`/api/diary?username=${username}`)
      .then(r => r.json())
      .then(d => setEntries(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [username])

  const months = groupByMonth(entries)
  const finishedCount = entries.filter(e => e.entry_type === 'finished').length

  return (
    <>
      <Head><title>{username ? `${username}'s Diary` : 'Diary'} · Kitab</title></Head>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-10">
          <div>
            <Link href={`/user/${username}`} className="section-label hover:text-gray-300 transition-colors">
              ← {username}
            </Link>
            <h1 className="font-display text-4xl font-bold text-white mt-1">Reading Diary</h1>
            {!loading && <p className="text-muted text-sm mt-1">{finishedCount} books finished across {months.size} months</p>}
          </div>
        </div>

        {loading ? (
          <div className="space-y-8">
            {[1, 2].map(i => (
              <div key={i} className="space-y-3">
                <div className="h-4 w-32 bg-raised rounded animate-pulse" />
                {[1, 2, 3].map(j => <div key={j} className="h-20 bg-raised rounded-2xl animate-pulse" />)}
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📔</div>
            <p className="text-muted">No diary entries yet.</p>
            <p className="text-sm text-muted mt-1">Log a book to start your reading diary.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Array.from(months.entries()).map(([month, monthEntries]) => (
              <section key={month}>
                <div className="flex items-center gap-4 mb-5">
                  <h2 className="font-display text-xl font-bold text-white">{month}</h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted">{monthEntries.length} entries</span>
                </div>
                <div className="space-y-3">
                  {monthEntries.map(entry => <DiaryEntryCard key={entry.id} entry={entry} />)}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  )
}

function DiaryEntryCard({ entry }: { entry: Entry }) {
  const meta = TYPE_META[entry.entry_type] || TYPE_META.progress
  const date = new Date(entry.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const slug = olKeyToSlug(entry.book_ol_key)
  const [spoilerOpen, setSpoilerOpen] = useState(false)

  return (
    <div className="card p-4 flex gap-4 items-start animate-up group">
      {/* Cover */}
      <Link href={`/book/${slug}`} className="shrink-0">
        <img
          src={coverUrl(entry.book_cover_id, 'S')}
          alt={entry.book_title}
          className="w-10 h-14 object-cover rounded-lg shadow-md group-hover:shadow-accent/20 transition-shadow"
          onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }}
        />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/book/${slug}`} className="font-semibold text-sm text-gray-100 hover:text-accent transition-colors line-clamp-1">
              {entry.book_title || 'Unknown book'}
            </Link>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={meta.color}>{meta.icon} {meta.label}</span>
              {entry.rating && <RatingStars value={entry.rating} size={12} readonly />}
              {entry.pages_read && (
                <span className="text-xs text-muted">+{entry.pages_read} pages</span>
              )}
              {entry.current_page && !entry.pages_read && (
                <span className="text-xs text-muted">p. {entry.current_page}</span>
              )}
            </div>
          </div>
          <span className="text-xs text-muted shrink-0">{date}</span>
        </div>

        {entry.content && (
          <p className="text-xs text-gray-400 mt-2 leading-relaxed line-clamp-3">{entry.content}</p>
        )}
      </div>
    </div>
  )
}
