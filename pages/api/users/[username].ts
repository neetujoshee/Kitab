import type { NextApiRequest, NextApiResponse } from 'next'
import { queryOne, query } from '../../../lib/db'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const { username } = req.query

  const user = queryOne<any>(
    'SELECT id, username, name, bio, avatar_url, location, website, created_at FROM users WHERE username=?',
    [username]
  )
  if (!user) return res.status(404).json({ error: 'Not found' })

  const stats = queryOne<any>(
    `SELECT
      (SELECT COUNT(*) FROM reading_status WHERE user_id=? AND status='read') AS books_read,
      (SELECT COUNT(*) FROM reviews WHERE user_id=? AND is_private=0) AS reviews_count,
      (SELECT COUNT(*) FROM follows WHERE following_id=?) AS followers,
      (SELECT COUNT(*) FROM follows WHERE follower_id=?) AS following,
      (SELECT COUNT(*) FROM lists WHERE user_id=? AND is_private=0) AS lists_count`,
    [user.id, user.id, user.id, user.id, user.id]
  )

  const favorites = query<any>('SELECT * FROM user_favorites WHERE user_id=? ORDER BY position ASC LIMIT 6', [user.id])
  const recentReviews = query<any>(
    `SELECT r.*, u.username, u.name FROM reviews r JOIN users u ON u.id=r.user_id
     WHERE r.user_id=? AND r.is_private=0 ORDER BY r.created_at DESC LIMIT 6`,
    [user.id]
  )

  res.status(200).json({ user, stats, favorites, recentReviews })
}
