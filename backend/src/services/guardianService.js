import { query } from "../config/db.js";

// Guardian links child by email
export async function linkChildByEmail(guardianId, childEmail) {
  // Find child account
  const childResult = await query(
    `SELECT id, name, age, role FROM users WHERE email = $1`,
    [childEmail]
  );

  if (childResult.rows.length === 0) {
    throw new Error("No account found with that email");
  }

  const child = childResult.rows[0];

  // Only link child/minor accounts
  if (child.role !== "child") {
    throw new Error("This account cannot be monitored");
  }

  // Block linking adults (18+)
  if (child.age !== null && child.age >= 18) {
    throw new Error("Cannot monitor accounts for users 18 or older");
  }

  // Check already linked
  const existing = await query(
    `SELECT * FROM guardian_links WHERE guardian_id = $1 AND child_id = $2`,
    [guardianId, child.id]
  );

  if (existing.rows.length > 0) {
    throw new Error("Already linked to this account");
  }

  // Under 13 — auto-link silently (parent created account)
  if (child.age !== null && child.age < 13) {
    await query(
      `INSERT INTO guardian_links (guardian_id, child_id, status)
       VALUES ($1, $2, 'active')`,
      [guardianId, child.id]
    );
    await query(
      `INSERT INTO parent_links (parent_id, child_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [guardianId, child.id]
    );
    return { status: "active", child };
  }

  // 13-17 — link but notify child
  await query(
    `INSERT INTO guardian_links (guardian_id, child_id, status)
     VALUES ($1, $2, 'active')`,
    [guardianId, child.id]
  );
  await query(
    `INSERT INTO parent_links (parent_id, child_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [guardianId, child.id]
  );

  // TODO: send in-app notification to child
  // For now just log it
  console.log(`[GUARDIAN] Linked guardian ${guardianId} to child ${child.id} (age ${child.age})`);

  return { status: "active", child };
}

export async function getLinkedChildren(guardianId) {
  const result = await query(
    `SELECT u.id, u.name, u.username, u.age, u.email, gl.status, gl.created_at
     FROM guardian_links gl
     JOIN users u ON u.id = gl.child_id
     WHERE gl.guardian_id = $1`,
    [guardianId]
  );
  return result.rows;
}
