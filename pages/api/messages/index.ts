import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { query, queryOne, run, randomUUID } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })
  const me = (session.user as any).id as string

  // GET — list all conversations for the current user
  if (req.method === 'GET') {
    const rows = query<any>(`
      SELECT
        c.id,
        c.last_message_at,
        CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END AS other_id,
        (SELECT u.username FROM users u WHERE u.id = CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END) AS other_username,
        (SELECT u.name     FROM users u WHERE u.id = CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END) AS other_name,
        (SELECT u.avatar_url FROM users u WHERE u.id = CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END) AS other_avatar,
        (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
        (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_sender_id,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.read_at IS NULL) AS unread_count
      FROM conversations c
      WHERE c.user1_id = ? OR c.user2_id = ?
      ORDER BY c.last_message_at DESC
    `, [me, me, me, me, me, me, me])

    return res.status(200).json(rows)
  }

  // POST — send a message (creates conversation if needed)
  if (req.method === 'POST') {
    const { to_username, content } = req.body
    if (!to_username || !content?.trim()) return res.status(400).json({ error: 'Missing fields' })

    const target = queryOne<any>('SELECT id FROM users WHERE username = ?', [to_username])
    if (!target) return res.status(404).json({ error: 'User not found' })
    if (target.id === me) return res.status(400).json({ error: 'Cannot message yourself' })

    const u1 = me < target.id ? me : target.id
    const u2 = me < target.id ? target.id : me

    let conv = queryOne<any>('SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?', [u1, u2])
    if (!conv) {
      const cid = randomUUID()
      run('INSERT INTO conversations (id, user1_id, user2_id) VALUES (?, ?, ?)', [cid, u1, u2])
      conv = { id: cid }
    }

    const msgId = randomUUID()
    run(
      'INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (?, ?, ?, ?)',
      [msgId, conv.id, me, content.trim()]
    )
    run('UPDATE conversations SET last_message_at = datetime("now") WHERE id = ?', [conv.id])

    const msg = queryOne<any>('SELECT * FROM messages WHERE id = ?', [msgId])
    return res.status(201).json({ ...msg, conversation_id: conv.id })
  }

  res.status(405).end()
}
