import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Navbar from '../../components/Navbar'
import RatingStars from '../../components/RatingStars'
import ReadingStatusButton from '../../components/ReadingStatusButton'
import ReviewCard from '../../components/ReviewCard'
import {
  bookCoverUrl,
  isIsbnKey,
  extractIsbn,
  fetchFullBook,
  fetchBookByIsbn,
  fetchWorkDetails,
  OLBook,
} from '../../lib/openlibrary'

type RatingStats = { avg: number; count: number; distribution: Record<number, number> }

export default function BookPage() {
  const router = useRouter()
  const { data: session } = useSession()

  // slug is e.g. 'OL82563W' or 'isbn_9780439708180'
  const slug = router.query.key as string

  const [book, setBook] = useState<Partial<OLBook> | null>(null)
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null)
  const [myRating, setMyRating] = useState<number>(0)
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewText, setReviewText] = useState('')
  const [hasSpoilers, setHasSpoilers] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setBook(null)

    const isIsbn = isIsbnKey(slug)
    const isbn = isIsbn ? extractIsbn(slug) : null
    // Key used for ratings / reviews storage (stable per book regardless of routing method)
    const bookKey = isIsbn ? `/isbn/${isbn}` : `/works/${slug}`

    const load = async () => {
      try {
        if (isIsbn && isbn) {
          // ── ISBN-routed book (curated list) ──────────────────────────────
          // Fetch edition data directly from OL — always the correct book.
          const { work_key, ...editionData } = await fetchBookByIsbn(isbn)

          setBook({ ...editionData, cover_isbn: isbn })

          // Enrich with work description & subjects once we have the work key
          if (work_key) {
            fetchWorkDetails(work_key).then(details =>
              setBook(prev => prev ? { ...prev, ...details } : details)
            )
          }
        } else {
          // ── OL Work-key routed book (from search results) ────────────────
          // Fetch directly from OL Works API — NOT via search (search returns wrong results).
          const workData = await fetchFullBook(`/works/${slug}`)
          setBook(workData)
        }

        // Ratings and reviews are keyed by bookKey
        const [rStats, revs] = await Promise.all([
          fetch(`/api/ratings?bookKey=${encodeURIComponent(bookKey)}`).then(r => r.json()),
          fetch(`/api/reviews?bookKey=${encodeURIComponent(bookKey)}&limit=20`).then(r => r.json()),
        ])
        setRatingStats(rStats)
        setReviews(Array.isArray(revs) ? revs : [])
      } catch (e) {
        console.error('Failed to load book', e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [slug])

  const bookKey = slug
    ? isIsbnKey(slug)
      ? `/isbn/${extractIsbn(slug)}`
      : `/works/${slug}`
    : ''

  const handleRate = async (v: number) => {
    if (!session) { router.push('/auth/signin'); return }
    setMyRating(v)
    await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookKey, rating: v }),
    })
    const res = await fetch(`/api/ratings?bookKey=${encodeURIComponent(bookKey)}`)
    setRatingStats(await res.json())
  }

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !reviewText.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookKey,
        bookTitle: book?.title,
        bookCoverId: book?.cover_id,
        rating: myRating || null,
        content: reviewText,
        hasSpoilers,
      }),
    })
    if (res.ok) {
      const r = await res.json()
      setReviews(prev => [
        { ...r, username: (session.user as any).username, name: session.user?.name, avatar_url: session.user?.image },
        ...prev,
      ])
      setReviewText('')
    }
    setSubmitting(false)
  }

  const totalRatings = ratingStats?.count || 0
  const avgRating = ratingStats?.avg || 0

  if (loading) return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-16 flex gap-8">
        <div className="w-48 h-72 skeleton rounded-xl shrink-0" />
        <div className="flex-1 space-y-4">
          <div className="h-8 w-2/3 skeleton rounded" />
          <div className="h-4 w-1/3 skeleton rounded" />
          <div className="h-4 w-1/2 skeleton rounded" />
          <div className="h-20 skeleton rounded mt-4" />
        </div>
      </div>
    </>
  )

  if (!book || !book.title) return (
    <>
      <Navbar />
      <div className="text-center py-32 animate-up">
        <div className="text-6xl mb-4">📚</div>
        <p className="text-muted">Book not found.</p>
      </div>
    </>
  )

  const cover = bookCoverUrl(book, 'L')

  return (
    <>
      <Head><title>{book.title} · Kitab</title></Head>
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-12 animate-up">
        <div className="flex flex-col md:flex-row gap-10">

          {/* LEFT: Cover + Actions */}
          <div className="shrink-0 flex flex-col gap-4 items-center md:items-start" style={{ width: '200px' }}>
            <div
              className="relative rounded-xl overflow-hidden shadow-2xl"
              style={{ width: '192px', aspectRatio: '2/3' }}
            >
              <img
                src={cover}
                alt={book.title}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = '/images/no-cover.png' }}
              />
            </div>

            {bookKey && (
              <ReadingStatusButton
                bookKey={bookKey}
                bookTitle={book.title}
                bookCoverId={book.cover_id}
                bookAuthor={book.author_names?.[0]}
              />
            )}

            <div className="w-full">
              <p className="text-xs text-gray-500 mb-1.5 text-center md:text-left">Your rating</p>
              <RatingStars value={myRating} size={24} onChange={handleRate} />
            </div>
          </div>

          {/* RIGHT: Info */}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-4xl font-black text-white mb-1 leading-tight"
                style={{ letterSpacing: '-0.02em' }}>
              {book.title}
            </h1>
            {book.subtitle && (
              <p className="text-lg text-gray-400 mb-2">{book.subtitle}</p>
            )}
            <p className="text-accent font-medium text-lg mb-4">
              {book.author_names?.join(', ') || 'Unknown author'}
            </p>

            {/* Meta */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted mb-6">
              {book.first_publish_year && <span>Published {book.first_publish_year}</span>}
              {book.page_count && <span>{book.page_count} pages</span>}
              {book.language && <span className="capitalize">{book.language}</span>}
            </div>

            {/* Community rating */}
            {totalRatings > 0 && (
              <div className="flex items-center gap-4 mb-6 p-4 card">
                <div className="text-center shrink-0">
                  <div className="text-4xl font-bold text-white font-display">{avgRating.toFixed(2)}</div>
                  <RatingStars value={avgRating} size={16} readonly className="mt-1" />
                  <div className="text-xs text-muted mt-1">{totalRatings.toLocaleString()} ratings</div>
                </div>
                <div className="flex-1">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = ratingStats?.distribution[star] || 0
                    const pct = totalRatings ? Math.round((count / totalRatings) * 100) : 0
                    return (
                      <div key={star} className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted w-4 text-right">{star}</span>
                        <div className="flex-1 bg-raised rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-accent h-2 rounded-full"
                            style={{ width: `${pct}%`, transition: 'width 0.5s ease' }}
                          />
                        </div>
                        <span className="text-xs text-muted w-8">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            {book.description && (
              <div className="mb-6">
                <h2 className="section-label mb-2">About this book</h2>
                <p className="text-gray-300 leading-relaxed text-sm">
                  {book.description.substring(0, 600)}
                  {book.description.length > 600 ? '…' : ''}
                </p>
              </div>
            )}

            {/* Genres / subjects */}
            {book.genres && book.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {book.genres.slice(0, 6).map(g => (
                  <span key={g} className="text-xs px-3 py-1 rounded-full border border-border text-muted">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Write review */}
            {session && (
              <div className="mb-8">
                <h2 className="font-display text-xl font-bold text-white mb-3">Write a Review</h2>
                <form onSubmit={handleReview} className="space-y-3">
                  <textarea
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    placeholder="What did you think?"
                    rows={4}
                    className="input resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasSpoilers}
                        onChange={e => setHasSpoilers(e.target.checked)}
                        className="rounded"
                      />
                      Contains spoilers
                    </label>
                    <button
                      type="submit"
                      disabled={submitting || !reviewText.trim()}
                      className="btn-md btn-gold disabled:opacity-50"
                    >
                      {submitting ? 'Posting…' : 'Post review'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Reviews */}
            <div>
              <h2 className="font-display text-2xl font-bold text-white mb-4">
                Reviews{' '}
                {reviews.length > 0 && (
                  <span className="text-muted font-normal text-lg">({reviews.length})</span>
                )}
              </h2>
              {reviews.length === 0 ? (
                <div className="text-muted text-center py-10 card">
                  {session ? 'Be the first to review this book.' : 'No reviews yet. Sign in to write one.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
