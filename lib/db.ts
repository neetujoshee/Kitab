import Database from 'better-sqlite3'
import path from 'path'
import { randomUUID } from 'crypto'

declare global {
  // eslint-disable-next-line no-var
  var __kitabDb: Database.Database | undefined
}

const DB_PATH = path.join(process.cwd(), 'kitab.db')

function initSchema(db: Database.Database) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT,
      bio TEXT,
      avatar_url TEXT,
      location TEXT,
      website TEXT,
      email_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_ol_key TEXT NOT NULL,
      rating REAL NOT NULL,
      liked INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, book_ol_key)
    );

    CREATE TABLE IF NOT EXISTS reading_status (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_ol_key TEXT NOT NULL,
      book_title TEXT,
      book_cover_id INTEGER,
      book_author TEXT,
      status TEXT NOT NULL CHECK(status IN ('want-to-read','reading','read','dnf')),
      started_at TEXT,
      finished_at TEXT,
      format TEXT DEFAULT 'physical',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, book_ol_key)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_ol_key TEXT NOT NULL,
      book_title TEXT,
      book_cover_id INTEGER,
      rating REAL,
      content TEXT NOT NULL,
      has_spoilers INTEGER DEFAULT 0,
      is_private INTEGER DEFAULT 0,
      likes_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS review_likes (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, review_id)
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (follower_id, following_id)
    );

    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      is_ranked INTEGER DEFAULT 0,
      is_private INTEGER DEFAULT 0,
      likes_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS list_books (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      book_ol_key TEXT NOT NULL,
      book_title TEXT,
      book_cover_id INTEGER,
      book_author TEXT,
      position INTEGER,
      note TEXT,
      added_at TEXT DEFAULT (datetime('now')),
      UNIQUE(list_id, book_ol_key)
    );

    CREATE TABLE IF NOT EXISTS diary_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_ol_key TEXT NOT NULL,
      book_title TEXT,
      book_cover_id INTEGER,
      entry_type TEXT NOT NULL CHECK(entry_type IN ('started','progress','finished','dnf','reread')),
      rating REAL,
      content TEXT,
      pages_read INTEGER,
      current_page INTEGER,
      is_private INTEGER DEFAULT 0,
      logged_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      message TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_favorites (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_ol_key TEXT NOT NULL,
      book_title TEXT,
      book_cover_id INTEGER,
      position INTEGER NOT NULL,
      PRIMARY KEY (user_id, book_ol_key)
    );

    CREATE INDEX IF NOT EXISTS idx_ratings_book ON ratings(book_ol_key);
    CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);
    CREATE INDEX IF NOT EXISTS idx_status_user ON reading_status(user_id);
    CREATE INDEX IF NOT EXISTS idx_status_book ON reading_status(book_ol_key);
    CREATE INDEX IF NOT EXISTS idx_reviews_book ON reviews(book_ol_key);
    CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
    CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
    CREATE INDEX IF NOT EXISTS idx_diary_user ON diary_entries(user_id, logged_at);

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user1_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user2_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_message_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user1_id, user2_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_conv_user1 ON conversations(user1_id);
    CREATE INDEX IF NOT EXISTS idx_conv_user2 ON conversations(user2_id);
  `)
}

export function getDb(): Database.Database {
  if (!global.__kitabDb) {
    global.__kitabDb = new Database(DB_PATH)
    initSchema(global.__kitabDb)
  }
  return global.__kitabDb
}

export function query<T = any>(sql: string, params: any[] = []): T[] {
  return getDb().prepare(sql).all(...params) as T[]
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  return (getDb().prepare(sql).get(...params) as T) ?? null
}

export function run(sql: string, params: any[] = []) {
  return getDb().prepare(sql).run(...params)
}

export { randomUUID }
