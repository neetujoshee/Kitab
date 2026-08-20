import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Navbar from '../../components/Navbar'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function MessagesInbox() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [convs, setConvs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const me = (session?.user as any)?.id

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/auth/signin'); return }
    if (status !== 'authenticated') return
    fetch('/api/messages')
      .then(r => r.json())
      .then(d => setConvs(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [status])

  return (
    <>
      <Head><title>Messages · Kitab</title></Head>
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display font-black text-2xl text-white" style={{ letterSpacing: '-0.02em' }}>
            Messages
          </h1>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-4 flex gap-3 items-center">
                <div className="w-11 h-11 skeleton rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 skeleton rounded w-1/3" />
                  <div className="h-3 skeleton rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : convs.length === 0 ? (
          <div
            className="text-center py-20 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}
          >
            <div className="text-5xl mb-4 animate-float inline-block">💬</div>
            <p className="font-display font-bold text-white text-lg mb-1">No messages yet</p>
            <p className="text-muted text-sm mb-6">Visit someone's profile and start a conversation.</p>
            <Link href="/discover" className="btn-md btn-gold">Find readers →</Link>
          </div>
        ) : (
          <div className="space-y-1">
            {convs.map(c => {
              const initials = (c.other_name || c.other_username || '?')[0].toUpperCase()
              const isUnread = c.unread_count > 0
              const isMine = c.last_sender_id === me
              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.other_username}`}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl group transition-all"
                  style={{ background: isUnread ? 'rgba(245,200,66,0.05)' : 'transparent' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isUnread ? 'rgba(245,200,66,0.08)' : 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isUnread ? 'rgba(245,200,66,0.05)' : 'transparent' }}
                >
                  {/* Avatar */}
                  {c.other_avatar ? (
                    <img src={c.other_avatar} className="w-11 h-11 rounded-full object-cover shrink-0" alt="" />
                  ) : (
                    <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-gray-900 shrink-0 text-sm"
                         style={{ background: 'linear-gradient(135deg,#f5c842,#ffb347)' }}>
                      {initials}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-sm font-semibold ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                        {c.other_name || c.other_username}
                      </p>
                      <span className="text-[11px] text-muted shrink-0">{timeAgo(c.last_message_at)}</span>
                    </div>
                    <p className={`text-xs mt-0.5 truncate ${isUnread ? 'text-gray-300 font-medium' : 'text-muted'}`}>
                      {isMine && <span className="text-muted">You: </span>}
                      {c.last_message || '—'}
                    </p>
                  </div>

                  {isUnread && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-gray-900 shrink-0"
                         style={{ background: '#f5c842' }}>
                      {c.unread_count > 9 ? '9+' : c.unread_count}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
