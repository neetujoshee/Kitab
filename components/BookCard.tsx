import React, { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { bookCoverUrl, olKeyToSlug } from '../lib/openlibrary'
import RatingStars from './RatingStars'

type Props = {
  book: {
    ol_key: string
    title: string
    author_names?: string[]
    cover_id?: number
    cover_isbn?: string
    first_publish_year?: number
  }
  avgRating?: number
  ratingCount?: number
  showMeta?: boolean
}

const STATUS_OPTS = [
  { value: 'read',         label: 'Read',         icon: '✓' },
  { value: 'reading',      label: 'Reading',      icon: '📖' },
  { value: 'want-to-read', label: 'Want to Read', icon: '🔖' },
] as const

export default function BookCard({ book, avgRating, ratingCount, showMeta = true }: Props) {
  const { data: session } = useSession()
  const [saved, setSaved] = useState<string | null>(null)
  const [hovered, setHovered] = useState(false)
  const slug = olKeyToSlug(book.ol_key)

  const saveStatus = async (s: string) => {
    if (!session) return
    setSaved(s)
    fetch('/api/reading-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookKey: book.ol_key, status: s,
        bookTitle: book.title, bookCoverId: book.cover_id,
        bookAuthor: book.author_names?.[0],
      }),
    })
  }

  return (
    <div className="group" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <Link href={`/book/${slug}`}>
        <div
          className="relative rounded-xl overflow-hidden aspect-[2/3] bg-raised"
          style={{
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
            transform: hovered ? 'translateY(-8px) scale(1.03)' : 'translateY(0) scale(1)',
            boxShadow: hovered
              ? '0 24px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,200,66,0.15), 0 8px 20px rgba(245,200,66,0.05)'
              : '0 4px 12px rgba(0,0,0,0.3)',
            willChange: 'transform',
          }}
        >
          <img
            src={bookCoverUrl(book, 'M')}
            alt={book.title}
            className="w-full h-full object-cover"
            style={{ transition: 'filter 0.3s ease' }}
            onError={e => { (e.target as HTMLImageElement).src = '/no-cover.svg' }}
          />

          {/* Overlay — glides in from bottom */}
          <div
            className="absolute inset-0 flex flex-col justify-end p-2.5 gap-1.5"
            style={{
              background: 'linear-gradient(to top, rgba(7,7,15,0.95) 0%, rgba(7,7,15,0.6) 60%, transparent 100%)',
              opacity: hovered ? 1 : 0,
              transform: hovered ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.25s ease, transform 0.25s ease',
            }}
          >
            {avgRating ? (
              <div className="flex items-center gap-1">
                <RatingStars value={avgRating} size={11} readonly />
                <span className="text-[10px] text-yellow-300">{avgRating.toFixed(1)}</span>
              </div>
            ) : null}

            {session && STATUS_OPTS.map(({ value, label, icon }, idx) => (
              <button
                key={value}
                onClick={e => { e.preventDefault(); e.stopPropagation(); saveStatus(value) }}
                style={{
                  transform: hovered ? 'translateY(0)' : 'translateY(12px)',
                  opacity: hovered ? 1 : 0,
                  transition: `transform 0.2s ${0.05 + idx * 0.04}s ease, opacity 0.2s ${0.05 + idx * 0.04}s ease`,
                }}
                className={`text-[11px] py-1.5 px-2.5 rounded-lg font-semibold text-left w-full flex items-center gap-1.5 transition-colors ${
                  saved === value
                    ? 'bg-accent text-gray-950'
                    : 'bg-black/40 text-gray-200 hover:bg-black/60 backdrop-blur-sm'
                }`}
              >
                <span>{saved === value ? '✓' : icon}</span>
                {saved === value ? `${label}!` : label}
              </button>
            ))}
          </div>
        </div>
      </Link>

      {showMeta && (
        <div className="mt-2.5 px-0.5">
          <Link href={`/book/${slug}`}>
            <p className="text-xs font-semibold text-gray-200 line-clamp-2 hover:text-accent leading-snug"
               style={{ transition: 'color 0.15s ease' }}>
              {book.title}
            </p>
          </Link>
          <p className="text-[11px] text-muted mt-0.5 line-clamp-1">{book.author_names?.join(', ') || 'Unknown'}</p>
        </div>
      )}
    </div>
  )
}
