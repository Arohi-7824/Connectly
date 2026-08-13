import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { create, list, members, addMember, removeMember, rename, goals } from "../controllers/groupController.js";

const router = Router();
router.post("/", requireAuth, create);
router.get("/", requireAuth, list);
router.get("/:conversationId/members", requireAuth, members);
router.post("/:conversationId/members", requireAuth, addMember);
router.delete("/:conversationId/members/:userId", requireAuth, removeMember);
router.patch("/:conversationId", requireAuth, rename);
router.get("/:conversationId/goals", requireAuth, goals);

export default router;
