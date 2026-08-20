import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { query, queryOne, run, randomUUID } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { username } = req.query
    if (username) {
      const user = queryOne<any>('SELECT id FROM users WHERE username=?', [username])
      if (!user) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json(
        query(
          `SELECT l.*, u.username, u.name,
             (SELECT COUNT(*) FROM list_books lb WHERE lb.list_id=l.id) AS book_count
           FROM lists l JOIN users u ON u.id=l.user_id
           WHERE l.user_id=? AND l.is_private=0 ORDER BY l.updated_at DESC`,
          [user.id]
        )
      )
    }
    return res.status(400).json({ error: 'Specify username' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })
  const userId = (session.user as any).id

  if (req.method === 'POST') {
    const { title, description, isRanked, isPrivate } = req.body
    if (!title?.trim()) return res.status(400).json({ error: 'Title required' })
    const id = randomUUID()
    run('INSERT INTO lists (id, user_id, title, description, is_ranked, is_private) VALUES (?,?,?,?,?,?)',
      [id, userId, title.trim(), description || null, isRanked ? 1 : 0, isPrivate ? 1 : 0])
    return res.status(201).json(queryOne('SELECT * FROM lists WHERE id=?', [id]))
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}
