import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { query, queryOne, run, randomUUID } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password, username, name } = req.body
  if (!email || !password || !username) return res.status(400).json({ error: 'Missing fields' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return res.status(400).json({ error: 'Username must be 3–30 alphanumeric characters or underscores' })

  const existing = queryOne('SELECT id FROM users WHERE email=? OR username=?', [email.toLowerCase(), username.toLowerCase()])
  if (existing) return res.status(400).json({ error: 'Email or username already taken' })

  const password_hash = await bcrypt.hash(password, 12)
  const id = randomUUID()
  run(
    'INSERT INTO users (id, email, username, name, password_hash) VALUES (?,?,?,?,?)',
    [id, email.toLowerCase(), username.toLowerCase(), name || username, password_hash]
  )
  const user = queryOne<any>('SELECT id, email, username FROM users WHERE id=?', [id])
  res.status(201).json(user)
}
