import { saveMessage } from "../models/Message.js";
import { getIO } from "../services/socketBus.js";

export async function uploadVoice(req, res) {
  const { conversationId, duration, waveform } = req.body;
  const senderId = req.user.id;

  if (!req.file) return res.status(400).json({ error: "No audio file" });
  if (!conversationId) return res.status(400).json({ error: "conversationId required" });

  let parsedWaveform = null;
  try {
    parsedWaveform = waveform ? JSON.parse(waveform) : null;
  } catch {
    parsedWaveform = null;
  }

  const audioUrl = `/uploads/voice/${req.file.filename}`;
  const audioDuration = Math.round(Number(duration) || 0);

  const message = await saveMessage({
    senderId,
    conversationId,
    content: "",
    type: "voice",
    audioUrl,
    audioDuration,
    waveform: parsedWaveform,
  });

  const io = getIO();
  if (io) {
    io.to(String(conversationId)).emit("message:new", {
      ...message,
      conversation_id: Number(conversationId),
      reactions: [],
    });
  }

  res.json({ message });
}
