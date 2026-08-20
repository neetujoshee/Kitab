import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { bookCoverUrl } from '../lib/openlibrary'
import RatingStars from './RatingStars'

type Book = { ol_key: string; title: string; author_names: string[]; cover_id?: number }
type Status = 'read' | 'reading' | 'want-to-read' | 'dnf'

const STATUS_OPTS: { value: Status; label: string; icon: string; color: string }[] = [
  { value: 'read',         label: 'Read',             icon: '✓', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  { value: 'reading',      label: 'Reading',          icon: '📖', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { value: 'want-to-read', label: 'Want to Read',     icon: '🔖', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { value: 'dnf',          label: 'Did Not Finish',   icon: '✕', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
]

type Props = { onClose: () => void }

export default function LogBookModal({ onClose }: Props) {
  const { data: session } = useSession()
  const [step, setStep] = useState<'search' | 'log'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Book[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Book | null>(null)
  const [status, setStatus] = useState<Status>('read')
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [hasSpoilers, setHasSpoilers] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => { searchRef.current?.focus() }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/books?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults((data.docs || []).slice(0, 8))
    } finally { setSearching(false) }
  }, [])

  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => search(query), 320)
    return () => clearTimeout(timer.current)
  }, [query, search])

  const selectBook = (book: Book) => {
    setSelected(book)
    setStep('log')
  }

  const handleSubmit = async () => {
    if (!selected || !session) return
    setSubmitting(true)
    await fetch('/api/reading-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookKey: selected.ol_key,
        status,
        bookTitle: selected.title,
        bookCoverId: selected.cover_id,
        bookAuthor: selected.author_names?.[0],
        finishedAt: status === 'read' ? date : null,
        startedAt: status === 'reading' ? date : null,
      }),
    })
    if (rating > 0) {
      await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookKey: selected.ol_key, rating }),
      })
    }
    if (note.trim()) {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookKey: selected.ol_key,
          bookTitle: selected.title,
          bookCoverId: selected.cover_id,
          rating: rating || null,
          content: note.trim(),
          hasSpoilers,
        }),
      })
    }
    setDone(true)
    setTimeout(onClose, 1200)
  }

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  if (done) return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card p-10 text-center animate-spring max-w-sm w-full">
        <div className="text-6xl mb-4 animate-float">✓</div>
        <p className="text-xl font-bold text-white font-display">Logged!</p>
        <p className="text-sm text-muted mt-2">{selected?.title}</p>
      </div>
    </div>
  )

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-lg animate-spring overflow-hidden" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            {step === 'log' && (
              <button onClick={() => setStep('search')} className="btn-md btn-ghost p-1.5 -ml-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <span className="font-display text-lg font-bold text-white">
              {step === 'search' ? 'Log a book' : 'Log details'}
            </span>
          </div>
          <button onClick={onClose} className="btn-md btn-ghost p-1.5 text-muted">✕</button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 64px)' }}>
          {/* ── Step 1: Search ── */}
          {step === 'search' && (
            <div className="p-6 space-y-4">
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by title or author…"
                  className="input pl-10"
                />
              </div>
              {searching && <p className="text-sm text-muted text-center py-4">Searching…</p>}
              {results.length > 0 && (
                <div className="space-y-1">
                  {results.map(book => (
                    <button
                      key={book.ol_key}
                      onClick={() => selectBook(book)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-raised transition-colors text-left"
                    >
                      <img
                        src={bookCoverUrl(book, 'S')}
                        alt=""
                        className="w-9 h-12 object-cover rounded-md shrink-0"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-100 line-clamp-1">{book.title}</p>
                        <p className="text-xs text-muted line-clamp-1">{book.author_names?.join(', ')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {query.length >= 2 && !searching && results.length === 0 && (
                <p className="text-sm text-muted text-center py-6">No results found.</p>
              )}
            </div>
          )}

          {/* ── Step 2: Log ── */}
          {step === 'log' && selected && (
            <div className="p-6 space-y-6">
              {/* Selected book */}
              <div className="flex items-center gap-3">
                <img
                  src={bookCoverUrl(selected, 'M')}
                  alt=""
                  className="w-12 h-16 object-cover rounded-lg shrink-0 shadow-lg"
                />
                <div>
                  <p className="font-semibold text-white">{selected.title}</p>
                  <p className="text-sm text-muted">{selected.author_names?.join(', ')}</p>
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="section-label mb-2">Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        status === opt.value ? opt.color : 'border-border text-muted hover:border-white/20'
                      }`}
                    >
                      <span>{opt.icon}</span> {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <p className="section-label mb-2">
                  {status === 'read' ? 'Date finished' : status === 'reading' ? 'Date started' : 'Date'}
                </p>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="input w-full"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Rating */}
              {(status === 'read' || status === 'dnf') && (
                <div>
                  <p className="section-label mb-2">Rating</p>
                  <RatingStars value={rating} size={28} onChange={setRating} />
                  {rating > 0 && (
                    <button onClick={() => setRating(0)} className="text-xs text-muted hover:text-gray-300 mt-1">Clear rating</button>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="section-label mb-2">Review / notes <span className="text-[10px] text-muted normal-case tracking-normal">(optional)</span></p>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="What did you think?"
                  rows={4}
                  className="input resize-none"
                />
                {note.trim().length > 0 && (
                  <label className="flex items-center gap-2 mt-2 text-xs text-muted cursor-pointer">
                    <input type="checkbox" checked={hasSpoilers} onChange={e => setHasSpoilers(e.target.checked)} className="rounded" />
                    Contains spoilers
                  </label>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-lg btn-gold w-full"
              >
                {submitting ? 'Logging…' : 'Log book'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
