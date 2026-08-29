const User = require("../models/user.model");
const StudentTopicProgress = require("../models/StudentTopicProgress");
const StudentMistake = require("../models/StudentMistake");
const StudySession = require("../models/StudySession");
const Message = require("../models/Message");
const { getStudentTopicsBreakdown } = require("../services/mastery.service");
const { generateRecommendations } = require("../services/recommendation.service");
const { generateExamStudyPlan, syncPlanToGoogleCalendar } = require("../services/studyPlan.service");

/**
 * GET /api/progress/dashboard
 * Real student analytics & topic breakdown
 */
const getProgressDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).lean();

    // 1. Fetch topics breakdown
    const topicData = await getStudentTopicsBreakdown(userId);

    // 2. Fetch counts
    const documentsCount = await StudySession.countDocuments({ userId });
    const questionsCount = await Message.countDocuments({ userId, role: "user" });
    const mistakesCount = await StudentMistake.countDocuments({ userId, reviewed: false });

    // 3. Compute overall accuracy
    const allTopics = topicData.all || [];
    const totalAttempts = allTopics.reduce((sum, t) => sum + (t.totalAttempts || 0), 0);
    const totalCorrect = allTopics.reduce((sum, t) => sum + (t.correctAnswers || 0), 0);
    const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    // 4. Calculate Subject-wise progress
    const subjectMap = new Map();
    (user?.subjects || ["Mathematics", "Science", "English", "Social Science"]).forEach((s) => {
      subjectMap.set(s, { totalScore: 0, count: 0, accuracy: 0 });
    });

    allTopics.forEach((t) => {
      const entry = subjectMap.get(t.subject) || { totalScore: 0, count: 0, accuracy: 0 };
      entry.totalScore += t.masteryScore || 50;
      entry.count += 1;
      subjectMap.set(t.subject, entry);
    });

    const subjectProgress = [];
    subjectMap.forEach((val, key) => {
      const avg = val.count > 0 ? Math.round(val.totalScore / val.count) : 0;
      subjectProgress.push({
        subject: key,
        mastery: avg,
        topicsCount: val.count,
      });
    });

    return res.status(200).json({
      success: true,
      stats: {
        documentsUploaded: documentsCount,
        questionsAsked: questionsCount,
        totalAttempts,
        accuracy: overallAccuracy,
        topicsMasteredCount: topicData.strong.length,
        weakTopicsCount: topicData.weak.length,
        improvingTopicsCount: topicData.improving.length,
        unreviewedMistakesCount: mistakesCount,
        streak: user?.streak || 0,
        dailyGoalMinutes: user?.dailyStudyGoalMinutes || 30,
      },
      weakTopics: topicData.weak.slice(0, 8),
      improvingTopics: topicData.improving.slice(0, 8),
      strongTopics: topicData.strong.slice(0, 8),
      subjectProgress,
    });
  } catch (error) {
    console.error("Get progress dashboard error:", error);
    return res.status(500).json({ success: false, message: "Could not load progress dashboard" });
  }
};

/**
 * GET /api/progress/recommendation
 * "What should I study?" priority engine
 */
const getRecommendation = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).lean();
    const recommendations = await generateRecommendations(userId, user);

    return res.status(200).json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error("Get recommendation error:", error);
    return res.status(500).json({ success: false, message: "Could not generate recommendations" });
  }
};

/**
 * POST /api/progress/study-plan
 * Generate exam study plan
 */
const createStudyPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { examName, examDate, subject, chapters, dailyMinutes } = req.body || {};

    if (!examName || !examDate) {
      return res.status(400).json({ success: false, message: "Exam name and exam date are required." });
    }

    const plan = await generateExamStudyPlan({
      userId,
      examName,
      examDate,
      subject: subject || "Mathematics",
      chapters: Array.isArray(chapters) ? chapters : [],
      dailyMinutes: Number(dailyMinutes) || 45,
    });

    return res.status(200).json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error("Create study plan error:", error);
    return res.status(500).json({ success: false, message: "Could not generate study plan" });
  }
};

/**
 * POST /api/progress/study-plan/sync-calendar
 * Push study plan sessions to Google Calendar
 */
const syncCalendarPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessions = [] } = req.body || {};

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ success: false, message: "No study sessions provided to sync." });
    }

    const results = await syncPlanToGoogleCalendar(userId, sessions);

    return res.status(200).json({
      success: true,
      message: "Study sessions synced to Google Calendar!",
      results,
    });
  } catch (error) {
    console.error("Sync calendar plan error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to sync with Google Calendar",
    });
  }
};

module.exports = {
  getProgressDashboard,
  getRecommendation,
  createStudyPlan,
  syncCalendarPlan,
};
