import { query } from "../config/db.js";

export async function getParentIdForChild(childId) {
  const result = await query(
    `SELECT parent_id FROM parent_links WHERE child_id = $1`,
    [childId]
  );
  return result.rows[0]?.parent_id || null;
}
