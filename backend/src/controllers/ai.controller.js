const Goal = require("../models/Goal");
const User = require("../models/user.model");
const MicroGoal = require("../models/MicroGoal");
const WeeklyReview = require("../models/WeeklyReview");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ============ GET AI DASHBOARD ============ */
const getAIDashboard = async (req, res) => {
  try {
    const userId = req.user?.id; // Assuming auth middleware sets this

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Fetch user's goals
    const goals = await Goal.find({ userId }).lean();

    // Calculate progress
    const completed = goals.filter((g) => g.completed).length;
    const totalGoals = goals.length || 1;
    const progressPercentage = Math.round((completed / totalGoals) * 100);

    // Generate adaptive learning path using Gemini
    const adaptivePath = await generateAdaptivePath(goals);

    // Generate weekly summary
    const weeklySummary = generateWeeklySummary(goals);

    // Get badges based on progress (await the async function)
    const badges = await generateBadges(userId, progressPercentage, completed);

    res.json({
      data: {
        goals: goals.map((g) => ({
          id: g._id,
          name: g.title,
          description: g.description || "Continue your learning journey",
          progress: g.completed ? 100 : (g.progress || 0),
        })),
        weeklySummary,
        adaptivePath,
        badges,
      },
    });
  } catch (error) {
    console.error("Error fetching AI dashboard:", error);
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
};

/* ============ UPLOAD MATERIAL ============ */
const uploadMaterial = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    // Process file with Gemini
    const analysis = await analyzeFile(filePath, fileName);

    // Create or update a learning material in database
    await Goal.findOneAndUpdate(
      { userId, title: { $regex: analysis.topic, $options: "i" } },
      {
        $push: {
          materials: {
            fileName,
            analysis,
            uploadedAt: new Date(),
          },
        },
      },
      { new: true, upsert: true } // upsert to create if not exists
    );

    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error("File deletion error:", err);
    });

    res.json({
      success: true,
      message: "Material processed successfully",
      analysis,
    });
  } catch (error) {
    console.error("Error uploading material:", error);
    res.status(500).json({ error: "Failed to upload material" });
  }
};

/* ============ GENERATE ADAPTIVE PATH ============ */
async function generateAdaptivePath(goals) {
  try {
   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // corrected model name

    const goalTitles = goals.map((g) => g.title).join(", ");

    const prompt = `Based on these learning goals: ${goalTitles}
    
Generate a personalized adaptive learning path with 4-5 steps in JSON format:
{
  "steps": [
    {"step": 1, "title": "...", "description": "...", "duration": "2 hours"},
    ...
  ],
  "recommendation": "..."
}

Keep responses concise and actionable.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { steps: [], recommendation: "Continue your learning journey" };
  } catch (error) {
    console.error("Error generating adaptive path:", error);
    return { steps: [], recommendation: "Personalized path unavailable" };
  }
}

/* ============ ANALYZE FILE ============ */
async function analyzeFile(filePath, fileName) {
  try {
   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let fileContent = "";
    const ext = path.extname(fileName).toLowerCase();

    // Read file content
    if ([".txt", ".md", ".json", ".js"].includes(ext)) {
      fileContent = fs.readFileSync(filePath, "utf-8");
    } else {
      fileContent = `File: ${fileName} (${ext} format)`;
    }

    const prompt = `Analyze this learning material and provide:
1. Main topic
2. Key concepts (3-5 bullet points)
3. Estimated learning time
4. Suggested practice areas

Material:
${fileContent.substring(0, 2000)}

Format as JSON:
{
  "topic": "...",
  "concepts": ["...", "..."],
  "estimatedTime": "...",
  "practiceAreas": ["...", "..."]
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      topic: "Learning Material",
      concepts: ["Reviewed"],
      estimatedTime: "1 hour",
      practiceAreas: ["Application"],
    };
  } catch (error) {
    console.error("Error analyzing file:", error);
    return {
      topic: fileName,
      concepts: ["Content uploaded"],
      estimatedTime: "Self-paced",
      practiceAreas: ["Review"],
    };
  }
}

