const express = require("express");
const authMiddleware = require("../middleware/auth"); // Add this
const Goal = require("../models/Goal");

const router = express.Router();

const ALLOWED_CATEGORIES = new Set([
  "programming",
  "languages",
  "soft-skills",
  "design",
  "other",
]);
const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

// Apply auth middleware to all dashboard routes
router.use(authMiddleware);

// Get dashboard data for authenticated user
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware

    let goals = await Goal.find({ userId }).sort({ createdAt: -1 });

    // Only create sample goals if user has none
    if (goals.length === 0) {
      const sampleGoals = [
        { title: "Revise React Hooks", userId, category: "programming" },
        { title: "Build Login API", userId, category: "programming" },
        { title: "Practice MongoDB Queries", userId, category: "programming" }
      ];
      goals = await Goal.insertMany(sampleGoals);
      goals.reverse();
    }

    const completed = goals.filter(g => g.completed).length;
    const progress = goals.length ? Math.round((completed / goals.length) * 100) : 0;

    res.json({
      nextGoal: goals.find(g => !g.completed) || null,
      weeklyProgress: progress,
      completedCount: completed,
      totalGoals: goals.length,
      badges: progress >= 100 ? ["Consistency Star", "Goal Crusher"] : ["Getting Started"]
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

// Create a custom main goal for the authenticated user
router.post("/goals", async (req, res) => {
  try {
    const userId = req.user.id;
    const body = req.body || {};
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const category = ALLOWED_CATEGORIES.has(body.category)
      ? body.category
      : "other";
    const priority = ALLOWED_PRIORITIES.has(body.priority)
      ? body.priority
      : "medium";

    if (title.length < 3 || title.length > 120) {
      return res.status(400).json({
        error: "Goal title must be between 3 and 120 characters",
      });
    }

    if (description.length > 1000) {
      return res.status(400).json({
        error: "Goal description must be 1000 characters or fewer",
      });
    }

    let dueDate;
    if (body.dueDate) {
      dueDate = new Date(body.dueDate);
      if (Number.isNaN(dueDate.getTime())) {
        return res.status(400).json({ error: "Due date is invalid" });
      }
    }

    const goal = await Goal.create({
      userId,
      title,
      description: description || "Continue your learning journey",
      category,
      priority,
      ...(dueDate ? { dueDate } : {}),
    });

    return res.status(201).json({
      message: "Goal created successfully",
      goal,
    });
  } catch (error) {
    console.error("Create goal error:", error);
    return res.status(500).json({ error: "Failed to create goal" });
  }
});

// Mark a goal as complete
router.post("/goals/:id/complete", async (req, res) => {
  try {
    const userId = req.user.id;
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId },
      { completed: true },
      { returnDocument: "after" }
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
