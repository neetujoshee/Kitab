import React, { useEffect, useState, useCallback, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'
import BookCard from '../components/BookCard'
import { OLBook, bookCoverUrl, olKeyToSlug } from '../lib/openlibrary'
import { CURATED_BOOKS, GENRES, getBooksByGenre, curatedToOLBook } from '../lib/curated-books'

const GENRE_META: Record<string, { emoji: string; description: string }> = {
  Fantasy:            { emoji: '🧙', description: 'Magic, dragons, and worlds beyond imagination.' },
  Classics:           { emoji: '📜', description: 'The books that shaped literature forever.' },
  'Science Fiction':  { emoji: '🚀', description: 'The future, reimagined through brilliant minds.' },
  Contemporary:       { emoji: '📖', description: 'Modern stories that define our times.' },
  Mystery:            { emoji: '🔍', description: 'Puzzles, detectives, and dark secrets.' },
  Romance:            { emoji: '💕', description: 'Love in all its beautiful complications.' },
  'Historical Fiction': { emoji: '⚔️', description: 'The past, brought vividly to life.' },
  'Non-Fiction':      { emoji: '🌍', description: 'True stories and real ideas that change you.' },
  'Young Adult':      { emoji: '✨', description: 'Coming-of-age stories that stay with you forever.' },
}

type BookLike = {
  ol_key: string
  title: string
  author_names?: string[]
  cover_id?: number
  cover_isbn?: string
  first_publish_year?: number
}

export default function Discover() {
  const router = useRouter()
  const q = (router.query.q as string) || ''
  const [query, setQuery] = useState(q)
  const [searchResults, setSearchResults] = useState<OLBook[]>([])
  const [loading, setLoading] = useState(false)
  const [activeGenre, setActiveGenre] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Curated books by genre (instant, no API)
  const curatedByGenre = GENRES.map(g => ({
    genre: g,
    books: getBooksByGenre(g).map(curatedToOLBook),
  }))

  const doSearch = useCallback(async (term: string) => {
    if (!term.trim()) return
    setLoading(true)
    setHasSearched(true)
    try {
      const res = await fetch(`/api/books?q=${encodeURIComponent(term)}`)
      const data = await res.json()
      setSearchResults(data.docs || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (q) {
      setQuery(q)
      // Check if it's a genre search — if so, filter curated books instead of OL search
      const matchedGenre = GENRES.find(g => g.toLowerCase() === q.toLowerCase())
      if (matchedGenre) {
        setActiveGenre(matchedGenre)
        setHasSearched(false)
      } else {
        setActiveGenre(null)
        doSearch(q)
      }
    } else {
      setHasSearched(false)
      setActiveGenre(null)
    }
  }, [q, doSearch])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/discover?q=${encodeURIComponent(query.trim())}`)
  }

  const selectGenre = (label: string) => {
    setActiveGenre(label)
    setHasSearched(false)
    setSearchResults([])
    router.push(`/discover?q=${encodeURIComponent(label)}`, undefined, { shallow: true })
    // Scroll to results
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  // Books to show in the main results area
  const activeGenreBooks: BookLike[] = activeGenre
    ? getBooksByGenre(activeGenre).map(curatedToOLBook)
    : []

  return (
    <>
      <Head><title>Discover · Kitab</title></Head>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-10">

        {/* ── Header ──────────────────────────────── */}
        <div className="mb-10 animate-up">
          <h1 className="font-display text-5xl font-black text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
            Discover
          </h1>
          <p className="text-muted">Find your next great read from millions of books.</p>
        </div>

        {/* ── Search bar ──────────────────────────── */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-8 max-w-xl animate-up" style={{ animationDelay: '0.05s' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by title, author, or ISBN…"
            className="input flex-1"
          />
          <button type="submit" className="btn-md btn-gold">Search</button>
          {(query || hasSearched) && (
            <button
              type="button"
              onClick={() => { setQuery(''); setHasSearched(false); setSearchResults([]); setActiveGenre(null); router.push('/discover') }}
              className="btn-md btn-ghost"
            >
              Clear
            </button>
          )}
        </form>

        {/* ── Genre chips ─────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-12 stagger">
          {GENRES.map((label) => {
            const meta = GENRE_META[label] || { emoji: '📚', description: '' }
            return (
              <button
                key={label}
                onClick={() => selectGenre(label)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                  activeGenre === label
                    ? 'bg-accent text-gray-950 border-accent shadow-lg shadow-accent/20 scale-105'
                    : 'border-border text-muted hover:border-accent/40 hover:text-accent hover:scale-105 hover:shadow-md'
                }`}
                style={{ transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              >
                <span>{meta.emoji}</span> {label}
              </button>
            )
          })}
        </div>

        {/* ── Results area ────────────────────────── */}
        <div ref={resultsRef}>

          {/* Search results */}
          {loading && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <span className="text-sm text-muted">Searching Open Library…</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] skeleton rounded-xl" style={{ animationDelay: `${i * 0.04}s` }} />
                ))}
              </div>
            </div>
          )}

          {!loading && hasSearched && searchResults.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="font-display text-2xl font-bold text-white">
                  Results for <span className="text-accent">"{q}"</span>
                </h2>
                <span className="text-sm text-muted">{searchResults.length} books found</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 stagger">
                {searchResults.map(book => <BookCard key={book.ol_key} book={book} />)}
              </div>
            </div>
          )}

          {!loading && hasSearched && searchResults.length === 0 && (
            <div className="text-center py-20 animate-up">
              <div className="text-6xl mb-4 animate-float">🔍</div>
              <p className="text-white font-semibold mb-2">No results for "{q}"</p>
              <p className="text-muted text-sm">Try a different search or browse genres below.</p>
            </div>
          )}

          {/* Genre-filtered curated books */}
          {!hasSearched && activeGenre && (
            <div>
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">{GENRE_META[activeGenre]?.emoji}</span>
                  <h2 className="font-display text-4xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
                    {activeGenre}
                  </h2>
                </div>
                <p className="text-muted">{GENRE_META[activeGenre]?.description}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 stagger">
                {activeGenreBooks.map(book => <BookCard key={book.ol_key} book={book as any} />)}
              </div>
              <div className="mt-8 text-center">
                <p className="text-sm text-muted mb-3">Want more {activeGenre} books?</p>
                <button
                  onClick={() => router.push(`/discover?q=${encodeURIComponent(activeGenre + ' fiction bestseller')}`)}
                  className="btn-md btn-outline"
                >
                  Search Open Library for {activeGenre} →
                </button>
              </div>
            </div>
          )}

          {/* Default: show all genres */}
          {!hasSearched && !activeGenre && (
            <div>
              {curatedByGenre.map(({ genre, books }, gi) => (
                <div key={genre} className="mb-16" style={{ animationDelay: `${gi * 0.05}s` }}>
                  {/* Genre header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{GENRE_META[genre]?.emoji}</span>
                      <div>
                        <h2 className="font-display text-2xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
                          {genre}
                        </h2>
                        <p className="text-xs text-muted mt-0.5">{GENRE_META[genre]?.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => selectGenre(genre)}
                      className="text-xs text-accent hover:text-yellow-300 transition-colors"
                    >
                      See all {genre} →
                    </button>
                  </div>

                  {/* Horizontal scrolling row */}
                  <div
                    className="flex gap-4 overflow-x-auto pb-3"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {books.map((book, bi) => (
                      <div
                        key={book.ol_key}
                        className="shrink-0 animate-up"
                        style={{ width: '120px', animationDelay: `${bi * 0.04}s` }}
                      >
                        <BookCard book={book as any} />
                      </div>
                    ))}

                    {/* "See more" tile */}
                    <div className="shrink-0 flex items-center" style={{ width: '100px' }}>
                      <button
                        onClick={() => selectGenre(genre)}
                        className="w-full aspect-[2/3] rounded-xl border border-border flex flex-col items-center justify-center gap-2
                                   text-muted hover:border-accent hover:text-accent transition-colors group"
                      >
                        <span className="text-2xl group-hover:scale-110 transition-transform">→</span>
                        <span className="text-[10px] font-medium text-center leading-tight">More {genre}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
