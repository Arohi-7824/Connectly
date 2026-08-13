import {
  createGroup,
  getGroupMembers,
  isGroupAdmin,
  isGroupMember,
  addGroupMember,
  removeGroupMember,
  renameGroup,
  getGroupsForUser,
} from "../models/Group.js";
import { getGoalsForConversation } from "../models/SquadGoal.js";
import { findUserById } from "../models/User.js";
import { getIO } from "../services/socketBus.js";

export async function create(req, res) {
  const { name, memberIds } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Group name required" });
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ error: "At least one other member required" });
  }

  const group = await createGroup({ name: name.trim(), creatorId: req.user.id, memberIds });
  const members = await getGroupMembers(group.conversationId);

  // Notify each added member in real time so the group shows up in their
  // sidebar without needing a page reload — same pattern as contact:accepted.
  const io = getIO();
  if (io) {
    for (const m of members) {
      if (m.user_id === req.user.id) continue;
      io.to(`user:${m.user_id}`).emit("group:added", {
        conversationId: group.conversationId,
        name: group.name,
      });
    }
  }

  res.status(201).json({ conversationId: group.conversationId, name: group.name, members });
}

export async function list(req, res) {
  const groups = await getGroupsForUser(req.user.id);
  res.json({ groups });
}

export async function members(req, res) {
  const { conversationId } = req.params;
  if (!(await isGroupMember(conversationId, req.user.id))) {
    return res.status(403).json({ error: "Not a member of this group" });
  }
  const list = await getGroupMembers(conversationId);
  res.json({ members: list });
}

export async function addMember(req, res) {
  const { conversationId } = req.params;
  const { userId } = req.body;
  if (!(await isGroupAdmin(conversationId, req.user.id))) {
    return res.status(403).json({ error: "Only admins can add members" });
  }

  await addGroupMember(conversationId, userId);
  const user = await findUserById(userId);
  const io = getIO();
  if (io) {
    io.to(String(conversationId)).emit("group:member_added", {
      conversationId: Number(conversationId), userId, name: user?.name, username: user?.username,
    });
    io.to(`user:${userId}`).emit("group:added", { conversationId: Number(conversationId) });
  }
  res.json({ added: true });
}

export async function removeMember(req, res) {
  const { conversationId, userId } = req.params;
  const requesterIsAdmin = await isGroupAdmin(conversationId, req.user.id);
  const isSelf = Number(userId) === req.user.id;

  // Admins can remove anyone; anyone can remove themselves (leave group).
  if (!requesterIsAdmin && !isSelf) {
    return res.status(403).json({ error: "Only admins can remove other members" });
  }

  await removeGroupMember(conversationId, userId);
  const io = getIO();
  if (io) {
    io.to(String(conversationId)).emit("group:member_removed", {
      conversationId: Number(conversationId), userId: Number(userId),
    });
  }
  res.json({ removed: true });
}

export async function rename(req, res) {
  const { conversationId } = req.params;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Name required" });
  if (!(await isGroupAdmin(conversationId, req.user.id))) {
    return res.status(403).json({ error: "Only admins can rename the group" });
  }

  await renameGroup(conversationId, name.trim());
  const io = getIO();
  if (io) {
    io.to(String(conversationId)).emit("group:renamed", {
      conversationId: Number(conversationId), name: name.trim(),
    });
  }
  res.json({ renamed: true, name: name.trim() });
}

export async function goals(req, res) {
  const { conversationId } = req.params;
  if (!(await isGroupMember(conversationId, req.user.id))) {
    return res.status(403).json({ error: "Not a member of this group" });
  }
  const list = await getGoalsForConversation(conversationId);
  res.json({ goals: list });
}
