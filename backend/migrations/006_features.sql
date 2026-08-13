-- Mood status
ALTER TABLE users ADD COLUMN IF NOT EXISTS mood TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mood_updated_at TIMESTAMPTZ;

-- Reactions on messages (one reaction per user per message; re-tapping
-- the same emoji removes it, tapping a different one replaces it)
CREATE TABLE IF NOT EXISTS message_reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);

-- Streaks are computed on the fly from messages (no dedicated table needed
-- at this scale) — see getStreakForConversation in models/Message.js.
