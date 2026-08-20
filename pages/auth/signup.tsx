import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import AuthLayout from '../../components/AuthLayout'

type Props = { googleEnabled: boolean }

export default function SignUp({ googleEnabled }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', username: '', name: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Something went wrong')
      setLoading(false)
      return
    }
    await signIn('credentials', { email: form.email, password: form.password, redirect: false })
    router.replace('/feed')
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: '6px',
  }

  const inputStyle: React.CSSProperties = { fontSize: '15px', padding: '12px 14px' }

  return (
    <>
      <Head><title>Create account · Kitab</title></Head>
      <AuthLayout title="Start your reading life." subtitle="Create a free account — no credit card needed.">

        {/* Google */}
        {googleEnabled && (
          <>
            <button
              onClick={() => signIn('google', { callbackUrl: '/feed' })}
              className="w-full flex items-center justify-center gap-3 mb-5"
              style={{
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#e5e5e5',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>or sign up with email</span>
              <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div
            className="mb-4 text-sm text-center"
            style={{
              padding: '10px 16px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '10px',
              color: '#f87171',
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name + Username */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Display name</label>
              <input
                value={form.name}
                onChange={set('name')}
                className="input w-full"
                style={inputStyle}
                placeholder="Your name"
              />
            </div>
            <div>
              <label style={labelStyle}>Username</label>
              <input
                value={form.username}
                onChange={set('username')}
                className="input w-full"
                style={inputStyle}
                placeholder="booklover"
                required
                pattern="[a-zA-Z0-9_]{3,30}"
                title="3–30 chars: letters, numbers, underscores"
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              className="input w-full"
              style={inputStyle}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                className="input w-full"
                style={{ ...inputStyle, paddingRight: '44px' }}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.3)', padding: '4px', display: 'flex',
                }}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full"
            style={{
              padding: '13px',
              fontSize: '15px',
              fontWeight: 700,
              borderRadius: '12px',
              marginTop: '8px',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-gray-900 border-t-transparent animate-spin inline-block" />
                Creating account…
              </>
            ) : 'Create my account →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '12px' }}>
          Free forever. No ads. No credit card needed.
        </p>

        <div
          className="mt-6 pt-6 text-center text-sm"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
        >
          Already have an account?{' '}
          <Link
            href="/auth/signin"
            style={{ color: '#f5c842', fontWeight: 600, textDecoration: 'none' }}
            className="hover:opacity-80 transition-opacity"
          >
            Sign in
          </Link>
        </div>
      </AuthLayout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  const googleEnabled =
    !!process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id'
  return { props: { googleEnabled } }
}
