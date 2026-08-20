import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { query, queryOne, run, randomUUID } from '../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { username, limit = '60', offset = '0' } = req.query
    if (!username) return res.status(400).json({ error: 'username required' })
    const user = queryOne<any>('SELECT id FROM users WHERE username=?', [username])
    if (!user) return res.status(404).json({ error: 'Not found' })
    const rows = query<any>(
      `SELECT d.* FROM diary_entries d
       WHERE d.user_id=? AND d.is_private=0
       ORDER BY d.logged_at DESC LIMIT ? OFFSET ?`,
      [user.id, limit, offset]
    )
    return res.status(200).json(rows)
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })
  const userId = (session.user as any).id

  if (req.method === 'POST') {
    const { bookKey, bookTitle, bookCoverId, entryType, rating, content, pagesRead, currentPage, isPrivate, loggedAt } = req.body
    if (!bookKey || !entryType) return res.status(400).json({ error: 'Missing fields' })
    const id = randomUUID()
    run(
      `INSERT INTO diary_entries
        (id, user_id, book_ol_key, book_title, book_cover_id, entry_type, rating, content, pages_read, current_page, is_private, logged_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, userId, bookKey, bookTitle ?? null, bookCoverId ?? null, entryType,
       rating ?? null, content ?? null, pagesRead ?? null, currentPage ?? null,
       isPrivate ? 1 : 0, loggedAt ?? new Date().toISOString()]
    )
    return res.status(201).json(queryOne('SELECT * FROM diary_entries WHERE id=?', [id]))
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    const entry = queryOne<any>('SELECT user_id FROM diary_entries WHERE id=?', [id])
    if (!entry || entry.user_id !== userId) return res.status(403).json({ error: 'Forbidden' })
    run('DELETE FROM diary_entries WHERE id=?', [id])
    return res.status(204).end()
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
  res.status(405).end()
}
