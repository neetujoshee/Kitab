import type { NextApiRequest, NextApiResponse } from 'next'
import { CURATED_BOOKS, GENRES, getBooksByGenre, curatedToOLBook } from '../../../lib/curated-books'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { genre, limit, featured } = req.query

  if (featured === '1') {
    // Return a curated cross-genre selection for the landing page
    const picks: typeof CURATED_BOOKS = []
    const perGenre = 2
    for (const g of GENRES) {
      const books = getBooksByGenre(g).slice(0, perGenre)
      picks.push(...books)
    }
    return res.json({
      genres: GENRES,
      books: picks.map(curatedToOLBook),
    })
  }

  if (genre && typeof genre === 'string') {
    const books = getBooksByGenre(genre)
    const n = Math.min(Number(limit) || 8, 20)
    return res.json({ genre, books: books.slice(0, n).map(curatedToOLBook) })
  }

  // Return all genres with their books
  const n = Math.min(Number(limit) || 8, 20)
  const byGenre = GENRES.map(g => ({
    genre: g,
    books: getBooksByGenre(g).slice(0, n).map(curatedToOLBook),
  }))

  return res.json({ genres: GENRES, byGenre })
}
