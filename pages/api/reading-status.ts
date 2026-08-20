import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { query, queryOne, run, randomUUID } from '../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (req.method === 'GET') {
    const { bookKey, username } = req.query
    if (username) {
      const user = queryOne<any>('SELECT id FROM users WHERE username=?', [username])
      if (!user) return res.status(404).json({ error: 'User not found' })
      return res.status(200).json(query('SELECT * FROM reading_status WHERE user_id=? ORDER BY updated_at DESC', [user.id]))
    }
    if (!session) return res.status(401).json({ error: 'Unauthorized' })
    const userId = (session.user as any).id
    if (bookKey) return res.status(200).json(queryOne('SELECT * FROM reading_status WHERE user_id=? AND book_ol_key=?', [userId, bookKey]))
    return res.status(200).json(query('SELECT * FROM reading_status WHERE user_id=? ORDER BY updated_at DESC', [userId]))
  }

  if (!session) return res.status(401).json({ error: 'Unauthorized' })
  const userId = (session.user as any).id

  if (req.method === 'POST') {
    const { bookKey, status, bookTitle, bookCoverId, bookAuthor, startedAt, finishedAt } = req.body
    if (!bookKey || !status) return res.status(400).json({ error: 'Missing fields' })

    const existing = queryOne<any>('SELECT id FROM reading_status WHERE user_id=? AND book_ol_key=?', [userId, bookKey])
    if (existing) {
      run(
        `UPDATE reading_status SET status=?, book_title=?, book_cover_id=?, book_author=?,
         started_at=COALESCE(?, started_at), finished_at=?, updated_at=datetime('now') WHERE id=?`,
        [status, bookTitle, bookCoverId ?? null, bookAuthor ?? null, startedAt ?? null, finishedAt ?? null, existing.id]
      )
    } else {
      const id = randomUUID()
      run(
        'INSERT INTO reading_status (id, user_id, book_ol_key, status, book_title, book_cover_id, book_author, started_at, finished_at) VALUES (?,?,?,?,?,?,?,?,?)',
        [id, userId, bookKey, status, bookTitle ?? null, bookCoverId ?? null, bookAuthor ?? null, startedAt ?? null, finishedAt ?? null]
      )
    }

    // Auto diary entry
    const entryType = status === 'reading' ? 'started' : status === 'read' ? 'finished' : status === 'dnf' ? 'dnf' : null
    if (entryType) {
      const already = queryOne('SELECT id FROM diary_entries WHERE user_id=? AND book_ol_key=? AND entry_type=?', [userId, bookKey, entryType])
      if (!already) {
        run(
          'INSERT INTO diary_entries (id, user_id, book_ol_key, book_title, book_cover_id, entry_type) VALUES (?,?,?,?,?,?)',
          [randomUUID(), userId, bookKey, bookTitle ?? null, bookCoverId ?? null, entryType]
        )
      }
    }

    return res.status(200).json(queryOne('SELECT * FROM reading_status WHERE user_id=? AND book_ol_key=?', [userId, bookKey]))
  }

  if (req.method === 'DELETE') {
    const { bookKey } = req.body
    run('DELETE FROM reading_status WHERE user_id=? AND book_ol_key=?', [userId, bookKey])
    return res.status(204).end()
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
  res.status(405).end()
}
