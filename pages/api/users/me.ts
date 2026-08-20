import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { run, queryOne } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })
  const userId = (session.user as any).id

  if (req.method !== 'PATCH') return res.status(405).end()

  const { name, bio, location, website } = req.body

  run(
    `UPDATE users SET name=?, bio=?, location=?, website=?, updated_at=datetime('now') WHERE id=?`,
    [name?.trim() || null, bio?.trim() || null, location?.trim() || null, website?.trim() || null, userId]
  )

  const user = queryOne<any>(
    'SELECT id, username, name, bio, location, website, avatar_url FROM users WHERE id=?',
    [userId]
  )
  res.status(200).json(user)
}
