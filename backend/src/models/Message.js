import { query } from "../config/db.js";

export async function saveMessage({ senderId, conversationId, content, type = "text", audioUrl = null, audioDuration = null, waveform = null }) {
  const result = await query(
    `INSERT INTO messages (sender_id, conversation_id, content, type, audio_url, audio_duration, waveform)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, sender_id, conversation_id, content, type, audio_url, audio_duration, waveform, created_at`,
    [senderId, conversationId, content, type, audioUrl, audioDuration, waveform ? JSON.stringify(waveform) : null]
  );
  return result.rows[0];
}

export async function getMessagesByConversation(conversationId, limit = 50) {
  const result = await query(
    `SELECT * FROM messages
     WHERE conversation_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [conversationId, limit]
  );
  return result.rows.reverse();
}

/* ── Reactions ──────────────────────────────────── */

// Adds/replaces a user's reaction on a message. Re-sending the same emoji
// removes it (toggle off); sending a different emoji replaces it.
export async function setReaction({ messageId, userId, emoji }) {
  const existing = await query(
    `SELECT emoji FROM message_reactions WHERE message_id = $1 AND user_id = $2`,
    [messageId, userId]
  );

  if (existing.rows.length > 0 && existing.rows[0].emoji === emoji) {
    await query(
      `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2`,
      [messageId, userId]
    );
  } else {
    await query(
      `INSERT INTO message_reactions (message_id, user_id, emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id)
       DO UPDATE SET emoji = $3, created_at = now()`,
      [messageId, userId, emoji]
    );
  }

  return getReactionsForMessage(messageId);
}

export async function getReactionsForMessage(messageId) {
  const result = await query(
    `SELECT emoji, user_id FROM message_reactions WHERE message_id = $1`,
    [messageId]
  );
  return result.rows;
}

export async function getReactionsForConversation(conversationId) {
  const result = await query(
    `SELECT mr.message_id, mr.emoji, mr.user_id
     FROM message_reactions mr
     JOIN messages m ON m.id = mr.message_id
     WHERE m.conversation_id = $1`,
    [conversationId]
  );
  // Group by message_id -> [{ emoji, user_id }]
  const byMessage = {};
  for (const row of result.rows) {
    if (!byMessage[row.message_id]) byMessage[row.message_id] = [];
    byMessage[row.message_id].push({ emoji: row.emoji, user_id: row.user_id });
  }
  return byMessage;
}

/* ── Streaks ────────────────────────────────────── */
// A day "counts" toward a streak only if BOTH participants sent at least
// one message in that conversation on that calendar day. The current
// streak is the number of consecutive qualifying days ending today or
// yesterday (a gap of 2+ days breaks it back to 0).
export async function getStreakForConversation(conversationId, userA, userB) {
  const result = await query(
    `SELECT DISTINCT sender_id, DATE(created_at) AS day
     FROM messages
     WHERE conversation_id = $1 AND sender_id IN ($2, $3)`,
    [conversationId, userA, userB]
  );

  const daysA = new Set(), daysB = new Set();
  for (const row of result.rows) {
    const day = row.day instanceof Date
      ? row.day.toISOString().slice(0, 10)
      : String(row.day).slice(0, 10);
    if (Number(row.sender_id) === Number(userA)) daysA.add(day);
    else daysB.add(day);
  }

  const qualifying = [...daysA].filter(d => daysB.has(d)).sort();
  if (qualifying.length === 0) return 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const mostRecent = new Date(qualifying[qualifying.length - 1] + "T00:00:00Z");
  const gapFromToday = Math.round((today - mostRecent) / 86400000);
  if (gapFromToday > 1) return 0; // streak is broken

  let streak = 1;
  for (let i = qualifying.length - 2; i >= 0; i--) {
    const cur = new Date(qualifying[i + 1] + "T00:00:00Z");
    const prev = new Date(qualifying[i] + "T00:00:00Z");
    const gap = Math.round((cur - prev) / 86400000);
    if (gap === 1) streak++;
    else break;
  }
  return streak;
}


/* ── Scheduled messages ─────────────────────────── */

export async function createScheduledMessage({
  senderId,
  conversationId,
  content,
  scheduledFor,
}) {
  const result = await query(
    `INSERT INTO scheduled_messages
       (sender_id, conversation_id, content, scheduled_for)
     VALUES ($1, $2, $3, $4)
     RETURNING id, sender_id, conversation_id, content,
               scheduled_for, status, created_at`,
    [senderId, conversationId, content, scheduledFor]
  );
  return result.rows[0];
}

export async function getScheduledMessages({
  senderId,
  conversationId = null,
}) {
  const params = [senderId];
  let sql = `
    SELECT id, sender_id, conversation_id, content,
           scheduled_for, status, message_id, created_at, sent_at, error
    FROM scheduled_messages
    WHERE sender_id = $1
  `;

  if (conversationId !== null) {
    params.push(conversationId);
    sql += ` AND conversation_id = $2`;
  }

  sql += ` ORDER BY scheduled_for ASC`;
  const result = await query(sql, params);
  return result.rows;
}

export async function cancelScheduledMessage({ id, senderId }) {
  const result = await query(
    `UPDATE scheduled_messages
     SET status = 'cancelled'
     WHERE id = $1
       AND sender_id = $2
       AND status = 'pending'
     RETURNING id, status`,
    [id, senderId]
  );
  return result.rows[0] || null;
}
