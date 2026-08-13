import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getAlerts } from "../controllers/parentController.js";

const router = Router();
router.get("/alerts", requireAuth, getAlerts);

export default router;
