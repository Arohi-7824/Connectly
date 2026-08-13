import { query } from "../config/db.js";

export async function createUser({ name, email, passwordHash, role, username, dob, age }) {
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role, username, dob, age)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, email, role, username, age, created_at`,
    [name, email, passwordHash, role, username, dob || null, age || null]
  );
  return result.rows[0];
}

export async function findUserByEmail(email) {
  const result = await query(`SELECT * FROM users WHERE email = $1`, [email]);
  return result.rows[0];
}

export async function findUserById(id) {
  const result = await query(
    `SELECT id, name, email, role, username, age, created_at FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}

export async function getUserProfile(userId) {
  const result = await query(
    `SELECT id, name, username, mood, mood_updated_at, chat_theme,
            lastfm_username, current_track, current_track_updated_at
     FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function updateMood(userId, mood) {
  const result = await query(
    `UPDATE users SET mood = $2, mood_updated_at = now()
     WHERE id = $1
     RETURNING id, name, username, mood, mood_updated_at`,
    [userId, mood]
  );
  return result.rows[0];
}

export async function updateTheme(userId, theme) {
  const result = await query(
    `UPDATE users SET chat_theme = $2 WHERE id = $1 RETURNING id, chat_theme`,
    [userId, theme]
  );
  return result.rows[0];
}

export async function updateLastfmUsername(userId, lastfmUsername) {
  const result = await query(
    `UPDATE users SET lastfm_username = $2 WHERE id = $1
     RETURNING id, lastfm_username`,
    [userId, lastfmUsername]
  );
  return result.rows[0];
}

export async function updateCurrentTrack(userId, currentTrack) {
  const result = await query(
    `UPDATE users SET current_track = $2, current_track_updated_at = now()
     WHERE id = $1
     RETURNING id, current_track, current_track_updated_at`,
    [userId, currentTrack]
  );
  return result.rows[0];
}
