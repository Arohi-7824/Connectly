import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { linkChild, getChildren, getAlerts } from "../controllers/guardianController.js";

const router = Router();
router.post("/link", requireAuth, linkChild);
router.get("/children", requireAuth, getChildren);
router.get("/alerts", requireAuth, getAlerts);

export default router;
