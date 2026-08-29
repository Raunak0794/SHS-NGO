const express = require("express");
const authMiddleware = require("../middleware/auth");
const chatController = require("../controllers/chat.controller");

const router = express.Router();

// All chat routes require authentication
router.use(authMiddleware);

// Core RAG Chat
router.post("/message", chatController.sendMessage);
router.get("/conversations", chatController.getConversations);
router.post("/conversations", chatController.createConversation);
router.get("/conversations/:id", chatController.getConversation);
router.delete("/conversations/:id", chatController.deleteConversation);

// Saved Messages / Revision bookmarks
router.post("/messages/:id/save", chatController.saveMessage);
router.get("/saved", chatController.getSavedMessages);

// Smart AI Helpers
router.post("/simplify", chatController.simplifyExplanationHandler);
router.post("/homework", chatController.homeworkHelperHandler);
router.post("/check-answer", chatController.checkAnswerHandler);

module.exports = router;
