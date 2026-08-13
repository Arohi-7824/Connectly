import { getMessagesByConversation, getReactionsForConversation } from "../models/Message.js";
import { getPollsForMessages } from "../models/Poll.js";

export async function getHistory(req, res) {
  const { conversationId } = req.params;
  const userId = req.user.id;
  const messages = await getMessagesByConversation(conversationId);
  const reactionsByMessage = await getReactionsForConversation(conversationId);

  const pollMessageIds = messages.filter(m => m.type === "poll").map(m => m.id);
  const pollsByMessage = await getPollsForMessages(pollMessageIds, userId);

  const enriched = messages.map(m => ({
    ...m,
    reactions: reactionsByMessage[m.id] || [],
    poll: m.type === "poll" ? pollsByMessage[m.id] : undefined,
  }));

  res.json({ messages: enriched });
}


import {
  createScheduledMessage,
  getScheduledMessages,
  cancelScheduledMessage,
} from "../models/Message.js";
import { query } from "../config/db.js";

async function userCanAccessConversation(userId, conversationId) {
  const result = await query(
    `SELECT 1
     FROM conversations c
     WHERE c.id = $2
       AND (
         (
           c.is_group = false
           AND EXISTS (
             SELECT 1
             FROM contacts ct
             WHERE ct.conversation_id = c.id
               AND ct.user_id = $1
           )
         )
         OR
         (
           c.is_group = true
           AND EXISTS (
             SELECT 1
             FROM conversation_members cm
             WHERE cm.conversation_id = c.id
               AND cm.user_id = $1
           )
         )
       )
     LIMIT 1`,
    [userId, conversationId]
  );
  return result.rows.length > 0;
}

export async function scheduleMessage(req, res) {
  try {
    const senderId = req.user.id;
    const { conversationId, content, scheduledFor } = req.body;

    const conversationIdNum = Number(conversationId);
    if (!Number.isInteger(conversationIdNum) || conversationIdNum <= 0) {
      return res.status(400).json({ error: "Invalid conversationId" });
    }

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Message content is required" });
    }

    if (content.trim().length > 5000) {
      return res.status(400).json({ error: "Message is too long" });
    }

    const date = new Date(scheduledFor);
    if (!scheduledFor || Number.isNaN(date.getTime())) {
      return res.status(400).json({ error: "Invalid scheduledFor date" });
    }

    if (date.getTime() <= Date.now()) {
      return res.status(400).json({ error: "Scheduled time must be in the future" });
    }

    if (date.getTime() > Date.now() + 366 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: "Scheduled time cannot be more than one year away" });
    }

    if (!(await userCanAccessConversation(senderId, conversationIdNum))) {
      return res.status(403).json({ error: "You are not a member of this conversation" });
    }

    const scheduled = await createScheduledMessage({
      senderId,
      conversationId: conversationIdNum,
      content: content.trim(),
      scheduledFor: date.toISOString(),
    });

    return res.status(201).json({ scheduledMessage: scheduled });
  } catch (err) {
    console.error("[SCHEDULE CREATE ERROR]", err);
    return res.status(500).json({ error: "Could not schedule message" });
  }
}

export async function listScheduledMessages(req, res) {
  try {
    const conversationId =
      req.query.conversationId === undefined
        ? null
        : Number(req.query.conversationId);

    if (conversationId !== null && (!Number.isInteger(conversationId) || conversationId <= 0)) {
      return res.status(400).json({ error: "Invalid conversationId" });
    }

    const messages = await getScheduledMessages({
      senderId: req.user.id,
      conversationId,
    });

    return res.json({ scheduledMessages: messages });
  } catch (err) {
    console.error("[SCHEDULE LIST ERROR]", err);
    return res.status(500).json({ error: "Could not load scheduled messages" });
  }
}

export async function cancelScheduled(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid scheduled message id" });
    }

    const cancelled = await cancelScheduledMessage({
      id,
      senderId: req.user.id,
    });

    if (!cancelled) {
      return res.status(404).json({
        error: "Scheduled message not found or already processed",
      });
    }

    return res.json({ scheduledMessage: cancelled });
  } catch (err) {
    console.error("[SCHEDULE CANCEL ERROR]", err);
    return res.status(500).json({ error: "Could not cancel scheduled message" });
  }
}
