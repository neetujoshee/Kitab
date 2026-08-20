import React, { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { coverUrl, olKeyToSlug } from '../lib/openlibrary'
import RatingStars from './RatingStars'

type Review = {
  id: string
  user_id: string
  username: string
  name: string
  avatar_url?: string
  book_ol_key: string
  book_title: string
  book_cover_id?: number
  rating?: number
  content: string
  has_spoilers: boolean
  likes_count: number
  created_at: string
}

type Props = { review: Review; showBook?: boolean }

export default function ReviewCard({ review, showBook = false }: Props) {
  const { data: session } = useSession()
  const [spoilerRevealed, setSpoilerRevealed] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(review.likes_count)

  const handleLike = async () => {
    if (!session) return
    const action = liked ? 'unlike' : 'like'
    await fetch('/api/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: review.id, action }),
    })
    setLiked(!liked)
    setLikeCount(c => liked ? c - 1 : c + 1)
  }

  const initials = (review.name || review.username || '?')[0].toUpperCase()
  const date = new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const slug = olKeyToSlug(review.book_ol_key)

  return (
    <div className="card-hover p-5 animate-up group"
         style={{ transition: 'transform 0.25s var(--ease-spring), box-shadow 0.25s ease, border-color 0.2s ease' }}>
      <div className="flex gap-3">
        {/* Avatar */}
        <Link href={`/user/${review.username}`} className="shrink-0">
          {review.avatar_url
            ? <img src={review.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
            : <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-sm font-bold text-gray-900">{initials}</div>
          }
        </Link>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Link href={`/user/${review.username}`} className="font-semibold text-sm text-gray-100 hover:text-brand-500">
              {review.name || review.username}
            </Link>
            {showBook && review.book_title && (
              <span className="text-gray-500 text-sm">
                reviewed <Link href={`/book/${slug}`} className="text-gray-300 hover:text-brand-500">{review.book_title}</Link>
              </span>
            )}
            <span className="text-gray-600 text-xs ml-auto">{date}</span>
          </div>

          {review.rating && (
            <div className="mt-1">
              <RatingStars value={review.rating} size={14} readonly />
            </div>
          )}

          {/* Content */}
          <div className="mt-2 text-sm text-gray-300 leading-relaxed">
            {review.has_spoilers && !spoilerRevealed ? (
              <div>
                <span className="text-xs text-yellow-500 font-medium">⚠ This review contains spoilers.</span>
                <button
                  onClick={() => setSpoilerRevealed(true)}
                  className="ml-2 text-xs underline text-gray-400 hover:text-gray-200"
                >
                  Reveal
                </button>
              </div>
            ) : (
              <p className="whitespace-pre-line">{review.content}</p>
            )}
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                liked ? 'text-red-400' : 'text-gray-500 hover:text-red-400'
              }`}
            >
              <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {likeCount > 0 && likeCount}
            </button>
          </div>
        </div>

        {/* Book cover thumbnail */}
        {showBook && review.book_cover_id && (
          <Link href={`/book/${slug}`} className="shrink-0">
            <img
              src={coverUrl(review.book_cover_id, 'S')}
              alt=""
              className="w-10 h-14 object-cover rounded shadow"
            />
          </Link>
        )}
      </div>
    </div>
  )
}
