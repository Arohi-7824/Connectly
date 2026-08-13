import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  search,
  sendRequest,
  acceptRequest,
  rejectRequest,
  getPending,
  getSent,
  getContacts,
  markRead,
} from "../controllers/contactController.js";

const router = Router();

router.get("/", requireAuth, getContacts);
router.get("/search", requireAuth, search);
router.get("/pending", requireAuth, getPending);
router.get("/sent", requireAuth, getSent);
router.post("/request", requireAuth, sendRequest);
router.post("/accept/:requestId", requireAuth, acceptRequest);
router.post("/reject/:requestId", requireAuth, rejectRequest);
router.post("/read/:conversationId", requireAuth, markRead);

export default router;
