import express from "express";
import { accessAiChat, sendAiMessage } from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/chat", protect, accessAiChat);
router.post("/", protect, sendAiMessage);

export default router;
