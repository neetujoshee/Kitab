import type { NextApiRequest, NextApiResponse } from 'next'
import { queryOne, query } from '../../lib/db'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const { username } = req.query
  if (!username) return res.status(400).json({ error: 'username required' })

  const user = queryOne<any>('SELECT id FROM users WHERE username=?', [username])
  if (!user) return res.status(404).json({ error: 'Not found' })
  const uid = user.id

  const overview = queryOne<any>(`
    SELECT
      (SELECT COUNT(*) FROM reading_status WHERE user_id=? AND status='read') AS books_read,
      (SELECT COUNT(*) FROM reading_status WHERE user_id=? AND status='reading') AS reading_now,
      (SELECT COUNT(*) FROM reading_status WHERE user_id=? AND status='want-to-read') AS want_to_read,
      (SELECT COUNT(*) FROM reading_status WHERE user_id=? AND status='dnf') AS dnf,
      (SELECT COUNT(*) FROM reviews WHERE user_id=? AND is_private=0) AS reviews_count,
      (SELECT ROUND(AVG(rating),2) FROM ratings WHERE user_id=?) AS avg_rating,
      (SELECT COUNT(*) FROM ratings WHERE user_id=?) AS ratings_count
  `, [uid, uid, uid, uid, uid, uid, uid])

  // Books finished per month (last 12 months)
  const byMonth = query<any>(`
    SELECT
      strftime('%Y-%m', logged_at) AS month,
      COUNT(*) AS count
    FROM diary_entries
    WHERE user_id=? AND entry_type='finished'
      AND logged_at >= date('now', '-12 months')
    GROUP BY month ORDER BY month ASC
  `, [uid])

  // Rating distribution
  const ratingDist = query<any>(`
    SELECT
      CAST(ROUND(rating * 2) / 2 AS TEXT) AS star,
      COUNT(*) AS count
    FROM ratings WHERE user_id=?
    GROUP BY star ORDER BY star DESC
  `, [uid])

  res.status(200).json({ overview, byMonth, ratingDist })
}
