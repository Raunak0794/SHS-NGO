const MicroGoal = require("../models/MicroGoal");
const Goal = require("../models/Goal");
const WeeklyReview = require("../models/WeeklyReview");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ============ GENERATE MICRO-GOALS FROM MAIN GOAL ============ */
const generateMicroGoals = async (req, res) => {
  try {
    const { goalId, numMicroGoals = 5 } = req.body;
    const userId = req.user?.id;

    if (!goalId) {
      return res.status(400).json({ error: "goalId is required" });
    }

    // Fetch the main goal
    const mainGoal = await Goal.findOne({ _id: goalId, userId });
    if (!mainGoal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    // Generate micro-goals using Gemini
    const microGoals = await generateMicroGoalsAI(mainGoal, numMicroGoals);

    if (!microGoals.length) {
      return res.status(500).json({ error: "Failed to generate micro-goals" });
    }

    // Save micro-goals to database
    const savedMicroGoals = await MicroGoal.insertMany(
      microGoals.map((mg) => ({
        ...mg,
        userId,
        parentGoalId: goalId,
      }))
    );

    // Optional: Update main goal with micro-goal references (if field exists)
    // If your Goal schema doesn't have 'microGoals' field, skip or add it.
    // For now, we'll skip to avoid error. Uncomment if schema includes it.
    /*
    await Goal.findByIdAndUpdate(goalId, {
      $set: {
        microGoals: savedMicroGoals.map((mg) => mg._id),
      },
    });
    */

    res.json({
      success: true,
      message: `Generated ${savedMicroGoals.length} micro-goals`,
      microGoals: savedMicroGoals,
    });
  } catch (error) {
    console.error("Error generating micro-goals:", error);
    res.status(500).json({ error: "Failed to generate micro-goals" });
  }
};

/* ============ GET MICRO-GOALS FOR A GOAL ============ */
const getMicroGoals = async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user?.id;

    if (!goalId) {
      return res.status(400).json({ error: "goalId is required" });
    }

    const microGoals = await MicroGoal.find({
      userId,
      parentGoalId: goalId,
    }).sort({ priority: -1, deadline: 1 });

    res.json({
      success: true,
      microGoals,
    });
  } catch (error) {
    console.error("Error fetching micro-goals:", error);
    res.status(500).json({ error: "Failed to fetch micro-goals" });
  }
};

/* ============ UPDATE MICRO-GOAL STATUS ============ */
const updateMicroGoal = async (req, res) => {
  try {
    const { microGoalId } = req.params;
    const { status, actualHours, feedback, subtasks } = req.body;
    const userId = req.user?.id;

    if (!microGoalId) {
      return res.status(400).json({ error: "microGoalId is required" });
    }

    const microGoal = await MicroGoal.findOne({
      _id: microGoalId,
      userId,
    });

    if (!microGoal) {
      return res.status(404).json({ error: "Micro-goal not found" });
    }

    // Update fields
    if (status) microGoal.status = status;
    if (actualHours) microGoal.actualHours = actualHours;
    if (feedback) microGoal.feedback = feedback;
    if (subtasks) microGoal.subtasks = subtasks;

    // If completed, mark completion time
    if (status === "completed" && !microGoal.completedAt) {
      microGoal.completedAt = new Date();
    }

    await microGoal.save();

    // Update parent goal progress
    await updateParentGoalProgress(microGoal.parentGoalId, userId);

    res.json({
      success: true,
      message: "Micro-goal updated successfully",
      microGoal,
    });
  } catch (error) {
    console.error("Error updating micro-goal:", error);
    res.status(500).json({ error: "Failed to update micro-goal" });
  }
};

