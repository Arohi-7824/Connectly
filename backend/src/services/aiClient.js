import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export async function analyzeMessage({ text, language = "auto", senderAge = null, history = [] }) {
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/analyze`, {
      text,
      language,
      sender_age: senderAge,
      last_n_messages: history,
    });
    return data; // { risk_score, category, flagged, explanation }
  } catch (err) {
    console.error("AI service error:", err.message);
    // Fail safe: don't block messaging if the AI service is down,
    // but mark as unscored so it can be retried/audited later.
    return { risk_score: 0, category: "unscored", flagged: false, explanation: "ai_service_unavailable" };
  }
}
