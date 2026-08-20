import '../styles/globals.css'
import { SessionProvider } from 'next-auth/react'
import { useRouter } from 'next/router'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect, useState, useRef } from 'react'

function NavProgress() {
  const router = useRouter()
  const [active, setActive] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const start = () => { clearTimeout(timer.current); setActive(true) }
    const done  = () => { timer.current = setTimeout(() => setActive(false), 400) }
    router.events.on('routeChangeStart',    start)
    router.events.on('routeChangeComplete', done)
    router.events.on('routeChangeError',    done)
    return () => {
      router.events.off('routeChangeStart',    start)
      router.events.off('routeChangeComplete', done)
      router.events.off('routeChangeError',    done)
    }
  }, [router.events])

  if (!active) return null
  return (
    <div className="nav-progress">
      <div className="nav-progress-bar" />
    </div>
  )
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [key, setKey] = useState(router.pathname)

  useEffect(() => {
    const handle = () => setKey(router.pathname + router.asPath)
    router.events.on('routeChangeComplete', handle)
    return () => router.events.off('routeChangeComplete', handle)
  }, [router])

  return (
    <div key={key} className="page-enter">
      {children}
    </div>
  )
}

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Open Library cover CDN — pre-establish TCP+TLS before any image requests */}
        <link rel="preconnect" href="https://covers.openlibrary.org" crossOrigin="" />
        <link rel="dns-prefetch" href="https://covers.openlibrary.org" />
        <link rel="preconnect" href="https://openlibrary.org" crossOrigin="" />
        <link rel="dns-prefetch" href="https://openlibrary.org" />
      </Head>
      <NavProgress />
      <PageWrapper>
        <Component {...pageProps} />
      </PageWrapper>
    </SessionProvider>
  )
}
