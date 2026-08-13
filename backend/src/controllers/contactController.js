import {
  searchUsers,
  sendContactRequest,
  acceptContactRequest,
  rejectContactRequest,
  getPendingRequests,
  getSentRequests,
  getContactsForUser,
  markConversationRead,
} from "../models/Contact.js";

export async function search(req, res) {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ users: [] });
  const users = await searchUsers(q, req.user.id);
  res.json({ users });
}

export async function sendRequest(req, res) {
  const { receiverId } = req.body;
  if (!receiverId) return res.status(400).json({ error: "receiverId required" });
  if (receiverId === req.user.id) return res.status(400).json({ error: "Cannot add yourself" });
  try {
    const request = await sendContactRequest(req.user.id, receiverId);
    res.status(201).json({ request });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function acceptRequest(req, res) {
  const { requestId } = req.params;
  try {
    const result = await acceptContactRequest(requestId, req.user.id);
    res.json({ message: "Request accepted", ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function rejectRequest(req, res) {
  const { requestId } = req.params;
  await rejectContactRequest(requestId, req.user.id);
  res.json({ message: "Request rejected" });
}

export async function getPending(req, res) {
  const requests = await getPendingRequests(req.user.id);
  res.json({ requests });
}

export async function getSent(req, res) {
  const requests = await getSentRequests(req.user.id);
  res.json({ requests });
}

export async function getContacts(req, res) {
  const contacts = await getContactsForUser(req.user.id);
  res.json({ contacts });
}

export async function markRead(req, res) {
  const { conversationId } = req.params;
  await markConversationRead(req.user.id, conversationId);
  res.json({ success: true });
}
