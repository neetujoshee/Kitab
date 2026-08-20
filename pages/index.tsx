import React, { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Navbar from '../components/Navbar'
import BookCard from '../components/BookCard'
import ReviewCard from '../components/ReviewCard'
import { OLBook, bookCoverUrl, olKeyToSlug } from '../lib/openlibrary'
import { CURATED_BOOKS, GENRES, getBooksByGenre, curatedToOLBook } from '../lib/curated-books'

// Curated cover IDs for the animated wall (reliable OL IDs)
const ALL_COVERS = [
  8234087, 8575141, 9255566, 12888288, 9553961, 12781060,
  10556435, 6949855, 9266023, 11070,   8411905, 8290343,
  7102782, 10381454, 7990649, 8231456, 9140234, 12188588,
  14993310, 12948566, 8739161, 6777470, 8756954, 13103639,
  9918453, 8761528, 14624518, 10299, 8091016, 12909344,
  12889056, 8445577,
]

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

function CoverColumn({ covers, duration, delay = 0, reverse = false }: {
  covers: number[]; duration: number; delay?: number; reverse?: boolean
}) {
  const doubled = [...covers, ...covers]
  return (
    <div className="flex flex-col gap-3 overflow-hidden" style={{ flex: 1 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          animation: `scrollUp ${duration}s linear ${delay}s infinite ${reverse ? 'reverse' : 'normal'}`,
        }}
      >
        {doubled.map((id, i) => (
          <div key={i} className="rounded-lg overflow-hidden shadow-lg shrink-0" style={{ aspectRatio: '2/3' }}>
            <img
              src={`https://covers.openlibrary.org/b/id/${id}-M.jpg`}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function AnimatedCoverWall() {
  const cols = chunk(ALL_COVERS, Math.ceil(ALL_COVERS.length / 4))
  const durations = [22, 28, 20, 26]
  const delays    = [0, -8, -4, -12]
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none"
         style={{ padding: '0 8px' }}>
      <div className="flex gap-3 h-full" style={{ transform: 'rotate(-4deg) scale(1.2)', transformOrigin: 'center' }}>
        {cols.map((col, i) => (
          <CoverColumn key={i} covers={col} duration={durations[i]} delay={delays[i]} reverse={i % 2 === 1} />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg/60 to-bg" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg/80 via-transparent to-bg/80" />
    </div>
  )
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.08 }
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal()
  return (
    <div ref={ref} className={`${visible ? 'animate-up' : 'opacity-0'} ${className}`}
         style={{ transition: 'opacity 0.6s ease, transform 0.6s ease' }}>
      {children}
    </div>
  )
}

// Horizontal scrolling shelf for a single genre
function GenreShelf({ genre, books }: { genre: string; books: ReturnType<typeof curatedToOLBook>[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const scroll = (dir: 'l' | 'r') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir === 'r' ? 320 : -320, behavior: 'smooth' })
  }

  // Emoji map for genres
  const emojiMap: Record<string, string> = {
    Fantasy: '🧙', Classics: '📜', 'Science Fiction': '🚀',
    Contemporary: '📖', Mystery: '🔍', Romance: '💕',
    'Historical Fiction': '⚔️', 'Non-Fiction': '🌍', 'Young Adult': '✨',
  }

  return (
    <div className="mb-14">
      <div className="flex items-center justify-between mb-5 px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emojiMap[genre] || '📚'}</span>
          <h3 className="font-display text-2xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>{genre}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/discover?q=${encodeURIComponent(genre)}`}
            className="text-xs text-accent hover:text-yellow-300 transition-colors mr-2"
          >
            See all →
          </Link>
          <button
            onClick={() => scroll('l')}
            className="w-8 h-8 rounded-full border border-border text-muted hover:border-accent hover:text-accent flex items-center justify-center transition-colors"
          >
            ‹
          </button>
          <button
            onClick={() => scroll('r')}
            className="w-8 h-8 rounded-full border border-border text-muted hover:border-accent hover:text-accent flex items-center justify-center transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {books.map((book) => (
          <div key={book.ol_key} className="shrink-0" style={{ width: '130px' }}>
            <BookCard book={book} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Mini cover for the "Popular" spotlight strip
function SpotlightCard({ book }: { book: any }) {
  const slug = olKeyToSlug(book.ol_key)
  const [hovered, setHovered] = useState(false)
  return (
    <Link href={`/book/${slug}`}>
      <div
        className="relative rounded-2xl overflow-hidden shrink-0"
        style={{
          width: '150px',
          aspectRatio: '2/3',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
          transform: hovered ? 'translateY(-10px) scale(1.04)' : 'translateY(0) scale(1)',
          boxShadow: hovered
            ? '0 28px 56px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,200,66,0.2)'
            : '0 6px 20px rgba(0,0,0,0.4)',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <img
          src={bookCoverUrl(book, 'M')}
          alt={book.title}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).src = '/images/no-cover.png' }}
        />
        <div
          className="absolute inset-0 flex flex-col justify-end p-3"
          style={{
            background: 'linear-gradient(to top, rgba(7,7,15,0.95) 0%, rgba(7,7,15,0.5) 50%, transparent 100%)',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.25s ease',
          }}
        >
          <p className="text-[11px] font-semibold text-white line-clamp-2 leading-tight">{book.title}</p>
          <p className="text-[10px] text-yellow-300/80 mt-0.5 line-clamp-1">{book.author_names?.[0]}</p>
        </div>
      </div>
    </Link>
  )
}

const FEATURED_GENRES = ['Fantasy', 'Classics', 'Science Fiction', 'Contemporary', 'Mystery']

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [recentReviews, setRecentReviews] = useState<any[]>([])

  // Build genre sections from curated data (instant, no API call)
  const genreSections = FEATURED_GENRES.map(g => ({
    genre: g,
    books: getBooksByGenre(g).map(curatedToOLBook),
  }))

  // Featured spotlight: first book from each genre
  const spotlightBooks = CURATED_BOOKS.filter((_, i) => i % 6 === 0).slice(0, 10).map(curatedToOLBook)

  useEffect(() => {
    if (status === 'authenticated') { router.replace('/feed'); return }
    fetch('/api/reviews?limit=4')
      .then(r => r.json())
      .then(d => setRecentReviews(Array.isArray(d) ? d : []))
  }, [status])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) router.push(`/discover?q=${encodeURIComponent(search.trim())}`)
  }

  return (
    <>
      <Head>
        <title>Kitab — Your life in books.</title>
        <meta name="description" content="Track what you read, discover what's next, and connect with readers who share your taste." />
      </Head>
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 py-28 overflow-hidden">
        <AnimatedCoverWall />

        <div className="relative z-10 text-center max-w-4xl animate-up">
          {/* Logo mark */}
          <div className="flex justify-center mb-6">
            <img
              src="/kitab-logo.png"
              alt="Kitab"
              style={{
                height: '80px',
                width: '80px',
                objectFit: 'cover',
                objectPosition: 'center top',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,200,66,0.15)',
                animation: 'floatUp 3s ease-in-out infinite',
              }}
            />
          </div>

          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent
                          text-xs font-semibold px-4 py-1.5 rounded-full mb-8 tracking-wider uppercase
                          animate-float">
            ✦ Social Reading Platform
          </div>

          <h1 className="font-display text-7xl sm:text-9xl font-black text-white leading-[0.95] mb-6"
              style={{ letterSpacing: '-0.03em' }}>
            Your life<br />
            <span className="text-gradient italic">in books.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted max-w-xl mx-auto mb-10 leading-relaxed font-light">
            Track what you read. Write reviews. Keep a reading diary.
            Discover what to read next. Connect with readers who get it.
          </p>

          <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto mb-8">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search for a book or author…"
              className="input flex-1 text-base py-3.5"
            />
            <button type="submit" className="btn-lg btn-gold shrink-0">Search</button>
          </form>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/auth/signup" className="btn-lg btn-gold">Start for free →</Link>
            <Link href="/discover" className="btn-lg btn-outline">Browse books</Link>
          </div>

          <div className="flex items-center justify-center gap-8 mt-16 flex-wrap">
            {[['📔', 'Reading Diary'], ['★½', 'Half-star Ratings'], ['🌊', 'Social Feed'], ['📊', 'Reading Stats']].map(([icon, label]) => (
              <div key={label} className="flex items-center gap-2 text-sm text-muted">
                <span>{icon}</span><span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Spotlight Books (popular picks, instant) ──────────────────────── */}
      <RevealSection>
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex items-baseline justify-between mb-8">
            <div>
              <p className="section-label mb-1">Staff Picks</p>
              <h2 className="font-display text-4xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
                Popular Right Now
              </h2>
            </div>
            <Link href="/discover" className="text-sm text-accent hover:text-yellow-300 transition-colors">See all →</Link>
          </div>

          <div
            className="flex gap-5 overflow-x-auto pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {spotlightBooks.map((book, i) => (
              <div key={book.ol_key} className="animate-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <SpotlightCard book={book} />
              </div>
            ))}
          </div>
        </section>
      </RevealSection>

      {/* ── Why Kitab ─────────────────────────────────────────────── */}
      <RevealSection>
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-14">
            <p className="section-label mb-3">Why Kitab</p>
            <h2 className="font-display text-5xl font-black text-white" style={{ letterSpacing: '-0.02em' }}>
              More than ratings.<br />
              <span className="text-gradient italic">It's your story.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            {[
              { icon: '📔', title: 'Reading Diary', desc: 'A beautiful chronological log of every book you start, finish, or abandon. Your reading history, forever.' },
              { icon: '★½', title: 'Half-Star Ratings', desc: 'Rate from 0.5 to 5 stars. Write reviews. Mark spoilers. Like and comment on others.' },
              { icon: '👤', title: 'Beautiful Profiles', desc: "Pin your favorites. Show what you're reading. Share your stats. Your reading identity, made visible." },
              { icon: '🌊', title: 'Social Feed', desc: 'Follow readers you trust. See what they started, finished, and loved — in real time.' },
              { icon: '🔍', title: 'Discover', desc: 'Search millions of books from Open Library. Filter by genre. Find your next obsession.' },
              { icon: '📊', title: 'Reading Stats', desc: 'Books per month, average rating, reading pace. Watch your reading life become data.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="card-hover p-7 group">
                <div className="text-3xl mb-4 group-hover:animate-float inline-block">{icon}</div>
                <h3 className="font-semibold text-white text-lg mb-2">{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </RevealSection>

      {/* ── Genre Shelves ──────────────────────────────────────────── */}
      <RevealSection>
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex items-baseline justify-between mb-10">
            <div>
              <p className="section-label mb-1">Browse</p>
              <h2 className="font-display text-4xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
                Books by Genre
              </h2>
            </div>
            <Link href="/discover" className="text-sm text-accent hover:text-yellow-300 transition-colors">Explore all →</Link>
          </div>

          {genreSections.map(({ genre, books }) => (
            <GenreShelf key={genre} genre={genre} books={books} />
          ))}
        </section>
      </RevealSection>

      {/* ── Community reviews ─────────────────────────────────────── */}
      {recentReviews.length > 0 && (
        <RevealSection>
          <section className="max-w-7xl mx-auto px-4 py-16">
            <h2 className="font-display text-4xl font-bold text-white mb-8" style={{ letterSpacing: '-0.02em' }}>
              From the Community
            </h2>
            <div className="grid md:grid-cols-2 gap-4 stagger">
              {recentReviews.map(r => <ReviewCard key={r.id} review={r} showBook />)}
            </div>
          </section>
        </RevealSection>
      )}

      {/* ── Final CTA ─────────────────────────────────────────────── */}
      <RevealSection>
        <section className="max-w-7xl mx-auto px-4 py-24">
          <div className="relative overflow-hidden card p-16 text-center">
            <div className="absolute inset-0 opacity-30"
                 style={{
                   background: 'linear-gradient(135deg, #f5c842, #ff9d6c, #ff7eb3, #a855f7)',
                   backgroundSize: '300% 300%',
                   animation: 'gradientShift 6s ease infinite',
                 }} />
            <div className="absolute inset-0 bg-card/80" />
            <div className="relative z-10">
              <h2 className="font-display text-6xl font-black text-white mb-4" style={{ letterSpacing: '-0.03em' }}>
                Your reading life,<br />starting now.
              </h2>
              <p className="text-muted mb-10 text-lg font-light">Free forever. No ads. Just books.</p>
              <Link href="/auth/signup" className="btn-lg btn-gold text-lg px-10">
                Create your profile →
              </Link>
            </div>
          </div>
        </section>
      </RevealSection>

      <footer className="border-t border-border py-12 text-center text-muted text-sm">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/kitab-logo.png"
            alt="Kitab"
            style={{
              height: '56px',
              width: '56px',
              objectFit: 'cover',
              objectPosition: 'center top',
              borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          />
          <p className="text-muted text-xs tracking-widest uppercase">Every book has a story.</p>
        </div>
      </footer>
    </>
  )
}
