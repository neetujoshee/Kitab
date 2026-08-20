import type { NextApiRequest, NextApiResponse } from 'next'
import { searchBooks, docToBook } from '../../lib/openlibrary'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const q = (req.query.q as string) || ''
  if (!q.trim()) return res.status(200).json({ docs: [] })
  const docs = await searchBooks(q, 24)
  res.status(200).json({ docs: docs.map(docToBook) })
}
