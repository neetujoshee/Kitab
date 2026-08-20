-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  bio TEXT,
  avatar_url VARCHAR(500),
  location VARCHAR(255),
  website VARCHAR(500),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NextAuth OAuth accounts
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50),
  provider VARCHAR(50),
  provider_account_id VARCHAR(255),
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type VARCHAR(50),
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, provider_account_id)
);

-- NextAuth sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

-- NextAuth verification tokens
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier VARCHAR(255),
  token VARCHAR(255),
  expires TIMESTAMPTZ,
  PRIMARY KEY (identifier, token)
);

-- Book cache (from Open Library)
CREATE TABLE IF NOT EXISTS books (
  ol_key VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  subtitle VARCHAR(500),
  author_names TEXT[],
  author_keys TEXT[],
  cover_id INTEGER,
  description TEXT,
  genres TEXT[],
  first_publish_year INTEGER,
  page_count INTEGER,
  language VARCHAR(50),
  isbn VARCHAR(50),
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ratings (half-star: 0.5 to 5.0)
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_ol_key VARCHAR(255) NOT NULL,
  rating DECIMAL(2,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5.0),
  liked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_ol_key)
);

-- Reading status per book per user
CREATE TABLE IF NOT EXISTS reading_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_ol_key VARCHAR(255) NOT NULL,
  book_title VARCHAR(500),
  book_cover_id INTEGER,
  book_author VARCHAR(500),
  status VARCHAR(20) NOT NULL CHECK (status IN ('want-to-read', 'reading', 'read', 'dnf')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  format VARCHAR(20) DEFAULT 'physical',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_ol_key)
);

-- Reading progress checkpoints
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_ol_key VARCHAR(255) NOT NULL,
  current_page INTEGER,
  total_pages INTEGER,
  percentage DECIMAL(5,2),
  note TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_ol_key VARCHAR(255) NOT NULL,
  book_title VARCHAR(500),
  book_cover_id INTEGER,
  rating DECIMAL(2,1) CHECK (rating >= 0.5 AND rating <= 5.0),
  content TEXT NOT NULL,
  has_spoilers BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review likes
CREATE TABLE IF NOT EXISTS review_likes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, review_id)
);

-- Review comments
CREATE TABLE IF NOT EXISTS review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow graph
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- Lists
CREATE TABLE IF NOT EXISTS lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_ranked BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS list_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  book_ol_key VARCHAR(255) NOT NULL,
  book_title VARCHAR(500),
  book_cover_id INTEGER,
  book_author VARCHAR(500),
  position INTEGER,
  note TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, book_ol_key)
);

-- Diary entries (reading log)
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_ol_key VARCHAR(255) NOT NULL,
  book_title VARCHAR(500),
  book_cover_id INTEGER,
  entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('started','progress','finished','dnf','reread')),
  rating DECIMAL(2,1),
  content TEXT,
  pages_read INTEGER,
  current_page INTEGER,
  is_private BOOLEAN DEFAULT FALSE,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pinned favorite books on profile
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_ol_key VARCHAR(255) NOT NULL,
  book_title VARCHAR(500),
  book_cover_id INTEGER,
  position INTEGER NOT NULL,
  PRIMARY KEY (user_id, book_ol_key)
);

-- Annual reading challenges
CREATE TABLE IF NOT EXISTS reading_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  goal INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ratings_book ON ratings(book_ol_key);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_status_user ON reading_status(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_status_book ON reading_status(book_ol_key);
CREATE INDEX IF NOT EXISTS idx_reviews_book ON reviews(book_ol_key);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_diary_user ON diary_entries(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_diary_book ON diary_entries(book_ol_key);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_list_books_list ON list_books(list_id, position);
