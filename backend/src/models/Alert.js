import { query } from "../config/db.js";

export async function createAlert({ messageId, childId, parentId, riskScore, category }) {
  const result = await query(
    `INSERT INTO alerts (message_id, child_id, parent_id, risk_score, category, status)
     VALUES ($1, $2, $3, $4, $5, 'unreviewed')
     RETURNING *`,
    [messageId, childId, parentId, riskScore, category]
  );
  return result.rows[0];
}

export async function getAlertsForParent(parentId) {
  const result = await query(
    `SELECT a.*, m.content, m.created_at as message_time
     FROM alerts a
     JOIN messages m ON a.message_id = m.id
     WHERE a.parent_id = $1
     ORDER BY a.created_at DESC`,
    [parentId]
  );
  return result.rows;
}
