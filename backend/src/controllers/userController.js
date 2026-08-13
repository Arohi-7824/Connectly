import { getUserProfile, updateMood, updateTheme, updateLastfmUsername, updateCurrentTrack } from "../models/User.js";
import { getContactsForUser } from "../models/Contact.js";
import { getIO } from "../services/socketBus.js";
import { getNowPlaying } from "../services/lastfmClient.js";

export async function getMe(req, res) {
  const profile = await getUserProfile(req.user.id);
  if (!profile) return res.status(404).json({ error: "Not found" });
  res.json({ user: profile });
}

const ALLOWED_MOODS = ["😴", "🔥", "📚", "🎮", "💭", "🙂", null];

export async function setMood(req, res) {
  const { mood } = req.body;
  if (mood !== null && mood !== undefined && !ALLOWED_MOODS.includes(mood)) {
    return res.status(400).json({ error: "Invalid mood" });
  }

  const user = await updateMood(req.user.id, mood ?? null);
  await broadcastToContacts(req.user.id, "mood:update", {
    userId: user.id,
    mood: user.mood,
    mood_updated_at: user.mood_updated_at,
  });

  res.json({ user });
}

const ALLOWED_THEMES = ["default", "sunset", "ocean", "mono", "pink"];

export async function setTheme(req, res) {
  const { theme } = req.body;
  if (!ALLOWED_THEMES.includes(theme)) {
    return res.status(400).json({ error: "Invalid theme" });
  }
  const user = await updateTheme(req.user.id, theme);
  res.json({ user });
}

export async function setLastfmUsername(req, res) {
  const { lastfmUsername } = req.body;
  const user = await updateLastfmUsername(req.user.id, lastfmUsername || null);
  res.json({ user });
}

export async function syncNowPlaying(req, res) {
  const profile = await getUserProfile(req.user.id);
  if (!profile?.lastfm_username) {
    return res.json({ current_track: null });
  }

  const track = await getNowPlaying(profile.lastfm_username);
  const user = await updateCurrentTrack(req.user.id, track);

  await broadcastToContacts(req.user.id, "music:update", {
    userId: user.id,
    current_track: user.current_track,
    current_track_updated_at: user.current_track_updated_at,
  });

  res.json({ current_track: user.current_track });
}

// Broadcasts a per-user status change to every conversation room this user
// shares with a contact. All of a user's conversation rooms are already
// joined by both sides (see joinAllRooms on the frontend), so this reaches
// every connected contact.
async function broadcastToContacts(userId, event, payload) {
  const contacts = await getContactsForUser(userId);
  const io = getIO();
  if (!io) return;
  contacts.forEach(c => {
    io.to(String(c.conversation_id)).emit(event, payload);
  });
}
