import { query } from "../config/db.js";

export async function createGroup({ name, creatorId, memberIds }) {
  const conv = await query(
    `INSERT INTO conversations (is_group, name, created_by) VALUES (true, $1, $2) RETURNING id`,
    [name, creatorId]
  );
  const conversationId = conv.rows[0].id;

  // Creator is always an admin. Other members start as plain members.
  const allMembers = [...new Set([creatorId, ...memberIds])];
  for (const userId of allMembers) {
    const role = userId === creatorId ? "admin" : "member";
    await query(
      `INSERT INTO conversation_members (conversation_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (conversation_id, user_id) DO NOTHING`,
      [conversationId, userId, role]
    );
  }

  return { conversationId, name };
}

export async function getGroupMembers(conversationId) {
  const result = await query(
    `SELECT cm.user_id, cm.role, cm.joined_at, u.name, u.username
     FROM conversation_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.conversation_id = $1
     ORDER BY cm.role = 'admin' DESC, cm.joined_at ASC`,
    [conversationId]
  );
  return result.rows;
}

export async function isGroupAdmin(conversationId, userId) {
  const result = await query(
    `SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2 AND role = 'admin'`,
    [conversationId, userId]
  );
  return result.rows.length > 0;
}

export async function isGroupMember(conversationId, userId) {
  const result = await query(
    `SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
  return result.rows.length > 0;
}

export async function addGroupMember(conversationId, userId) {
  await query(
    `INSERT INTO conversation_members (conversation_id, user_id, role)
     VALUES ($1, $2, 'member')
     ON CONFLICT (conversation_id, user_id) DO NOTHING`,
    [conversationId, userId]
  );
}

export async function removeGroupMember(conversationId, userId) {
  await query(
    `DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
}

export async function renameGroup(conversationId, name) {
  await query(`UPDATE conversations SET name = $2 WHERE id = $1`, [conversationId, name]);
}

export async function getGroupsForUser(userId) {
  const result = await query(
    `SELECT
       c.id as conversation_id,
       c.name,
       c.created_by,
       (
         SELECT COUNT(*) FROM conversation_members cm2 WHERE cm2.conversation_id = c.id
       )::int as member_count,
       (
         SELECT m.content FROM messages m
         WHERE m.conversation_id = c.id
         ORDER BY m.created_at DESC LIMIT 1
       ) as last_message,
       (
         SELECT m.created_at FROM messages m
         WHERE m.conversation_id = c.id
         ORDER BY m.created_at DESC LIMIT 1
       ) as last_message_time,
       (
         SELECT COUNT(*) FROM messages m
         WHERE m.conversation_id = c.id
         AND m.sender_id != $1
         AND m.created_at > COALESCE(
           (SELECT last_read_at FROM conversation_reads
            WHERE user_id = $1 AND conversation_id = c.id),
           '1970-01-01'
         )
       )::int as unread_count
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id
     WHERE cm.user_id = $1 AND c.is_group = true
     ORDER BY last_message_time DESC NULLS LAST`,
    [userId]
  );
  return result.rows;
}

export async function getOtherGroupMemberIds(conversationId, excludeUserId) {
  const result = await query(
    `SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id != $2`,
    [conversationId, excludeUserId]
  );
  return result.rows.map(r => r.user_id);
}
