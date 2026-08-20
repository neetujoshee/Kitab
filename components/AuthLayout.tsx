import React, { useRef } from 'react'
import Link from 'next/link'

// Verified ISBN covers (reliable from Open Library)
const MOSAIC_COVERS = [
  '9780439708180', '9780451524935', '9780261102217', '9780441013593',
  '9780141439518', '9780307588371', '9780525478812', '9780399590504',
  '9780062315007', '9780735211292', '9780735224292', '9780307744432',
  '9780062316097', '9780375842207', '9781476746586', '9781524763138',
  '9780062024039', '9780439023481', '9780553418026', '9780593135204',
  '9780062073488', '9780399167065', '9780735220683', '9780316556347',
]

function ScrollColumn({
  covers, duration, delay, reverse,
}: {
  covers: string[]; duration: number; delay: number; reverse: boolean
}) {
  const doubled = [...covers, ...covers]
  return (
    <div style={{ flex: 1, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          animation: `scrollUp ${duration}s linear ${delay}s infinite ${reverse ? 'reverse' : 'normal'}`,
        }}
      >
        {doubled.map((isbn, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '2/3',
              borderRadius: '10px',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            <img
              src={`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

const COLS = [
  MOSAIC_COVERS.slice(0, 6),
  MOSAIC_COVERS.slice(6, 12),
  MOSAIC_COVERS.slice(12, 18),
  MOSAIC_COVERS.slice(18, 24),
]

const QUOTES = [
  { text: '"A reader lives a thousand lives before he dies. The man who never reads lives only one."', by: '— George R.R. Martin' },
  { text: '"Not all those who wander are lost."', by: '— J.R.R. Tolkien' },
  { text: '"There is no friend as loyal as a book."', by: '— Ernest Hemingway' },
]
const QUOTE = QUOTES[0]

type Props = {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function AuthLayout({ children, title, subtitle }: Props) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#07070f' }}>

      {/* ── Left: animated book cover mosaic ─────────────────────── */}
      <div
        className="hidden lg:flex"
        style={{
          flex: '0 0 52%',
          position: 'relative',
          overflow: 'hidden',
          background: '#07070f',
        }}
      >
        {/* Scrolling columns */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            gap: '10px',
            padding: '0 10px',
            transform: 'rotate(-4deg) scale(1.15)',
            transformOrigin: 'center',
          }}
        >
          {COLS.map((col, i) => (
            <ScrollColumn
              key={i}
              covers={col}
              duration={[22, 30, 26, 34][i]}
              delay={[0, -8, -4, -14][i]}
              reverse={i % 2 === 1}
            />
          ))}
        </div>

        {/* Gradient overlays for fade-out */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(7,7,15,0.3) 0%, rgba(7,7,15,0.95) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(7,7,15,0.6) 0%, transparent 25%, transparent 75%, rgba(7,7,15,0.8) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,7,15,0.2)' }} />

        {/* Brand content on top */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '52px 48px',
          zIndex: 10,
        }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <img
              src="/kitab-logo.png"
              alt="Kitab"
              style={{
                height: '72px',
                width: '72px',
                objectFit: 'cover',
                objectPosition: 'center top',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}
            />
          </Link>

          {/* Center tagline */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p
              className="font-display"
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                marginBottom: '16px',
              }}
            >
              Your life<br />
              <span style={{
                background: 'linear-gradient(135deg, #f5c842 0%, #ffb347 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontStyle: 'italic',
              }}>
                in books.
              </span>
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', lineHeight: 1.6, maxWidth: '280px' }}>
              Track what you read. Write reviews.<br />Connect with readers who get it.
            </p>
          </div>

          {/* Quote */}
          <div style={{
            borderLeft: '3px solid rgba(245,200,66,0.5)',
            paddingLeft: '16px',
            maxWidth: '320px',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontStyle: 'italic', lineHeight: 1.6 }}>
              {QUOTE.text}
            </p>
            <p style={{ color: '#f5c842', fontSize: '12px', marginTop: '8px', fontWeight: 600 }}>
              {QUOTE.by}
            </p>
          </div>
        </div>
      </div>

      {/* ── Right: form panel ─────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          background: '#0f0f1c',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient gold glow */}
        <div style={{
          position: 'absolute',
          top: '-120px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(245,200,66,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="w-full animate-spring" style={{ maxWidth: '380px', position: 'relative', zIndex: 1 }}>

          {/* Mobile logo (hidden on desktop where left panel shows) */}
          <div className="lg:hidden flex justify-center mb-10">
            <Link href="/" style={{ textDecoration: 'none' }}>
              <img
                src="/kitab-logo.png"
                alt="Kitab"
                style={{
                  height: '80px',
                  width: '80px',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  borderRadius: '18px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}
              />
            </Link>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1
              className="font-display text-3xl font-black text-white"
              style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted text-sm mt-2">{subtitle}</p>
            )}
          </div>

          {/* Slot for form */}
          {children}
        </div>
      </div>
    </div>
  )
}
