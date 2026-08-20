import React, { useEffect, useRef, useState, useCallback } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Navbar from '../../components/Navbar'

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const otherUsername = router.query.username as string

  const [messages, setMessages] = useState<any[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [otherUser, setOtherUser] = useState<{ username: string; name?: string; avatar_url?: string } | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const me = (session?.user as any)?.id
  const myUsername = (session?.user as any)?.username

  // Load conversation by fetching the inbox and finding the matching convo,
  // or bootstrapping from the "to" user's profile
  const loadMessages = useCallback(async (convId: string) => {
    const res = await fetch(`/api/messages/${convId}`)
    if (!res.ok) return
    const data = await res.json()
    setMessages(data)
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/auth/signin'); return }
    if (status !== 'authenticated' || !otherUsername) return
    if (otherUsername === myUsername) { router.replace('/messages'); return }

    // Load the target user info
    fetch(`/api/users/${otherUsername}`)
      .then(r => r.json())
      .then(d => {
        if (d?.user) setOtherUser(d.user)
      })

    // Find or init conversation
    fetch('/api/messages')
      .then(r => r.json())
      .then((convs: any[]) => {
        if (!Array.isArray(convs)) return
        const found = convs.find(c => c.other_username === otherUsername)
        if (found) {
          setConversationId(found.id)
          loadMessages(found.id)
        }
      })
      .finally(() => setLoading(false))
  }, [status, otherUsername, myUsername])

  // Poll for new messages every 3s when we have a conversation
  useEffect(() => {
    if (!conversationId) return
    pollRef.current = setInterval(() => loadMessages(conversationId), 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [conversationId, loadMessages])

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!text.trim() || sending || !otherUsername) return
    setSending(true)
    const content = text.trim()
    setText('')

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_username: otherUsername, content }),
    })

    if (res.ok) {
      const msg = await res.json()
      if (!conversationId) {
        setConversationId(msg.conversation_id)
      }
      // Optimistically add the message
      setMessages(prev => [...prev, {
        ...msg,
        sender_username: myUsername,
        sender_name: session?.user?.name,
        sender_avatar: session?.user?.image,
      }])
    }
    setSending(false)
    inputRef.current?.focus()
  }

  // Group messages by date
  const grouped: { date: string; msgs: any[] }[] = []
  messages.forEach(m => {
    const d = formatDate(m.created_at)
    const last = grouped[grouped.length - 1]
    if (last && last.date === d) last.msgs.push(m)
    else grouped.push({ date: d, msgs: [m] })
  })

  const initials = (otherUser?.name || otherUsername || '?')[0]?.toUpperCase()

  return (
    <>
      <Head><title>{otherUser?.name || otherUsername} · Messages · Kitab</title></Head>
      <Navbar />

      <div
        className="flex flex-col"
        style={{ height: 'calc(100vh - 56px)', maxWidth: '720px', margin: '0 auto' }}
      >
        {/* ── Chat header ── */}
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(7,7,15,0.8)', backdropFilter: 'blur(12px)' }}
        >
          <Link href="/messages" className="text-muted hover:text-white transition-colors mr-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <Link href={`/user/${otherUsername}`} className="flex items-center gap-2.5 group">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-gray-900 text-sm shrink-0"
                   style={{ background: 'linear-gradient(135deg,#f5c842,#ffb347)' }}>
                {initials}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-white group-hover:text-accent transition-colors leading-tight">
                {otherUser?.name || otherUsername}
              </p>
              <p className="text-[11px] text-muted leading-tight">@{otherUsername}</p>
            </div>
          </Link>
        </div>

        {/* ── Messages area ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ overscrollBehavior: 'contain' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-5xl mb-4 animate-float inline-block">👋</div>
              <p className="font-display font-bold text-white text-lg mb-1">
                Start the conversation
              </p>
              <p className="text-muted text-sm max-w-xs">
                Say hi to {otherUser?.name || otherUsername} — maybe ask what they're reading!
              </p>
            </div>
          ) : (
            grouped.map(({ date, msgs }) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <span className="text-[11px] text-muted px-2">{date}</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>

                <div className="space-y-1">
                  {msgs.map((msg, i) => {
                    const isMe = msg.sender_id === me
                    const prev = i > 0 ? msgs[i - 1] : null
                    const isSameGroup = prev && prev.sender_id === msg.sender_id

                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {/* Avatar (other user only, show on last message of a group) */}
                        {!isMe && (
                          <div className="shrink-0 w-7" style={{ marginBottom: '2px' }}>
                            {!isSameGroup && (
                              otherUser?.avatar_url
                                ? <img src={otherUser.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                                : <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-gray-900"
                                       style={{ background: 'linear-gradient(135deg,#f5c842,#ffb347)' }}>
                                    {initials}
                                  </div>
                            )}
                          </div>
                        )}

                        <div
                          className="max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                          style={{
                            background: isMe
                              ? 'linear-gradient(135deg, #f5c842, #ffb347)'
                              : 'rgba(255,255,255,0.08)',
                            color: isMe ? '#0f0f1c' : '#eeebf8',
                            fontWeight: isMe ? 500 : 400,
                            borderBottomRightRadius: isMe ? '6px' : '18px',
                            borderBottomLeftRadius: !isMe ? '6px' : '18px',
                          }}
                        >
                          {msg.content}
                          <div
                            className="text-[10px] mt-1"
                            style={{ opacity: 0.55, textAlign: isMe ? 'right' : 'left' }}
                          >
                            {formatTime(msg.created_at)}
                            {isMe && msg.read_at && <span className="ml-1">✓✓</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input bar ── */}
        <form
          onSubmit={send}
          className="shrink-0 flex items-center gap-3 px-4 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(7,7,15,0.9)' }}
        >
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={`Message ${otherUser?.name || otherUsername}…`}
            className="flex-1 bg-transparent text-sm text-white placeholder-muted outline-none py-2 px-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: text.trim() ? 'linear-gradient(135deg,#f5c842,#ffb347)' : 'rgba(255,255,255,0.06)' }}
          >
            {sending ? (
              <span className="w-4 h-4 rounded-full border-2 border-gray-900 border-t-transparent animate-spin inline-block" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke={text.trim() ? '#0f0f1c' : '#6868a0'} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </>
  )
}
