-- Add username to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Update existing users with a default username from their name
UPDATE users SET username = LOWER(REPLACE(name, ' ', '_')) || '_' || id
WHERE username IS NULL;

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, contact_id)
);