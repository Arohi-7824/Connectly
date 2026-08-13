import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getMe, setMood, setTheme, setLastfmUsername, syncNowPlaying } from "../controllers/userController.js";

const router = Router();
router.get("/me", requireAuth, getMe);
router.patch("/me/mood", requireAuth, setMood);
router.patch("/me/theme", requireAuth, setTheme);
router.patch("/me/lastfm", requireAuth, setLastfmUsername);
router.post("/me/lastfm/sync", requireAuth, syncNowPlaying);

export default router;
