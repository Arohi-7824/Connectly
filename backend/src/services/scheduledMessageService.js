import { pool, query } from "../config/db.js";
import { getIO } from "./socketBus.js";
import { analyzeMessage } from "./aiClient.js";
import { maybeCreateAlert } from "./alertService.js";
import { getParentIdForChild } from "../models/ParentLink.js";
import { getOtherGroupMemberIds } from "../models/Group.js";

const BATCH_SIZE = 20;
const POLL_MS = 1000;

let workerStarted = false;

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS scheduled_messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      scheduled_for TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'sent', 'cancelled', 'failed')),
      message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      sent_at TIMESTAMPTZ,
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_scheduled_messages_due
      ON scheduled_messages (scheduled_for)
      WHERE status = 'pending';

    CREATE INDEX IF NOT EXISTS idx_scheduled_messages_sender
      ON scheduled_messages (sender_id, status, scheduled_for);
  `);
}

async function claimDueMessages() {
  // Recover jobs left in processing if the backend was restarted/crashed.
  await query(`
    UPDATE scheduled_messages
    SET status = 'pending'
    WHERE status = 'processing'
      AND scheduled_for <= now()
      AND created_at < now() - interval '5 minutes'
  `);

  const result = await query(
    `UPDATE scheduled_messages
     SET status = 'processing'
     WHERE id IN (
       SELECT id
       FROM scheduled_messages
       WHERE status = 'pending'
         AND scheduled_for <= now()
       ORDER BY scheduled_for ASC
       FOR UPDATE SKIP LOCKED
       LIMIT $1
     )
     RETURNING id, sender_id, conversation_id, content, scheduled_for`,
    [BATCH_SIZE]
  );

  return result.rows;
}

async function deliverScheduledMessage(job) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const inserted = await client.query(
      `INSERT INTO messages
         (sender_id, conversation_id, content, type)
       VALUES ($1, $2, $3, 'text')
       RETURNING id, sender_id, conversation_id, content, type,
                 audio_url, audio_duration, waveform, created_at`,
      [job.sender_id, job.conversation_id, job.content]
    );

    const message = inserted.rows[0];

    const updated = await client.query(
      `UPDATE scheduled_messages
       SET status = 'sent',
           message_id = $2,
           sent_at = now(),
           error = NULL
       WHERE id = $1
         AND status = 'processing'
       RETURNING id`,
      [job.id, message.id]
    );

    if (updated.rows.length === 0) {
      // Should not normally happen, but don't leave an orphan message.
      await client.query("ROLLBACK");
      return;
    }

    await client.query("COMMIT");

    const io = getIO();
    if (io) {
      io.to(String(job.conversation_id)).emit("message:new", {
        ...message,
        conversation_id: Number(job.conversation_id),
        reactions: [],
      });
    }

    // Keep scheduled messages on the same AI safety pipeline as normal
    // messages. Failure here must never undo successful delivery.
    runSafetyAnalysis(message).catch(err => {
      console.error("[SCHEDULE AI PIPELINE ERROR]", err);
    });

    console.log(
      `[SCHEDULED] delivered id=${job.id} message=${message.id} conversation=${job.conversation_id}`
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    await query(
      `UPDATE scheduled_messages
       SET status = 'failed', error = $2
       WHERE id = $1 AND status = 'processing'`,
      [job.id, String(err?.message || err).slice(0, 1000)]
    ).catch(updateErr => {
      console.error("[SCHEDULE STATUS ERROR]", updateErr);
    });

    console.error(`[SCHEDULED] failed id=${job.id}`, err);
  } finally {
    client.release();
  }
}

async function getOtherParticipantIds(conversationId, senderId) {
  const conv = await query(
    `SELECT is_group FROM conversations WHERE id = $1`,
    [conversationId]
  );

  if (conv.rows[0]?.is_group) {
    return getOtherGroupMemberIds(conversationId, senderId);
  }

  const result = await query(
    `SELECT user_id
     FROM contacts
     WHERE conversation_id = $1
       AND user_id != $2
     LIMIT 1`,
    [conversationId, senderId]
  );

  return result.rows[0] ? [result.rows[0].user_id] : [];
}

async function runSafetyAnalysis(message) {
  try {
    const analysis = await analyzeMessage({
      text: message.content,
      history: [],
    });

    if (!analysis?.flagged) return;

    const receiverIds = await getOtherParticipantIds(
      message.conversation_id,
      message.sender_id
    );

    for (const receiverId of receiverIds) {
      const parentId = await getParentIdForChild(receiverId);

      await maybeCreateAlert({
        message,
        analysis,
        parentId,
        childId: receiverId,
      });
    }
  } catch (err) {
    console.error("[SCHEDULE ANALYSIS ERROR]", err);
  }
}

async function tick() {
  const jobs = await claimDueMessages();
  if (jobs.length === 0) return;

  // Process in parallel, but the database claim guarantees each job is
  // owned by only one worker instance.
  await Promise.allSettled(jobs.map(deliverScheduledMessage));
}

async function start() {
  try {
    await ensureTable();
    console.log("[SCHEDULED] worker ready");
  } catch (err) {
    console.error("[SCHEDULED] database initialization failed", err);
    // Do not crash the chat server. The next tick will retry.
  }

  setInterval(async () => {
    try {
      await tick();
    } catch (err) {
      console.error("[SCHEDULED] worker tick failed", err);
    }
  }, POLL_MS);
}

export function startScheduledMessageWorker() {
  if (workerStarted) return;
  workerStarted = true;
  start();
}
