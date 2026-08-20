export interface OLSearchDoc {
  key: string
  title: string
  author_name?: string[]
  author_key?: string[]
  cover_i?: number
  first_publish_year?: number
  number_of_pages_median?: number
  subject?: string[]
  language?: string[]
  isbn?: string[]
}

export interface OLBook {
  ol_key: string
  title: string
  subtitle?: string
  author_names: string[]
  author_keys: string[]
  cover_id?: number
  cover_isbn?: string   // fallback: covers.openlibrary.org/b/isbn/{isbn}-{size}.jpg
  description?: string
  genres: string[]
  first_publish_year?: number
  page_count?: number
  language?: string
  isbn?: string
}

export function coverUrl(coverId: number | undefined, size: 'S' | 'M' | 'L' = 'M') {
  if (!coverId) return '/images/no-cover.png'
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`
}

// Preferred helper: uses cover_id when available, falls back to cover_isbn
export function bookCoverUrl(
  book: { cover_id?: number; cover_isbn?: string },
  size: 'S' | 'M' | 'L' = 'M'
): string {
  if (book.cover_id) return `https://covers.openlibrary.org/b/id/${book.cover_id}-${size}.jpg`
  if (book.cover_isbn) return `https://covers.openlibrary.org/b/isbn/${book.cover_isbn}-${size}.jpg`
  return '/images/no-cover.png'
}

// Slug = what appears in the URL after /book/
// Works: OL82563W  →  key: /works/OL82563W
// ISBN:  isbn_9780439708180  →  key: /isbn/9780439708180
export function olKeyToSlug(key: string): string {
  if (key.startsWith('/works/')) return key.slice('/works/'.length)
  if (key.startsWith('/isbn/')) return 'isbn_' + key.slice('/isbn/'.length)
  return key
}

export function slugToOlKey(slug: string): string {
  if (slug.startsWith('isbn_')) return `/isbn/${slug.slice('isbn_'.length)}`
  return `/works/${slug}`
}

// True when the slug/key identifies a book via ISBN (curated books)
export function isIsbnKey(slugOrKey: string): boolean {
  return slugOrKey.startsWith('isbn_') || slugOrKey.startsWith('/isbn/')
}

export function extractIsbn(slugOrKey: string): string {
  return slugOrKey.replace(/^isbn_/, '').replace(/^\/isbn\//, '')
}

export async function searchBooks(q: string, limit = 20): Promise<OLSearchDoc[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${limit}&fields=key,title,author_name,author_key,cover_i,first_publish_year,number_of_pages_median,subject,language,isbn`
  const res = await fetch(url)
  const data = await res.json()
  return data.docs || []
}

// Fetch author name from OL (used by fetchFullBook / fetchBookByIsbn)
async function fetchAuthorName(authorKey: string): Promise<string> {
  try {
    const res = await fetch(`https://openlibrary.org${authorKey}.json`)
    if (!res.ok) return ''
    const a = await res.json()
    return a.name || a.personal_name || ''
  } catch { return '' }
}

// Fetch complete book data directly from the OL Works API.
// This is the correct way to load a book detail page — NOT via search.
export async function fetchFullBook(olKey: string): Promise<Partial<OLBook>> {
  try {
    const res = await fetch(`https://openlibrary.org${olKey}.json`)
    if (!res.ok) return {}
    const work = await res.json()

    let description = ''
    if (typeof work.description === 'string') description = work.description
    else if (work.description?.value) description = work.description.value

    // Authors: works API has { author: { key } } or { key } shapes
    const authorKeys: string[] = (work.authors ?? [])
      .map((a: any) => a.author?.key ?? a.key)
      .filter(Boolean)

    const authorNames = (
      await Promise.all(authorKeys.slice(0, 3).map(fetchAuthorName))
    ).filter(Boolean)

    return {
      title: work.title,
      author_names: authorNames,
      author_keys: authorKeys,
      cover_id: work.covers?.[0],
      description,
      genres: work.subjects?.slice(0, 8) ?? [],
      first_publish_year: work.first_publish_date
        ? parseInt(work.first_publish_date.match(/\d{4}/)?.[0] ?? '0') || undefined
        : undefined,
    }
  } catch {
    return {}
  }
}

// Fetch book data from OL via ISBN (for curated books).
// Returns partial OLBook + work_key so we can also load work description.
export async function fetchBookByIsbn(
  isbn: string
): Promise<Partial<OLBook> & { work_key?: string }> {
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`)
    if (!res.ok) return {}
    const ed = await res.json()

    const workKey: string | undefined = ed.works?.[0]?.key

    let authorKeys: string[] = (ed.authors ?? [])
      .map((a: any) => a.key)
      .filter(Boolean)

    // Some editions don't list authors — fall back to the work record
    if (authorKeys.length === 0 && workKey) {
      try {
        const wRes = await fetch(`https://openlibrary.org${workKey}.json`)
        if (wRes.ok) {
          const work = await wRes.json()
          authorKeys = (work.authors ?? [])
            .map((a: any) => a.author?.key ?? a.key)
            .filter(Boolean)
        }
      } catch { /* ignore */ }
    }

    const authorNames = (
      await Promise.all(authorKeys.slice(0, 3).map(fetchAuthorName))
    ).filter(Boolean)

    const year = ed.publish_date
      ? parseInt(ed.publish_date.match(/\d{4}/)?.[0] ?? '0') || undefined
      : undefined

    return {
      ol_key: workKey ?? `/isbn/${isbn}`,
      title: ed.title,
      author_names: authorNames,
      author_keys: authorKeys,
      cover_id: ed.covers?.[0],
      cover_isbn: isbn,
      first_publish_year: year,
      page_count: ed.number_of_pages,
      work_key: workKey,
    }
  } catch {
    return {}
  }
}

export async function fetchWorkDetails(olKey: string): Promise<Partial<OLBook>> {
  try {
    const res = await fetch(`https://openlibrary.org${olKey}.json`)
    if (!res.ok) return {}
    const work = await res.json()

    let description = ''
    if (typeof work.description === 'string') description = work.description
    else if (work.description?.value) description = work.description.value

    // Works always have the canonical author list — use it so edition pages
    // that lack an `authors` field still show the correct name.
    const authorKeys: string[] = (work.authors ?? [])
      .map((a: any) => a.author?.key ?? a.key)
      .filter(Boolean)

    const authorNames = authorKeys.length > 0
      ? (await Promise.all(authorKeys.slice(0, 3).map(fetchAuthorName))).filter(Boolean)
      : []

    const result: Partial<OLBook> = {
      description,
      genres: work.subjects?.slice(0, 8) ?? [],
    }
    if (authorNames.length > 0) {
      result.author_names = authorNames
      result.author_keys = authorKeys
    }
    return result
  } catch {
    return {}
  }
}

export function docToBook(doc: OLSearchDoc): OLBook {
  return {
    ol_key: doc.key,
    title: doc.title,
    author_names: doc.author_name ?? [],
    author_keys: doc.author_key ?? [],
    cover_id: doc.cover_i,
    first_publish_year: doc.first_publish_year,
    page_count: doc.number_of_pages_median,
    genres: doc.subject?.slice(0, 6) ?? [],
    language: doc.language?.[0],
    isbn: doc.isbn?.[0],
  }
}
