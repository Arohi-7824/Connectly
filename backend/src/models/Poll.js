import { query } from "../config/db.js";

export async function createPoll({ messageId, question, options }) {
  const pollResult = await query(
    `INSERT INTO polls (message_id, question) VALUES ($1, $2) RETURNING id`,
    [messageId, question]
  );
  const pollId = pollResult.rows[0].id;

  const optionRows = [];
  for (let i = 0; i < options.length; i++) {
    const r = await query(
      `INSERT INTO poll_options (poll_id, option_text, position)
       VALUES ($1, $2, $3) RETURNING id, option_text, position`,
      [pollId, options[i], i]
    );
    optionRows.push(r.rows[0]);
  }

  return { pollId, question, options: optionRows.map(o => ({ id: o.id, text: o.option_text, votes: 0 })) };
}

// Casts/changes/removes a vote. Voting the same option again removes it.
export async function vote({ pollId, optionId, userId }) {
  const existing = await query(
    `SELECT option_id FROM poll_votes WHERE poll_id = $1 AND user_id = $2`,
    [pollId, userId]
  );

  if (existing.rows.length > 0 && existing.rows[0].option_id === optionId) {
    await query(`DELETE FROM poll_votes WHERE poll_id = $1 AND user_id = $2`, [pollId, userId]);
  } else {
    await query(
      `INSERT INTO poll_votes (poll_id, option_id, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (poll_id, user_id)
       DO UPDATE SET option_id = $2, created_at = now()`,
      [pollId, optionId, userId]
    );
  }

  return getPollById(pollId, userId);
}

export async function getPollById(pollId, userId) {
  const poll = await query(`SELECT id, message_id, question FROM polls WHERE id = $1`, [pollId]);
  if (poll.rows.length === 0) return null;

  const options = await query(
    `SELECT po.id, po.option_text, po.position,
            COUNT(pv.id)::int AS votes,
            BOOL_OR(pv.user_id = $2) AS is_mine
     FROM poll_options po
     LEFT JOIN poll_votes pv ON pv.option_id = po.id
     WHERE po.poll_id = $1
     GROUP BY po.id
     ORDER BY po.position`,
    [pollId, userId]
  );

  return {
    pollId: poll.rows[0].id,
    messageId: poll.rows[0].message_id,
    question: poll.rows[0].question,
    options: options.rows.map(o => ({
      id: o.id, text: o.option_text, votes: o.votes, isMine: o.is_mine,
    })),
  };
}

// Batch-fetch poll data for a set of poll-type messages (for loading history)
export async function getPollsForMessages(messageIds, userId) {
  if (messageIds.length === 0) return {};

  const polls = await query(
    `SELECT id, message_id, question FROM polls WHERE message_id = ANY($1)`,
    [messageIds]
  );
  if (polls.rows.length === 0) return {};

  const pollIds = polls.rows.map(p => p.id);
  const options = await query(
    `SELECT po.id, po.poll_id, po.option_text, po.position,
            COUNT(pv.id)::int AS votes,
            BOOL_OR(pv.user_id = $2) AS is_mine
     FROM poll_options po
     LEFT JOIN poll_votes pv ON pv.option_id = po.id
     WHERE po.poll_id = ANY($1)
     GROUP BY po.id
     ORDER BY po.position`,
    [pollIds, userId]
  );

  const optionsByPoll = {};
  for (const o of options.rows) {
    if (!optionsByPoll[o.poll_id]) optionsByPoll[o.poll_id] = [];
    optionsByPoll[o.poll_id].push({ id: o.id, text: o.option_text, votes: o.votes, isMine: o.is_mine });
  }

  const byMessageId = {};
  for (const p of polls.rows) {
    byMessageId[p.message_id] = {
      pollId: p.id,
      messageId: p.message_id,
      question: p.question,
      options: optionsByPoll[p.id] || [],
    };
  }
  return byMessageId;
}
