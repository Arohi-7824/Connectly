import { query } from "../config/db.js";
import crypto from "crypto";

export async function generateInviteCode(childId) {
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  await query(
    `INSERT INTO invite_codes (code, child_id)
     VALUES ($1, $2)
     ON CONFLICT (code) DO NOTHING`,
    [code, childId]
  );
  return code;
}

export async function redeemInviteCode(code, guardianId) {
  // Check code exists, unused, not expired
  const result = await query(
    `SELECT * FROM invite_codes
     WHERE code = $1
     AND used = false
     AND expires_at > now()`,
    [code]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid or expired code");
  }

  const invite = result.rows[0];

  // Link guardian to child
  await query(
    `INSERT INTO parent_links (parent_id, child_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [guardianId, invite.child_id]
  );

  // Mark code as used
  await query(
    `UPDATE invite_codes
     SET used = true, used_by = $1
     WHERE code = $2`,
    [guardianId, code]
  );

  return invite.child_id;
}
