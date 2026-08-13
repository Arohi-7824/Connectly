import { linkChildByEmail, getLinkedChildren } from "../services/guardianService.js";
import { getAlertsForParent } from "../models/Alert.js";

export async function linkChild(req, res) {
  const guardianId = req.user.id;
  const { childEmail } = req.body;

  if (!childEmail) {
    return res.status(400).json({ error: "Child email is required" });
  }

  try {
    const result = await linkChildByEmail(guardianId, childEmail);
    res.json({
      message: `Successfully linked to ${result.child.name}'s account`,
      child: result.child,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getChildren(req, res) {
  const guardianId = req.user.id;
  const children = await getLinkedChildren(guardianId);
  res.json({ children });
}

export async function getAlerts(req, res) {
  const parentId = req.user.id;
  const alerts = await getAlertsForParent(parentId);
  res.json({ alerts });
}
