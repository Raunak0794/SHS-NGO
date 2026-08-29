const StudentTopicProgress = require("../models/StudentTopicProgress");
const StudentMistake = require("../models/StudentMistake");
const User = require("../models/user.model");

/**
 * Topic normalizer to prevent duplicate fragmentation
 * (e.g. "Reflection of Light" vs "reflection" vs "Light Reflection")
 */
function normalizeTopicKey(subject = "General", rawTopic = "") {
  const cleanSubject = String(subject || "General").trim().toLowerCase();
  const cleanTopic = String(rawTopic || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `${cleanSubject}:${cleanTopic || "general"}`;
}

/**
 * Calculate dynamic mastery score (0-100)
 */
function calculateMastery({ correctAnswers, totalAttempts, lastStudiedAt }) {
  if (!totalAttempts || totalAttempts === 0) return 50;

  // 1. Accuracy Component (60%)
  const accuracy = (correctAnswers / totalAttempts) * 100;
  const accuracyScore = accuracy * 0.6;

  // 2. Volume Component (20%) - reaches max at 10 attempts
  const volumeFactor = Math.min(totalAttempts / 10, 1.0);
  const volumeScore = volumeFactor * 20;

  // 3. Recency Component (20%)
  let recencyScore = 20;
  if (lastStudiedAt) {
    const daysSince = (Date.now() - new Date(lastStudiedAt).getTime()) / (1000 * 3600 * 24);
    if (daysSince > 14) {
      recencyScore = Math.max(5, 20 - (daysSince - 14)); // gradual decay
    }
  }

  const finalScore = Math.round(accuracyScore + volumeScore + recencyScore);
  return Math.min(Math.max(finalScore, 5), 100);
}

/**
 * Record a question/quiz result and update topic mastery
 */
async function recordTopicAttempt({
  userId,
  subject = "General",
  topic = "General",
  chapter = "",
  isCorrect = false,
  question = "",
  options = [],
  studentAnswer = "",
  correctAnswer = "",
  explanation = "",
  sourceMaterial = "",
}) {
  if (!userId) return null;

  const normalizedTopic = normalizeTopicKey(subject, topic);
  const now = new Date();

  // 1. Find or create topic progress
  let progress = await StudentTopicProgress.findOne({ userId, normalizedTopic });

  if (!progress) {
    progress = new StudentTopicProgress({
      userId,
      subject,
      topic: topic || "General",
      normalizedTopic,
      chapter: chapter || "",
      questionsAsked: 1,
      correctAnswers: isCorrect ? 1 : 0,
      incorrectAnswers: isCorrect ? 0 : 1,
      totalAttempts: 1,
      lastStudiedAt: now,
    });
  } else {
    progress.totalAttempts += 1;
    progress.questionsAsked += 1;
    if (isCorrect) {
      progress.correctAnswers += 1;
    } else {
      progress.incorrectAnswers += 1;
    }
    progress.lastStudiedAt = now;
    if (chapter && !progress.chapter) {
      progress.chapter = chapter;
    }
  }

  // 2. Compute updated mastery score and status
  const mastery = calculateMastery({
    correctAnswers: progress.correctAnswers,
    totalAttempts: progress.totalAttempts,
    lastStudiedAt: progress.lastStudiedAt,
  });

  progress.masteryScore = mastery;
  progress.confidenceScore = Math.round((progress.correctAnswers / progress.totalAttempts) * 100);

  if (mastery >= 75) {
    progress.status = "mastered";
  } else if (mastery >= 50) {
    progress.status = "improving";
  } else {
    progress.status = "weak";
  }

  await progress.save();

  // 3. If incorrect, save in StudentMistake book
  if (!isCorrect && question && studentAnswer && correctAnswer) {
    await StudentMistake.create({
      userId,
      subject,
      topic,
      question,
      options: Array.isArray(options) ? options : [],
      studentAnswer,
      correctAnswer,
      explanation: explanation || "",
      sourceMaterial: sourceMaterial || "",
      reviewed: false,
    });
  }

  // 4. Update user active streak
  await updateUserStreak(userId);

  return progress;
}

/**
 * Update student study streak
 */
async function updateUserStreak(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const lastActiveStr = user.lastActiveDate
      ? new Date(user.lastActiveDate).toISOString().split("T")[0]
      : null;

    if (lastActiveStr !== todayStr) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastActiveStr === yesterdayStr) {
        user.streak = (user.streak || 0) + 1;
      } else if (!lastActiveStr || lastActiveStr < yesterdayStr) {
        user.streak = 1;
      }

      user.lastActiveDate = now;
      await user.save();
    }
  } catch (err) {
    console.error("Update streak error:", err.message);
  }
}

/**
 * Get categorized topics (Weak, Improving, Mastered)
 */
async function getStudentTopicsBreakdown(userId) {
  const allTopics = await StudentTopicProgress.find({ userId }).sort({ masteryScore: 1 });

  const weakTopics = allTopics.filter((t) => t.status === "weak" || t.masteryScore < 50);
  const improvingTopics = allTopics.filter((t) => t.status === "improving" || (t.masteryScore >= 50 && t.masteryScore < 75));
  const strongTopics = allTopics.filter((t) => t.status === "mastered" || t.masteryScore >= 75);

  return {
    all: allTopics,
    weak: weakTopics,
    improving: improvingTopics,
    strong: strongTopics,
  };
}

module.exports = {
  normalizeTopicKey,
  calculateMastery,
  recordTopicAttempt,
  getStudentTopicsBreakdown,
  updateUserStreak,
};
