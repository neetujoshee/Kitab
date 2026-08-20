import React, { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

type Status = 'want-to-read' | 'reading' | 'read' | 'dnf' | null

const OPTIONS: { value: Status; label: string; icon: string }[] = [
  { value: 'read',          label: 'Read',          icon: '✓' },
  { value: 'reading',       label: 'Currently Reading', icon: '📖' },
  { value: 'want-to-read',  label: 'Want to Read',  icon: '🔖' },
  { value: 'dnf',           label: 'Did Not Finish', icon: '✕' },
]

type Props = {
  bookKey: string
  bookTitle?: string
  bookCoverId?: number
  bookAuthor?: string
}

export default function ReadingStatusButton({ bookKey, bookTitle, bookCoverId, bookAuthor }: Props) {
  const { data: session } = useSession()
  const [status, setStatus] = useState<Status>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!session) { setLoading(false); return }
    fetch(`/api/reading-status?bookKey=${encodeURIComponent(bookKey)}`)
      .then(r => r.json())
      .then(d => { if (d?.status) setStatus(d.status) })
      .finally(() => setLoading(false))
  }, [bookKey, session])

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!session) return null
  if (loading) return <div className="btn-secondary w-40 text-center opacity-50 text-sm">…</div>

  const current = OPTIONS.find(o => o.value === status)

  const select = async (s: Status) => {
    setOpen(false)
    if (s === status) {
      setStatus(null)
      await fetch('/api/reading-status', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookKey }),
      })
      return
    }
    setStatus(s)
    await fetch('/api/reading-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookKey, status: s, bookTitle, bookCoverId, bookAuthor }),
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors w-full justify-between ${
          status ? 'bg-brand-500 text-gray-900 hover:bg-brand-400' : 'btn-secondary'
        }`}
      >
        <span>{current ? `${current.icon} ${current.label}` : '+ Add to Shelf'}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-surface-card border border-surface-border rounded-xl shadow-xl z-20 py-1 animate-slide-up">
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => select(opt.value)}
              className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left hover:bg-surface-raised transition-colors ${
                status === opt.value ? 'text-brand-500' : 'text-gray-200'
              }`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
              {status === opt.value && <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8 15.414l-4.707-4.707a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
            </button>
          ))}
          {status && (
            <button onClick={() => select(null)} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-500 hover:bg-surface-raised border-t border-surface-border mt-1">
              Remove from shelf
            </button>
          )}
        </div>
      )}
    </div>
  )
}
