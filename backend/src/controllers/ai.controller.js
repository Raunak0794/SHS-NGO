const Goal = require("../models/Goal");
const User = require("../models/user.model");
const MicroGoal = require("../models/MicroGoal");
const WeeklyReview = require("../models/WeeklyReview");
const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const Tesseract = require("tesseract.js");
const { callGemini, parseJSONFromText } = require("../utils/gemini");
const { extractTextFromPdf } = require("../utils/pdf");

const MAX_ANALYSIS_CHARS = 2000;

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

    // Generate weekly summary from real goal-update activity
    const weeklySummary = await generateWeeklySummary(userId, goals);

    // Get badges based on progress
    const badges = await generateBadges(userId, progressPercentage, completed);

    res.json({
      data: {
        goals: goals.map((g) => ({
          id: g._id,
          name: g.title,
          description: g.description || "Continue your learning journey",
          progress: g.completed ? 100 : g.progress || 0,
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

    // Match on an escaped, exact-ish topic to avoid regex injection and
    // accidental cross-matching between unrelated goals.
    const safeTopic = escapeRegex(analysis.topic || fileName);

    await Goal.findOneAndUpdate(
      { userId, title: { $regex: `^${safeTopic}$`, $options: "i" } },
      {
        $push: {
          materials: {
            fileName,
            analysis,
            uploadedAt: new Date(),
          },
        },
        $setOnInsert: {
          userId,
          title: analysis.topic || fileName,
        },
      },
      { returnDocument: "after", upsert: true }
    );

    res.json({
      success: true,
      message: "Material processed successfully",
      analysis,
    });
  } catch (error) {
    console.error("Error uploading material:", error);
    res.status(500).json({ error: "Failed to upload material" });
  } finally {
    // Always attempt cleanup, success or failure.
    if (req.file?.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("File deletion error:", err);
      });
    }
  }
};

/* ============ HELPERS ============ */

// Escapes regex metacharacters so user/AI-derived strings can be safely
// used inside a MongoDB $regex query.
function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ============ GENERATE ADAPTIVE PATH ============ */
async function generateAdaptivePath(goals) {
  try {
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

Keep responses concise and actionable. Respond with JSON only.`;

    const responseText = await callGemini(prompt);
    const parsed = parseJSONFromText(responseText);
    if (parsed?.steps) return parsed;

    return { steps: [], recommendation: "Continue your learning journey" };
  } catch (error) {
    console.error("Error generating adaptive path:", error);
    return { steps: [], recommendation: "Personalized path unavailable" };
  }
}

/* ============ ANALYZE FILE ============ */

// Extensions the multer route accepts but that we can meaningfully
// extract text from today. Keep this in sync with the route's fileFilter,
// or extend the branches below as new extractors are added.
const SUPPORTED_TEXT_EXTENSIONS = new Set([".txt", ".md", ".json", ".js", ".html", ".css", ".csv", ".xml", ".log"]);

async function analyzeFile(filePath, fileName) {
  try {
    let fileContent = "";
    let unsupportedFormat = false;
    const ext = path.extname(fileName).toLowerCase();

    if (SUPPORTED_TEXT_EXTENSIONS.has(ext)) {
      fileContent = fs.readFileSync(filePath, "utf-8");
    } else if (ext === ".pdf") {
      fileContent = await extractTextFromPdf(fs.readFileSync(filePath));
    } else if (ext === ".docx") {
      const docxData = await mammoth.extractRawText({ path: filePath });
      fileContent = docxData.value || "";
    } else if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
      const result = await Tesseract.recognize(filePath, "eng");
      fileContent = result.data.text || "";
    } else {
      // .ppt/.pptx/.xls/.xlsx/.zip/.mp3/.mp4 etc. are accepted by the
      // upload route but have no text extractor wired up yet.
      unsupportedFormat = true;
      fileContent = `File: ${fileName} (${ext} format, content not extracted)`;
    }

    if (!unsupportedFormat && !fileContent.trim()) {
      fileContent = `No readable text extracted from ${fileName}`;
    }

    const truncated = fileContent.length > MAX_ANALYSIS_CHARS;
    const excerpt = fileContent.substring(0, MAX_ANALYSIS_CHARS);

    const prompt = `Analyze this learning material and provide:
1. Main topic
2. Key concepts (3-5 bullet points)
3. Estimated learning time
4. Suggested practice areas
${truncated ? "\nNote: this is only the first portion of a longer document." : ""}

Material:
${excerpt}

Format as JSON:
{
  "topic": "...",
  "concepts": ["...", "..."],
  "estimatedTime": "...",
  "practiceAreas": ["...", "..."]
}
Respond with JSON only.`;

    const responseText = await callGemini(prompt);
    const parsed = parseJSONFromText(responseText);
    if (parsed?.topic) {
      return { ...parsed, truncated, unsupportedFormat };
    }

    return {
      topic: "Learning Material",
      concepts: ["Reviewed"],
      estimatedTime: "1 hour",
      practiceAreas: ["Application"],
      truncated,
      unsupportedFormat,
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

// Builds a real daily-progress breakdown from goal update timestamps
// instead of random placeholder numbers. Falls back gracefully if a
// goal has no updatedAt/completedAt history.
async function generateWeeklySummary(userId, goals) {
  const completed = goals.filter((g) => g.completed).length;
  const total = goals.length || 1;
  const percentage = Math.round((completed / total) * 100);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);

  // Count goal updates per day this week as a proxy for daily activity.
  const dayCounts = new Array(7).fill(0);
  let anyActivity = false;

  for (const goal of goals) {
    const updatedAt = goal.updatedAt ? new Date(goal.updatedAt) : null;
    if (!updatedAt || updatedAt < startOfWeek) continue;

    const dayIndex = (updatedAt.getDay() + 6) % 7; // Mon=0 ... Sun=6
    dayCounts[dayIndex] += 1;
    anyActivity = true;
  }

  const maxCount = Math.max(...dayCounts, 1);
  const dailyProgress = days.map((day, i) => ({
    day,
    // Scale activity counts into a 0-100 range relative to the busiest day.
    progress: anyActivity ? Math.round((dayCounts[i] / maxCount) * 100) : 0,
  }));

  return {
    weeklyGoalsCompleted: completed,
    totalGoals: total,
    weeklyPercentage: percentage,
    dailyProgress,
    trend: percentage >= 70 ? "\ud83d\udcc8 Great Progress!" : "\ud83d\udcca Keep Going!",
  };
}

/* ============ GENERATE BADGES ============ */

// Shared so the success path and error-fallback path can never drift
// apart, which was a bug in the original implementation.
function computeBaseBadges(percentage, completed) {
  const badges = [];

  if (completed === 0) badges.push({ name: "Getting Started", icon: "\ud83c\udf31", description: "Start your learning journey" });
  if (completed >= 1) badges.push({ name: "First Step", icon: "\ud83d\ude80", description: "Complete your first goal" });
  if (completed >= 3) badges.push({ name: "Momentum Builder", icon: "\u26a1", description: "Complete 3 goals" });
  if (completed >= 5) badges.push({ name: "Goal Crusher", icon: "\ud83d\udcaa", description: "Complete 5 goals" });
  if (percentage >= 50) badges.push({ name: "Half-Way Hero", icon: "\ud83c\udfaf", description: "Reach 50% progress" });
  if (percentage >= 100) badges.push({ name: "Master Achiever", icon: "\ud83d\udc51", description: "Reach 100% progress" });

  return badges;
}

async function generateBadges(userId, percentage, completed) {
  const badges = computeBaseBadges(percentage, completed);

  try {
    // Micro-goal achievements
    const microGoalsCompleted = await MicroGoal.countDocuments({
      userId,
      status: "completed",
    });

    if (microGoalsCompleted >= 10) {
      badges.push({
        name: "Micro-Master",
        icon: "\ud83c\udf93",
        description: "Complete 10 micro-goals",
      });
    }

    // Consistency badges
    const weeklyReviews = await WeeklyReview.find({ userId }).sort({ createdAt: -1 });

    const consistentWeeks = weeklyReviews.filter((r) => r.consistencyScore >= 70).length;
    if (consistentWeeks >= 4) {
      badges.push({
        name: "Weekly Warrior",
        icon: "\u2694\ufe0f",
        description: "Maintain 70%+ consistency for 4 weeks",
      });
    }

    if (weeklyReviews.length > 0 && weeklyReviews[0].streak >= 8) {
      badges.push({
        name: "Consistent Learner",
        icon: "\ud83d\udd25",
        description: "Maintain 8+ week learning streak",
      });
    }

    // Time investment badge
    const totalHours = weeklyReviews.reduce((sum, r) => sum + (r.hoursSpent || 0), 0);
    if (totalHours >= 50) {
      badges.push({
        name: "Time Tracker",
        icon: "\u23f1\ufe0f",
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
        icon: "\u2728",
        description: "Complete 5 micro-goals with 100% subtask completion",
      });
    }

    return badges;
  } catch (error) {
    console.error("Error generating enhanced badges:", error);
    // Same base badges as the success path — no more drift between them.
    return badges;
  }
}

module.exports = {
  getAIDashboard,
  uploadMaterial,
};
