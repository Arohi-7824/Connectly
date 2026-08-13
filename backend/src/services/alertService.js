import { createAlert } from "../models/Alert.js";

const RISK_THRESHOLD = 0.7;

export async function maybeCreateAlert({ message, analysis, parentId, childId }) {
  if (!parentId) return null;
  if (analysis.flagged && analysis.risk_score >= RISK_THRESHOLD) {
    const alert = await createAlert({
      messageId: message.id,
      childId: childId ?? message.sender_id,
      parentId,
      riskScore: analysis.risk_score,
      category: analysis.category,
    });
    // TODO: trigger push/email notification via a notificationService
    console.log(`[ALERT] Flagged message ${message.id} -> parent ${parentId}`);
    return alert;
  }
  return null;
}
