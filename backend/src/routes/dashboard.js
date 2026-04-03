const express = require("express");
const authMiddleware = require("../middleware/auth"); // Add this
const Goal = require("../models/Goal");

const router = express.Router();

// Apply auth middleware to all dashboard routes
router.use(authMiddleware);

// Get dashboard data for authenticated user
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware

    let goals = await Goal.find({ userId });

    // Only create sample goals if user has none
    if (goals.length === 0) {
      const sampleGoals = [
        { title: "Revise React Hooks", userId, category: "programming" },
        { title: "Build Login API", userId, category: "programming" },
        { title: "Practice MongoDB Queries", userId, category: "programming" }
      ];
      goals = await Goal.insertMany(sampleGoals);
    }

    const completed = goals.filter(g => g.completed).length;
    const progress = goals.length ? Math.round((completed / goals.length) * 100) : 0;

    res.json({
      nextGoal: goals.find(g => !g.completed) || null,
      weeklyProgress: progress,
      badges: progress >= 100 ? ["Consistency Star", "Goal Crusher"] : ["Getting Started"]
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

// Mark a goal as complete
router.post("/goals/:id/complete", async (req, res) => {
  try {
    const userId = req.user.id;
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId },
      { completed: true },
      { new: true }
    );

    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    res.json({ success: true, goal });
  } catch (error) {
    console.error("Error completing goal:", error);
    res.status(500).json({ error: "Failed to update goal" });
  }
});

module.exports = router;