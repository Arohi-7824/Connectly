import { query } from "../config/db.js";
import { getStreakForConversation } from "./Message.js";

export async function searchUsers(searchTerm, currentUserId) {
  const result = await query(
    `SELECT id, name, username, role
     FROM users
     WHERE (
       LOWER(username) LIKE LOWER($1)
       OR LOWER(name) LIKE LOWER($1)
       OR LOWER(email) LIKE LOWER($1)
     )
     AND id != $2
     AND role = 'child'
     LIMIT 10`,
    [`%${searchTerm}%`, currentUserId]
  );
  return result.rows;
}

export async function sendContactRequest(senderId, receiverId) {
  const existing = await query(
    `SELECT * FROM contact_requests
     WHERE (sender_id = $1 AND receiver_id = $2)
     OR (sender_id = $2 AND receiver_id = $1)`,
    [senderId, receiverId]
  );
  if (existing.rows.length > 0) {
    throw new Error("Request already sent or you are already contacts");
  }
  const result = await query(
    `INSERT INTO contact_requests (sender_id, receiver_id)
     VALUES ($1, $2) RETURNING *`,
    [senderId, receiverId]
  );
  return result.rows[0];
}

export async function acceptContactRequest(requestId, receiverId) {
  const reqResult = await query(
    `SELECT * FROM contact_requests
     WHERE id = $1 AND receiver_id = $2 AND status = 'pending'`,
    [requestId, receiverId]
  );
  if (reqResult.rows.length === 0) throw new Error("Request not found");

  const request = reqResult.rows[0];
  const conv = await query(`INSERT INTO conversations (is_group) VALUES (false) RETURNING id`);
  const conversationId = conv.rows[0].id;

  await query(
    `INSERT INTO contacts (user_id, contact_id, conversation_id)
     VALUES ($1, $2, $3), ($2, $1, $3)`,
    [request.sender_id, request.receiver_id, conversationId]
  );
  await query(`UPDATE contact_requests SET status = 'accepted' WHERE id = $1`, [requestId]);
  return { conversationId, senderId: request.sender_id };
}

export async function rejectContactRequest(requestId, receiverId) {
  await query(
    `UPDATE contact_requests SET status = 'rejected' WHERE id = $1 AND receiver_id = $2`,
    [requestId, receiverId]
  );
}

export async function getPendingRequests(userId) {
  const result = await query(
    `SELECT cr.id, cr.created_at, cr.status,
            u.id as sender_id, u.name as sender_name, u.username as sender_username
     FROM contact_requests cr
     JOIN users u ON u.id = cr.sender_id
     WHERE cr.receiver_id = $1 AND cr.status = 'pending'
     ORDER BY cr.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getSentRequests(userId) {
  const result = await query(
    `SELECT cr.id, cr.status, cr.created_at,
            u.id as receiver_id, u.name as receiver_name, u.username as receiver_username
     FROM contact_requests cr
     JOIN users u ON u.id = cr.receiver_id
     WHERE cr.sender_id = $1
     ORDER BY cr.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getContactsForUser(userId) {
  const result = await query(
    `SELECT
       c.id,
       c.conversation_id,
       u.id as contact_id,
       u.name,
       u.username,
       u.mood,
       u.mood_updated_at,
       (
         SELECT m.content FROM messages m
         WHERE m.conversation_id = c.conversation_id
         ORDER BY m.created_at DESC LIMIT 1
       ) as last_message,
       (
         SELECT m.created_at FROM messages m
         WHERE m.conversation_id = c.conversation_id
         ORDER BY m.created_at DESC LIMIT 1
       ) as last_message_time,
       (
         SELECT COUNT(*) FROM messages m
         WHERE m.conversation_id = c.conversation_id
         AND m.sender_id != $1
         AND m.created_at > COALESCE(
           (SELECT last_read_at FROM conversation_reads
            WHERE user_id = $1 AND conversation_id = c.conversation_id),
           '1970-01-01'
         )
       )::int as unread_count
     FROM contacts c
     JOIN users u ON u.id = c.contact_id
     WHERE c.user_id = $1
     ORDER BY last_message_time DESC NULLS LAST`,
    [userId]
  );

  const contacts = result.rows;
  await Promise.all(contacts.map(async c => {
    c.streak = await getStreakForConversation(c.conversation_id, userId, c.contact_id);
  }));

  return contacts;
}

export async function markConversationRead(userId, conversationId) {
  await query(
    `INSERT INTO conversation_reads (user_id, conversation_id, last_read_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id, conversation_id)
     DO UPDATE SET last_read_at = now()`,
    [userId, conversationId]
  );
}