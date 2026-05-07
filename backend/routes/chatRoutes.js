import express from "express";
import {
	accessChat,
	addToGroup,
	createGroupChat,
	fetchChats,
	removeFromGroup,
	renameGroup
} from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").post(protect, accessChat).get(protect, fetchChats);
router.post("/group", protect, createGroupChat);
router.put("/rename", protect, renameGroup);
router.put("/groupadd", protect, addToGroup);
router.put("/groupremove", protect, removeFromGroup);

export default router;

