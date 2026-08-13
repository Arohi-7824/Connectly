import { getAlertsForParent } from "../models/Alert.js";

export async function getAlerts(req, res) {
  const parentId = req.user.id;
  const alerts = await getAlertsForParent(parentId);
  res.json({ alerts });
}
