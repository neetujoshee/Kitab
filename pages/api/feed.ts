import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { query } from '../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })
  const userId = (session.user as any).id
  const { tab = 'following', limit = '30', offset = '0' } = req.query

  if (tab === 'following') {
    const rows = query<any>(
      `SELECT d.*, u.username, u.name, u.avatar_url
       FROM diary_entries d JOIN users u ON u.id = d.user_id
       WHERE d.user_id IN (SELECT following_id FROM follows WHERE follower_id=?)
         AND d.is_private = 0
       ORDER BY d.logged_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    )
    return res.status(200).json(rows)
  }

  if (tab === 'popular') {
    const rows = query<any>(
      `SELECT r.*, u.username, u.name, u.avatar_url
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.is_private = 0
         AND r.created_at > datetime('now', '-7 days')
       ORDER BY r.likes_count DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    )
    return res.status(200).json(rows)
  }

  const rows = query<any>(
    `SELECT d.*, u.username, u.name, u.avatar_url
     FROM diary_entries d JOIN users u ON u.id = d.user_id
     WHERE d.is_private = 0
     ORDER BY d.logged_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  )
  return res.status(200).json(rows)
}
