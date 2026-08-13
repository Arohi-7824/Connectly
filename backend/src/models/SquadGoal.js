import { query } from "../config/db.js";

export async function createGoal({ conversationId, title, createdBy }) {
  const result = await query(
    `INSERT INTO squad_goals (conversation_id, title, created_by)
     VALUES ($1, $2, $3) RETURNING id, conversation_id, title, created_by, created_at, completed_at`,
    [conversationId, title, createdBy]
  );
  return result.rows[0];
}

export async function getGoalsForConversation(conversationId) {
  const goals = await query(
    `SELECT id, conversation_id, title, created_by, created_at, completed_at
     FROM squad_goals WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId]
  );
  if (goals.rows.length === 0) return [];

  const goalIds = goals.rows.map(g => g.id);
  const checkins = await query(
    `SELECT goal_id, user_id, checked_in_at FROM squad_goal_checkins WHERE goal_id = ANY($1)`,
    [goalIds]
  );

  const checkinsByGoal = {};
  for (const c of checkins.rows) {
    if (!checkinsByGoal[c.goal_id]) checkinsByGoal[c.goal_id] = [];
    checkinsByGoal[c.goal_id].push({ userId: c.user_id, checkedInAt: c.checked_in_at });
  }

  return goals.rows.map(g => ({
    ...g,
    checkins: checkinsByGoal[g.id] || [],
  }));
}

// Checks in a member, and marks the goal completed if every current group
// member has now checked in.
export async function checkIn(goalId, userId) {
  await query(
    `INSERT INTO squad_goal_checkins (goal_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (goal_id, user_id) DO NOTHING`,
    [goalId, userId]
  );

  const goal = await query(`SELECT conversation_id, completed_at FROM squad_goals WHERE id = $1`, [goalId]);
  if (!goal.rows[0]) return null;
  const { conversation_id, completed_at } = goal.rows[0];

  if (!completed_at) {
    const memberCount = await query(
      `SELECT COUNT(*)::int as count FROM conversation_members WHERE conversation_id = $1`,
      [conversation_id]
    );
    const checkinCount = await query(
      `SELECT COUNT(DISTINCT user_id)::int as count FROM squad_goal_checkins WHERE goal_id = $1`,
      [goalId]
    );

    if (checkinCount.rows[0].count >= memberCount.rows[0].count) {
      await query(`UPDATE squad_goals SET completed_at = now() WHERE id = $1`, [goalId]);
    }
  }

  const checkins = await query(
    `SELECT user_id, checked_in_at FROM squad_goal_checkins WHERE goal_id = $1`,
    [goalId]
  );
  const updated = await query(`SELECT completed_at FROM squad_goals WHERE id = $1`, [goalId]);

  return {
    goalId,
    conversationId: conversation_id,
    completedAt: updated.rows[0].completed_at,
    checkins: checkins.rows.map(c => ({ userId: c.user_id, checkedInAt: c.checked_in_at })),
  };
}
