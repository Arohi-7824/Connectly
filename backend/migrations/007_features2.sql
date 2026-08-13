-- Message types: 'text' (default), 'poll', 'voice'
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_duration INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS waveform JSONB;

-- Polls
CREATE TABLE IF NOT EXISTS polls (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE UNIQUE,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_options (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
  option_id INTEGER REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);

-- Custom chat themes (personal client-side preference, not shared)
ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_theme TEXT NOT NULL DEFAULT 'default';

-- Music status via Last.fm (free, no OAuth needed for public read-only data)
ALTER TABLE users ADD COLUMN IF NOT EXISTS lastfm_username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_track TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_track_updated_at TIMESTAMPTZ;
