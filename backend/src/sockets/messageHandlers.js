import { saveMessage, setReaction } from "../models/Message.js";
import { createPoll, vote as votePoll } from "../models/Poll.js";
import { createGoal, checkIn } from "../models/SquadGoal.js";
import { isGroupMember, getOtherGroupMemberIds } from "../models/Group.js";
import { analyzeMessage } from "../services/aiClient.js";
import { maybeCreateAlert } from "../services/alertService.js";
import { getParentIdForChild } from "../models/ParentLink.js";
import { query } from "../config/db.js";

// Resolves who else should be alerted for a flagged message — the other
// person in a 1:1 chat, or every other member in a group. Groups have no
// rows in `contacts` (that table is strictly for 1:1 pairs), so this must
// check is_group first or a flagged group message would silently never
// alert anyone.
async function getOtherParticipantIds(conversationId, senderId) {
  const conv = await query(`SELECT is_group FROM conversations WHERE id = $1`, [conversationId]);
  if (conv.rows[0]?.is_group) {
    return getOtherGroupMemberIds(conversationId, senderId);
  }
  const result = await query(
    `SELECT user_id FROM contacts WHERE conversation_id = $1 AND user_id != $2 LIMIT 1`,
    [conversationId, senderId]
  );
  return result.rows[0] ? [result.rows[0].user_id] : [];
}

export function registerMessageHandlers(io, socket) {
  socket.on("message:send", async ({ conversationId, content }) => {
    const senderId = socket.user.id;
    console.log(`[MSG] sender=${senderId} conversation=${conversationId} content="${content}"`);

    // 1. Fetch last 5 messages from this sender BEFORE saving the new one,
    //    so the current message doesn't end up duplicated into its own
    //    trajectory window.
    const historyResult = await query(
      `SELECT content FROM messages
       WHERE conversation_id = $1 AND sender_id = $2
       ORDER BY created_at DESC LIMIT 5`,
      [conversationId, senderId]
    );
    const history = historyResult.rows.map(r => r.content).reverse();

    // 2. Save message
    const message = await saveMessage({ senderId, conversationId, content });

    // 3. Emit to room
    io.to(conversationId).emit("message:new", {
      ...message,
      conversation_id: Number(conversationId),
      reactions: [],
    });

    // 4. Async AI analysis with history
    analyzeMessage({ text: content, history })
      .then(async (analysis) => {
        console.log(`[ANALYSIS] flagged=${analysis.flagged} score=${analysis.risk_score} category=${analysis.category}`);
        if (analysis.flagged) {
          const receiverIds = await getOtherParticipantIds(conversationId, senderId);
          console.log(`[RECEIVERS] receiverIds=${receiverIds.join(",")}`);

          // Alert every OTHER participant's parent, not the sender's —
          // in a group, that's everyone who saw the message, each of
          // whom may have their own linked parent.
          for (const receiverId of receiverIds) {
            const parentId = await getParentIdForChild(receiverId);
            console.log(`[PARENT] receiverId=${receiverId} parentId=${parentId}`);

            const alert = await maybeCreateAlert({
              message,
              analysis,
              parentId,
              childId: receiverId,
            });
            console.log(`[ALERT CREATED]`, alert);
          }
        }
      })
      .catch((err) => console.error("[PIPELINE ERROR]", err));
  });

  socket.on("conversation:join", (conversationId) => {
    console.log(`[JOIN] user=${socket.user.id} conversation=${conversationId}`);
    socket.join(conversationId);
  });

  socket.on("reaction:set", async ({ conversationId, messageId, emoji }) => {
    try {
      const reactions = await setReaction({ messageId, userId: socket.user.id, emoji });
      io.to(conversationId).emit("reaction:update", {
        conversationId: Number(conversationId),
        messageId: Number(messageId),
        reactions,
      });
    } catch (err) {
      console.error("[REACTION ERROR]", err);
    }
  });

  socket.on("poll:create", async ({ conversationId, question, options }) => {
    try {
      const senderId = socket.user.id;
      const cleanOptions = (options || []).map(o => o.trim()).filter(Boolean).slice(0, 6);
      if (!question?.trim() || cleanOptions.length < 2) return;

      const message = await saveMessage({
        senderId, conversationId, content: question.trim(), type: "poll",
      });
      const poll = await createPoll({
        messageId: message.id,
        question: question.trim(),
        options: cleanOptions,
      });

      io.to(conversationId).emit("message:new", {
        ...message,
        conversation_id: Number(conversationId),
        reactions: [],
        poll: { ...poll, options: poll.options.map(o => ({ ...o, isMine: false })) },
      });
    } catch (err) {
      console.error("[POLL CREATE ERROR]", err);
    }
  });

  socket.on("poll:vote", async ({ conversationId, pollId, optionId }) => {
    try {
      const userId = socket.user.id;
      const updatedPoll = await votePoll({ pollId, optionId, userId });
      if (!updatedPoll) return;

      io.to(conversationId).emit("poll:update", {
        conversationId: Number(conversationId),
        pollId: updatedPoll.pollId,
        messageId: updatedPoll.messageId,
        options: updatedPoll.options.map(o => ({
          id: o.id, text: o.text, votes: o.votes,
        })),
        voterId: userId,
        voterOptionId: updatedPoll.options.find(o => o.isMine)?.id ?? null,
      });
    } catch (err) {
      console.error("[POLL VOTE ERROR]", err);
    }
  });

  socket.on("goal:create", async ({ conversationId, title }) => {
    try {
      const userId = socket.user.id;
      if (!(await isGroupMember(conversationId, userId))) return;
      if (!title?.trim()) return;

      const goal = await createGoal({ conversationId, title: title.trim(), createdBy: userId });
      io.to(conversationId).emit("goal:created", {
        conversationId: Number(conversationId),
        goal: { ...goal, checkins: [] },
      });
    } catch (err) {
      console.error("[GOAL CREATE ERROR]", err);
    }
  });

  socket.on("goal:checkin", async ({ conversationId, goalId }) => {
    try {
      const userId = socket.user.id;
      if (!(await isGroupMember(conversationId, userId))) return;

      const result = await checkIn(goalId, userId);
      if (!result) return;

      io.to(conversationId).emit("goal:update", {
        conversationId: Number(conversationId),
        goalId: result.goalId,
        completedAt: result.completedAt,
        checkins: result.checkins,
      });
    } catch (err) {
      console.error("[GOAL CHECKIN ERROR]", err);
    }
  });
}
