import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { query, queryOne, run, randomUUID } from '../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { bookKey } = req.query
    if (!bookKey) return res.status(400).json({ error: 'Missing bookKey' })
    const rows = query<any>('SELECT rating FROM ratings WHERE book_ol_key=?', [bookKey])
    const count = rows.length
    const avg = count ? rows.reduce((s, r) => s + r.rating, 0) / count : 0
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    rows.forEach(r => { const star = Math.min(5, Math.round(r.rating)); dist[star] = (dist[star] || 0) + 1 })
    return res.status(200).json({ avg: parseFloat(avg.toFixed(2)), count, distribution: dist })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })
  const userId = (session.user as any).id

  if (req.method === 'POST') {
    const { bookKey, rating, liked } = req.body
    if (!bookKey) return res.status(400).json({ error: 'Missing bookKey' })
    if (rating !== undefined && rating !== null && (rating < 0.5 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be 0.5–5.0' })
    }
    if (rating === null) {
      run('DELETE FROM ratings WHERE user_id=? AND book_ol_key=?', [userId, bookKey])
      return res.status(204).end()
    }

    const existing = queryOne<any>('SELECT id FROM ratings WHERE user_id=? AND book_ol_key=?', [userId, bookKey])
    if (existing) {
      run(
        `UPDATE ratings SET rating=COALESCE(?,rating), liked=COALESCE(?,liked), updated_at=datetime('now') WHERE id=?`,
        [rating ?? null, liked !== undefined ? (liked ? 1 : 0) : null, existing.id]
      )
    } else {
      const id = randomUUID()
      run('INSERT INTO ratings (id, user_id, book_ol_key, rating, liked) VALUES (?,?,?,?,?)',
        [id, userId, bookKey, rating, liked ? 1 : 0])
    }
    return res.status(200).json(queryOne('SELECT * FROM ratings WHERE user_id=? AND book_ol_key=?', [userId, bookKey]))
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}