/* ============ GET ALL MICRO-GOALS FOR USER ============ */
const getAllMicroGoals = async (req, res) => {
  try {
    const userId = req.user?.id;

    const microGoals = await MicroGoal.find({ userId })
      .populate("parentGoalId", "title")
      .sort({ deadline: 1 });

    const stats = {
      total: microGoals.length,
      completed: microGoals.filter((mg) => mg.status === "completed").length,
      inProgress: microGoals.filter((mg) => mg.status === "in-progress").length,
      pending: microGoals.filter((mg) => mg.status === "pending").length,
      completionRate: microGoals.length
        ? Math.round(
            (microGoals.filter((mg) => mg.status === "completed").length /
              microGoals.length) *
              100
          )
        : 0,
    };

    res.json({
      success: true,
      stats,
      microGoals,
    });
  } catch (error) {
    console.error("Error fetching all micro-goals:", error);
    res.status(500).json({ error: "Failed to fetch micro-goals" });
  }
};

/* ============ GENERATE WEEKLY REVIEW ============ */
const generateWeeklyReview = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { moodRating } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get this week's micro-goals and goals - FIXED date handling
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const completedMicroGoals = await MicroGoal.find({
      userId,
      status: "completed",
      completedAt: { $gte: startOfWeek, $lte: endOfWeek },
    });

    const totalMicroGoals = await MicroGoal.find({
      userId,
      createdAt: { $gte: startOfWeek, $lte: endOfWeek },
    });

    const goals = await Goal.find({ userId });

    // Calculate statistics
    const microGoalsCompleted = completedMicroGoals.length;
    const totalMicroGoalsCount = totalMicroGoals.length || 1;
    const overallProgress = Math.round(
      (microGoalsCompleted / totalMicroGoalsCount) * 100
    );

    const hoursSpent = completedMicroGoals.reduce(
      (sum, mg) => sum + (mg.actualHours || 0),
      0
    );

    // Generate AI summary and recommendations
    const { summary, recommendations, challenges, achievements, nextWeekGoals } =
      await generateWeeklySummaryAI(
        goals,
        completedMicroGoals,
        overallProgress,
        hoursSpent
      );

    // Calculate consistency score
    const consistencyScore = calculateConsistencyScore(
      microGoalsCompleted,
      totalMicroGoalsCount,
      hoursSpent
    );

    // Calculate streak
    const streak = await calculateStreak(userId);

    // Create weekly review
    const weeklyReview = new WeeklyReview({
      userId,
      week: {
        startDate: startOfWeek,
        endDate: endOfWeek,
      },
      goalsTracked: goals.map((g) => ({
        goalId: g._id,
        title: g.title,
        progress: g.progress || 0,
        completed: g.completed,
      })),
      microGoalsCompleted,
      totalMicroGoals: totalMicroGoalsCount,
      overallProgress,
      hoursSpent,
      consistencyScore,
      aiSummary: summary,
      aiRecommendations: recommendations,
      challenges,
      achievements,
      nextWeekGoals: nextWeekGoals || [],
      streak,
      moodRating: moodRating || 3,
    });

    await weeklyReview.save();

    res.json({
      success: true,
      message: "Weekly review generated successfully",
      weeklyReview,
    });
  } catch (error) {
    console.error("Error generating weekly review:", error);
    res.status(500).json({ error: "Failed to generate weekly review" });
  }
};

/* ============ GET WEEKLY REVIEWS ============ */
const getWeeklyReviews = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const reviews = await WeeklyReview.find({ userId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      reviews,
    });
  } catch (error) {
    console.error("Error fetching weekly reviews:", error);
    res.status(500).json({ error: "Failed to fetch weekly reviews" });
  }
};

/* ============ AI FUNCTIONS ============ */

