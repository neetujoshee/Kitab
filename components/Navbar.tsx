import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import dynamic from 'next/dynamic'

const LogBookModal = dynamic(() => import('./LogBookModal'), { ssr: false })

export default function Navbar() {
  const { data: session } = useSession()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [logOpen, setLogOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [ripple, setRipple] = useState(false)
  const [unread, setUnread] = useState(0)
  const username = (session?.user as any)?.username

  // Poll unread message count every 30s
  useEffect(() => {
    if (!session) return
    const fetchUnread = () =>
      fetch('/api/messages/unread').then(r => r.json()).then(d => setUnread(d.count ?? 0)).catch(() => {})
    fetchUnread()
    const iv = setInterval(fetchUnread, 30000)
    return () => clearInterval(iv)
  }, [session])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close modal on route change
  useEffect(() => {
    const handle = () => setLogOpen(false)
    router.events.on('routeChangeStart', handle)
    return () => router.events.off('routeChangeStart', handle)
  }, [router.events])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) router.push(`/discover?q=${encodeURIComponent(search.trim())}`)
  }

  const handleLogClick = () => {
    setRipple(true)
    setTimeout(() => setRipple(false), 600)
    setLogOpen(true)
  }

  return (
    <>
      <nav
        className="sticky top-0 z-40 border-b"
        style={{
          background: scrolled ? 'rgba(7,7,15,0.95)' : 'rgba(7,7,15,0.7)',
          borderColor: scrolled ? 'rgba(40,40,74,0.8)' : 'rgba(40,40,74,0.3)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
          boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-3 h-14">

          {/* Logo */}
          <Link
            href={session ? '/feed' : '/'}
            className="shrink-0 mr-1"
            style={{ transition: 'opacity 0.15s ease', display: 'flex', alignItems: 'center' }}
          >
            <img
              src="/kitab-logo.png"
              alt="Kitab"
              style={{
                height: '38px',
                width: '38px',
                objectFit: 'cover',
                objectPosition: 'center top',
                borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            />
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center text-sm">
            {[
              { href: '/discover', label: 'Discover' },
              ...(session ? [{ href: '/feed', label: 'Feed' }] : []),
            ].map(({ href, label }) => (
              <Link key={href} href={href}
                className={`btn-sm btn-ghost font-medium ${router.pathname === href ? 'text-gray-200' : ''}`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-xs">
            <div className="relative w-full">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search books…"
                className="input-sm pl-8 pr-3 w-full"
              />
            </div>
          </form>

          <div className="flex items-center gap-2 ml-auto">
            {session ? (
              <>
                {/* Log button with ripple */}
                <button
                  onClick={handleLogClick}
                  className="btn-sm btn-gold font-bold relative overflow-hidden"
                  style={{ letterSpacing: '0.01em' }}
                >
                  {ripple && (
                    <span
                      className="absolute inset-0 rounded-xl bg-white/30"
                      style={{ animation: 'ripple 0.6s ease-out forwards' }}
                    />
                  )}
                  <span className="text-base leading-none">+</span> Log
                </button>

                {/* Messages icon with unread badge */}
                <Link href="/messages" className="relative btn-sm btn-ghost p-2" title="Messages">
                  <svg className="w-5 h-5 text-muted hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {unread > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-gray-900"
                      style={{ background: '#f5c842' }}
                    >
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>

                {/* Avatar */}
                <Link href={`/user/${username}`}
                  className="flex items-center gap-2 btn-sm btn-ghost"
                  style={{ transition: 'opacity 0.15s ease' }}
                >
                  {session.user?.image
                    ? <img src={session.user.image} className="w-6 h-6 rounded-full object-cover ring-1 ring-border" alt="" />
                    : <span className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-gray-950">
                        {(session.user?.name || username || '?')[0].toUpperCase()}
                      </span>
                  }
                  <span className="hidden sm:inline text-sm font-medium">{username}</span>
                </Link>
                <button onClick={() => signOut({ callbackUrl: '/' })}
                  className="btn-sm btn-ghost text-muted text-base" title="Sign out">
                  ↩
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="btn-sm btn-ghost">Sign in</Link>
                <Link href="/auth/signup" className="btn-sm btn-gold">Join free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {logOpen && <LogBookModal onClose={() => setLogOpen(false)} />}
    </>
  )
}
