-- Add age column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;

-- Drop old invite_codes if exists
DROP TABLE IF EXISTS invite_codes;

-- Guardian link requests
CREATE TABLE IF NOT EXISTS guardian_links (
  id SERIAL PRIMARY KEY,
  guardian_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  child_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, active, rejected
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(guardian_id, child_id)
);
