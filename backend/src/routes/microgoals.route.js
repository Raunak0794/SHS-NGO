const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const {
  generateMicroGoals,
  getMicroGoals,
  updateMicroGoal,
  getAllMicroGoals,
  generateWeeklyReview,
  getWeeklyReviews,
} = require("../controllers/microgoals.controller");

// Micro-Goals Routes
router.post("/generate", authMiddleware, generateMicroGoals);
router.get("/goal/:goalId", authMiddleware, getMicroGoals);
router.get("/all", authMiddleware, getAllMicroGoals);
router.put("/:microGoalId", authMiddleware, updateMicroGoal);

// Weekly Review Routes
router.post("/weekly-review/generate", authMiddleware, generateWeeklyReview);
router.get("/weekly-review/all", authMiddleware, getWeeklyReviews);

module.exports = router;
