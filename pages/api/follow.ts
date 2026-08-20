import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { queryOne, run, randomUUID } from '../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })
  const followerId = (session.user as any).id

  if (req.method === 'GET') {
    const { username } = req.query
    const target = queryOne<any>('SELECT id FROM users WHERE username=?', [username])
    if (!target) return res.status(404).json({ error: 'Not found' })
    const row = queryOne('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?', [followerId, target.id])
    return res.status(200).json({ following: !!row })
  }

  if (req.method === 'POST') {
    const { username } = req.body
    const target = queryOne<any>('SELECT id FROM users WHERE username=?', [username])
    if (!target) return res.status(404).json({ error: 'Not found' })
    if (target.id === followerId) return res.status(400).json({ error: 'Cannot follow yourself' })
    const already = queryOne('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?', [followerId, target.id])
    if (!already) {
      run('INSERT INTO follows (follower_id, following_id) VALUES (?,?)', [followerId, target.id])
      run('INSERT INTO notifications (id, user_id, from_user_id, type, message) VALUES (?,?,?,?,?)',
        [randomUUID(), target.id, followerId, 'follow', 'started following you'])
    }
    return res.status(200).json({ following: true })
  }

  if (req.method === 'DELETE') {
    const { username } = req.body
    const target = queryOne<any>('SELECT id FROM users WHERE username=?', [username])
    if (!target) return res.status(404).json({ error: 'Not found' })
    run('DELETE FROM follows WHERE follower_id=? AND following_id=?', [followerId, target.id])
    return res.status(200).json({ following: false })
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
  res.status(405).end()
}
