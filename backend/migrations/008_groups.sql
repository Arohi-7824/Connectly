-- Groups: reuse the existing conversations table (is_group already exists),
-- just add metadata.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- Group membership + roles. Kept separate from the 1:1 `contacts` table
-- since group semantics (N members, roles) don't fit the pairwise model
-- contacts already relies on for streaks/mood/etc.
CREATE TABLE IF NOT EXISTS conversation_members (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id);

-- Squad Goals: a shared checklist item per group. "Completed" once every
-- current member has checked in.
CREATE TABLE IF NOT EXISTS squad_goals (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS squad_goal_checkins (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES squad_goals(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(goal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_squad_goals_conversation ON squad_goals(conversation_id);
CREATE INDEX IF NOT EXISTS idx_squad_goal_checkins_goal ON squad_goal_checkins(goal_id);
