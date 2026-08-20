import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Navbar from '../components/Navbar'

export default function Settings() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const username = (session?.user as any)?.username

  const [form, setForm] = useState({ name: '', bio: '', location: '', website: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/auth/signin'); return }
    if (status !== 'authenticated' || !username) return
    fetch(`/api/users/${username}`)
      .then(r => r.json())
      .then(d => {
        if (d?.user) {
          const u = d.user
          setForm({
            name: u.name || '',
            bio: u.bio || '',
            location: u.location || '',
            website: u.website || '',
          })
        }
      })
      .finally(() => setLoading(false))
  }, [status, username])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setSaved(true)
      await update()
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: '6px',
  }

  if (loading) return (
    <>
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-16 space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-12 skeleton rounded-xl" />)}
      </div>
    </>
  )

  return (
    <>
      <Head><title>Settings · Kitab</title></Head>
      <Navbar />

      <main className="max-w-xl mx-auto px-4 py-10 animate-up">
        <div className="mb-8">
          <h1 className="font-display font-black text-2xl text-white" style={{ letterSpacing: '-0.02em' }}>
            Edit profile
          </h1>
          <p className="text-muted text-sm mt-1">Update how others see you on Kitab.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username (read-only) */}
          <div>
            <label style={labelStyle}>Username</label>
            <div
              className="input flex items-center gap-2 text-muted text-sm"
              style={{ cursor: 'not-allowed', opacity: 0.6 }}
            >
              @{username}
            </div>
            <p className="text-[11px] text-muted mt-1.5">Username cannot be changed.</p>
          </div>

          <div>
            <label style={labelStyle}>Display name</label>
            <input
              value={form.name}
              onChange={set('name')}
              className="input w-full"
              placeholder="Your name"
              maxLength={60}
            />
          </div>

          <div>
            <label style={labelStyle}>Bio</label>
            <textarea
              value={form.bio}
              onChange={set('bio')}
              className="input w-full resize-none"
              placeholder="Tell readers about yourself…"
              rows={3}
              maxLength={300}
            />
            <p className="text-[11px] text-muted mt-1">{form.bio.length}/300</p>
          </div>

          <div>
            <label style={labelStyle}>Location</label>
            <input
              value={form.location}
              onChange={set('location')}
              className="input w-full"
              placeholder="City, Country"
              maxLength={80}
            />
          </div>

          <div>
            <label style={labelStyle}>Website</label>
            <input
              type="url"
              value={form.website}
              onChange={set('website')}
              className="input w-full"
              placeholder="https://yoursite.com"
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-md btn-gold flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-gray-900 border-t-transparent animate-spin" />
                  Saving…
                </>
              ) : 'Save changes'}
            </button>

            {saved && (
              <span className="text-sm font-medium animate-up" style={{ color: '#4ade80' }}>
                ✓ Profile updated
              </span>
            )}
          </div>
        </form>
      </main>
    </>
  )
}
