import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { queryOne, run, randomUUID } from '../../../lib/db'

const googleConfigured =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id' &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_SECRET !== 'your-google-client-secret'

const providers: any[] = [
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null
      const user = queryOne<any>(
        'SELECT id, email, username, name, avatar_url, password_hash FROM users WHERE email=?',
        [credentials.email.toLowerCase()]
      )
      if (!user || !user.password_hash) return null
      const valid = await bcrypt.compare(credentials.password, user.password_hash)
      if (!valid) return null
      return { id: user.id, email: user.email, name: user.name ?? user.username, image: user.avatar_url, username: user.username }
    },
  }),
]

if (googleConfigured) {
  providers.unshift(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  )
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const existing = queryOne<any>('SELECT id, username FROM users WHERE email=?', [user.email!])
        if (!existing) {
          const id = randomUUID()
          const base = (user.email!.split('@')[0]).replace(/[^a-z0-9_]/gi, '')
          const username = base.substring(0, 25) + Math.floor(Math.random() * 1000)
          run(
            'INSERT INTO users (id, email, username, name, avatar_url, email_verified) VALUES (?,?,?,?,?,1)',
            [id, user.email, username, user.name, user.image]
          )
          ;(user as any).username = username
          ;(user as any).id = id
        } else {
          ;(user as any).username = existing.username
          ;(user as any).id = existing.id
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.username = (user as any).username
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).username = token.username
      }
      return session
    },
  },
  pages: { signIn: '/auth/signin' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
