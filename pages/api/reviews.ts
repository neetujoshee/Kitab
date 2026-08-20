import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { query, queryOne, run, randomUUID } from '../../lib/db'

const WITH_USER = `
  SELECT r.*, u.username, u.name, u.avatar_url
  FROM reviews r JOIN users u ON u.id = r.user_id
`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { bookKey, username, id, limit = '20', offset = '0' } = req.query
    if (id) return res.status(200).json(queryOne(`${WITH_USER} WHERE r.id=?`, [id]))
    if (username) {
      const user = queryOne<any>('SELECT id FROM users WHERE username=?', [username])
      if (!user) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json(
        query(`${WITH_USER} WHERE r.user_id=? AND r.is_private=0 ORDER BY r.created_at DESC LIMIT ? OFFSET ?`, [user.id, limit, offset])
      )
    }
    if (bookKey) {
      return res.status(200).json(
        query(`${WITH_USER} WHERE r.book_ol_key=? AND r.is_private=0 ORDER BY r.likes_count DESC, r.created_at DESC LIMIT ? OFFSET ?`, [bookKey, limit, offset])
      )
    }
    return res.status(200).json(
      query(`${WITH_USER} WHERE r.is_private=0 ORDER BY r.created_at DESC LIMIT ? OFFSET ?`, [limit, offset])
    )
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })
  const userId = (session.user as any).id

  if (req.method === 'POST') {
    const { bookKey, bookTitle, bookCoverId, rating, content, hasSpoilers, isPrivate } = req.body
    if (!bookKey || !content?.trim()) return res.status(400).json({ error: 'Missing fields' })
    const id = randomUUID()
    run(
      'INSERT INTO reviews (id, user_id, book_ol_key, book_title, book_cover_id, rating, content, has_spoilers, is_private) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, userId, bookKey, bookTitle ?? null, bookCoverId ?? null, rating ?? null, content.trim(), hasSpoilers ? 1 : 0, isPrivate ? 1 : 0]
    )
    return res.status(201).json(queryOne(`${WITH_USER} WHERE r.id=?`, [id]))
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    const review = queryOne<any>('SELECT user_id FROM reviews WHERE id=?', [id])
    if (!review || review.user_id !== userId) return res.status(403).json({ error: 'Forbidden' })
    run('DELETE FROM reviews WHERE id=?', [id])
    return res.status(204).end()
  }

  if (req.method === 'PATCH') {
    const { id, action } = req.body
    if (action === 'like') {
      const already = queryOne('SELECT 1 FROM review_likes WHERE user_id=? AND review_id=?', [userId, id])
      if (!already) {
        run('INSERT INTO review_likes (user_id, review_id) VALUES (?,?)', [userId, id])
        run('UPDATE reviews SET likes_count = likes_count + 1 WHERE id=?', [id])
      }
      return res.status(200).json({ liked: true })
    }
    if (action === 'unlike') {
      const deleted = queryOne('SELECT 1 FROM review_likes WHERE user_id=? AND review_id=?', [userId, id])
      if (deleted) {
        run('DELETE FROM review_likes WHERE user_id=? AND review_id=?', [userId, id])
        run('UPDATE reviews SET likes_count = MAX(0, likes_count - 1) WHERE id=?', [id])
      }
      return res.status(200).json({ liked: false })
    }
    return res.status(400).json({ error: 'Unknown action' })
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'PATCH'])
  res.status(405).end()
}