async function generateMicroGoalsAI(mainGoal, numMicroGoals) {
  try {
   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Break down this learning goal into ${numMicroGoals} specific, achievable micro-goals:

Goal: ${mainGoal.title}
Description: ${mainGoal.description || "No additional description"}
Category: ${mainGoal.category}

Generate ${numMicroGoals} micro-goals that are:
- SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
- Progressive (building on each other)
- Realistic (can be completed in 1-5 hours each)
- Motivating

Format as JSON array:
[
  {
    "title": "Micro-goal title",
    "description": "Detailed description",
    "priority": "high|medium|low",
    "estimatedHours": number,
    "subtasks": ["subtask1", "subtask2"],
    "resources": [{"title": "...", "url": "...", "type": "..."}],
    "deadline": "number of days from now"
  }
]

Ensure each micro-goal has concrete subtasks and relevant resources.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((mg) => ({
        ...mg,
        deadline: new Date(Date.now() + mg.deadline * 24 * 60 * 60 * 1000),
      }));
    }

    return [];
  } catch (error) {
    console.error("Error generating micro-goals with AI:", error);
    return [];
  }
}

async function generateWeeklySummaryAI(
  goals,
  completedMicroGoals,
  progress,
  hoursSpent
) {
  try {
   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Generate a weekly learning review summary based on this data:

Goals being tracked: ${goals.map((g) => g.title).join(", ")}
Micro-goals completed: ${completedMicroGoals.length}
Overall progress: ${progress}%
Hours spent: ${hoursSpent}

Create a review with:
1. A motivating summary (2-3 sentences)
2. 3 Key achievements
3. 2-3 Challenges faced
4. 3-4 Recommendations for next week
5. 2 Specific next week goals

Format as JSON:
{
  "summary": "...",
  "achievements": ["...", "...", "..."],
  "challenges": ["...", "..."],
  "recommendations": ["...", "...", "..."],
  "nextWeekGoals": ["...", "..."]
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || "Great week of learning!",
        achievements: parsed.achievements || [],
        challenges: parsed.challenges || [],
        recommendations: parsed.recommendations || [],
        nextWeekGoals: parsed.nextWeekGoals || [],
      };
    }

    return {
      summary: "Keep up the great learning journey!",
      achievements: [],
      challenges: [],
      recommendations: [],
      nextWeekGoals: [],
    };
  } catch (error) {
    console.error("Error generating summary with AI:", error);
    return {
      summary: "Week completed successfully",
      achievements: [],
      challenges: [],
      recommendations: [],
      nextWeekGoals: [],
    };
  }
}

function calculateConsistencyScore(completed, total, hoursSpent) {
  let score = 0;

  // Completion rate (40%)
  score += (completed / total) * 40;

  // Hours invested (40%) - assume 5 hours/week is good
  const hoursScore = Math.min((hoursSpent / 5) * 40, 40);
  score += hoursScore;

  // Bonus for completing multiple goals (20%)
  if (completed >= 3) score += 20;
  else if (completed >= 1) score += completed * 10;

  return Math.min(Math.round(score), 100);
}

async function calculateStreak(userId) {
  try {
    const reviews = await WeeklyReview.find({ userId }).sort({
      "week.startDate": -1,
    });

    let streak = 0;
    const now = new Date();
    let currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);

    for (const review of reviews) {
      if (review.microGoalsCompleted > 0) {
        const reviewStart = new Date(review.week.startDate);
        const weeksDiff = Math.round(
          (currentWeekStart - reviewStart) / (7 * 24 * 60 * 60 * 1000)
        );

        if (weeksDiff === streak) {
          streak++;
          currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error("Error calculating streak:", error);
    return 0;
  }
}

async function updateParentGoalProgress(parentGoalId, userId) {
  try {
    const microGoals = await MicroGoal.find({
      parentGoalId,
      userId,
    });

    if (microGoals.length === 0) return;

    const completedCount = microGoals.filter(
      (mg) => mg.status === "completed"
    ).length;
    const progress = Math.round((completedCount / microGoals.length) * 100);

    await Goal.findByIdAndUpdate(parentGoalId, {
      progress,
      completed: progress === 100,
    });
  } catch (error) {
    console.error("Error updating parent goal progress:", error);
  }
}

module.exports = {
  generateMicroGoals,
  getMicroGoals,
  updateMicroGoal,
  getAllMicroGoals,
  generateWeeklyReview,
  getWeeklyReviews,
};