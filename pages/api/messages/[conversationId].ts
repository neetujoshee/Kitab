import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { query, queryOne, run } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })
  const me = (session.user as any).id as string
  const { conversationId } = req.query as { conversationId: string }

  // Verify this user is part of the conversation
  const conv = queryOne<any>(
    'SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
    [conversationId, me, me]
  )
  if (!conv) return res.status(404).json({ error: 'Not found' })

  if (req.method === 'GET') {
    // Mark incoming messages as read
    run(
      `UPDATE messages SET read_at = datetime('now')
       WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL`,
      [conversationId, me]
    )

    const messages = query<any>(`
      SELECT m.*, u.username AS sender_username, u.name AS sender_name, u.avatar_url AS sender_avatar
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
      LIMIT 100
    `, [conversationId])

    return res.status(200).json(messages)
  }

  res.status(405).end()
}
