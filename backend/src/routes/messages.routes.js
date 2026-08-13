import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getHistory,
  scheduleMessage,
  listScheduledMessages,
  cancelScheduled,
} from "../controllers/messageController.js";
import { uploadVoice } from "../controllers/voiceController.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "../../uploads/voice");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".webm";
    cb(null, `${req.user.id}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB cap

const router = Router();
router.get("/scheduled", requireAuth, listScheduledMessages);
router.post("/schedule", requireAuth, scheduleMessage);
router.delete("/schedule/:id", requireAuth, cancelScheduled);
router.get("/:conversationId", requireAuth, getHistory);
router.post("/voice", requireAuth, upload.single("audio"), uploadVoice);

export default router;
