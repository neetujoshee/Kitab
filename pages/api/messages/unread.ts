import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { queryOne } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(200).json({ count: 0 })
  const me = (session.user as any).id as string

  const row = queryOne<{ count: number }>(`
    SELECT COUNT(*) AS count FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE (c.user1_id = ? OR c.user2_id = ?)
      AND m.sender_id != ?
      AND m.read_at IS NULL
  `, [me, me, me])

  res.status(200).json({ count: row?.count ?? 0 })
}
