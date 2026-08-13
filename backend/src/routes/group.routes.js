import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { createGroup, getGroups, getGroupMembers } from "../controllers/groupController.js";

const router = Router();

router.post("/", requireAuth, createGroup);
router.get("/", requireAuth, getGroups);
router.get("/:conversationId/members", requireAuth, getGroupMembers);

export default router;