/* ============ GENERATE WEEKLY SUMMARY ============ */
function generateWeeklySummary(goals) {
  const completed = goals.filter((g) => g.completed).length;
  const total = goals.length || 1;
  const percentage = Math.round((completed / total) * 100);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dailyProgress = days.map((day, i) => ({
    day,
    progress: Math.max(10, Math.random() * percentage),
  }));

  return {
    weeklyGoalsCompleted: completed,
    totalGoals: total,
    weeklyPercentage: percentage,
    dailyProgress,
    trend: percentage >= 70 ? "📈 Great Progress!" : "📊 Keep Going!",
  };
}

/* ============ GENERATE BADGES ============ */
async function generateBadges(userId, percentage, completed) {
  const badges = [];

  try {
    // Basic badges based on goals completed
    if (completed >= 1) badges.push({ name: "First Step", icon: "🚀", description: "Complete your first goal" });
    if (completed >= 3) badges.push({ name: "Momentum Builder", icon: "⚡", description: "Complete 3 goals" });
    if (completed >= 5) badges.push({ name: "Goal Crusher", icon: "💪", description: "Complete 5 goals" });
    if (percentage >= 50) badges.push({ name: "Half-Way Hero", icon: "🎯", description: "Reach 50% progress" });
    if (percentage >= 100) badges.push({ name: "Master Achiever", icon: "👑", description: "Reach 100% progress" });
    if (completed === 0) badges.push({ name: "Getting Started", icon: "🌱", description: "Start your learning journey" });

    // Micro-goal achievements
    const microGoalsCompleted = await MicroGoal.countDocuments({
      userId,
      status: "completed",
    });

    if (microGoalsCompleted >= 10) {
      badges.push({
        name: "Micro-Master",
        icon: "🎓",
        description: "Complete 10 micro-goals",
      });
    }

    // Consistency badges
    const weeklyReviews = await WeeklyReview.find({ userId }).sort({
      createdAt: -1,
    });

    const consistentWeeks = weeklyReviews.filter((r) => r.consistencyScore >= 70).length;

    if (consistentWeeks >= 4) {
      badges.push({
        name: "Weekly Warrior",
        icon: "⚔️",
        description: "Maintain 70%+ consistency for 4 weeks",
      });
    }

    if (weeklyReviews.length > 0 && weeklyReviews[0].streak >= 8) {
      badges.push({
        name: "Consistent Learner",
        icon: "🔥",
        description: "Maintain 8+ week learning streak",
      });
    }

    // Time investment badge
    const totalHours = weeklyReviews.reduce((sum, r) => sum + r.hoursSpent, 0);
    if (totalHours >= 50) {
      badges.push({
        name: "Time Tracker",
        icon: "⏱️",
        description: "Log 50+ hours of learning",
      });
    }

    // Perfectionist badge
    const perfectMicroGoals = await MicroGoal.aggregate([
      { $match: { userId } },
      {
        $addFields: {
          completedSubtasks: {
            $cond: [
              { $eq: ["$subtasks", []] },
              0,
              {
                $size: {
                  $filter: {
                    input: "$subtasks",
                    as: "subtask",
                    cond: "$$subtask.completed",
                  },
                },
              },
            ],
          },
          totalSubtasks: { $cond: [{ $eq: ["$subtasks", []] }, 0, { $size: "$subtasks" }] },
        },
      },
      {
        $match: {
          status: "completed",
          $expr: { $eq: ["$completedSubtasks", "$totalSubtasks"] },
        },
      },
      { $count: "count" },
    ]);

    if (perfectMicroGoals.length > 0 && perfectMicroGoals[0].count >= 5) {
      badges.push({
        name: "Perfectionist",
        icon: "✨",
        description: "Complete 5 micro-goals with 100% subtask completion",
      });
    }

    return badges;
  } catch (error) {
    console.error("Error generating enhanced badges:", error);
    // Return basic badges if error occurs
    const basicBadges = [];
    if (completed >= 1) basicBadges.push({ name: "First Step", icon: "🚀" });
    if (completed >= 3) basicBadges.push({ name: "Momentum Builder", icon: "⚡" });
    if (completed >= 5) basicBadges.push({ name: "Goal Crusher", icon: "💪" });
    if (percentage >= 50) basicBadges.push({ name: "Half-Way Hero", icon: "🎯" });
    if (percentage >= 100) basicBadges.push({ name: "Master Achiever", icon: "👑" });
    return basicBadges;
  }
}

module.exports = {
  getAIDashboard,
  uploadMaterial,
};