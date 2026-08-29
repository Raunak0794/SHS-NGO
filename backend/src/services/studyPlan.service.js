const StudentTopicProgress = require("../models/StudentTopicProgress");
const { callGemini, parseJSONFromText } = require("../utils/gemini");
const { createCalendarEvent } = require("./calendarService");
const User = require("../models/user.model");

/**
 * Generate AI study plan for school exams
 */
async function generateExamStudyPlan({
  userId,
  examName,
  examDate,
  subject = "Mathematics",
  chapters = [],
  dailyMinutes = 45,
}) {
  const user = await User.findById(userId);
  const classLevel = user?.classLevel || "Class 8";

  // Fetch student's weak topics in this subject
  const topicProgress = await StudentTopicProgress.find({
    userId,
    subject: new RegExp(`^${subject}$`, "i"),
  }).lean();

  const weakTopics = topicProgress
    .filter((t) => t.status === "weak" || t.masteryScore < 60)
    .map((t) => `${t.topic} (Mastery: ${t.masteryScore}%)`);

  const parsedExamDate = new Date(examDate);
  const today = new Date();
  const diffDays = Math.max(
    1,
    Math.ceil((parsedExamDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
  );

  const prompt = `You are an expert academic planner for a **${classLevel}** student.

EXAM DETAILS:
- Exam Name: ${examName}
- Subject: ${subject}
- Target Exam Date: ${parsedExamDate.toLocaleDateString()} (In ${diffDays} days)
- Chapters to Cover: ${chapters.join(", ") || "Full Subject Syllabus"}
- Daily Study Time: ${dailyMinutes} minutes
- Known Weak Topics to Prioritize: ${weakTopics.join(", ") || "None recorded yet"}

TASK:
Create a realistic, motivating, day-by-day study and revision timetable up to the exam (max 7-10 days schedule).
Prioritize weaker concepts first, allocate time for chapter revision, practice quizzes, and final mock test on the day before the exam.

Respond in valid JSON format:
{
  "planSummary": "Brief overview of strategy...",
  "priorityChapters": ["Chapter 1", "Chapter 2"],
  "days": [
    {
      "dayNumber": 1,
      "dateOffsetDays": 1,
      "focus": "Main focus topic/chapter",
      "activities": [
        {"title": "Revise Chapter 1 definitions", "durationMinutes": 25, "type": "revision"},
        {"title": "Practice 5 questions on weak topic", "durationMinutes": 20, "type": "practice"}
      ]
    }
  ]
}
Respond with JSON only.`;

  try {
    const raw = await callGemini(prompt);
    const parsed = parseJSONFromText(raw, null);

    if (parsed && Array.isArray(parsed.days)) {
      // Add concrete calendar dates to each day
      const daysWithDates = parsed.days.map((day, idx) => {
        const d = new Date(today);
        d.setDate(today.getDate() + (day.dateOffsetDays || idx + 1));
        d.setHours(17, 0, 0, 0); // 5:00 PM study session
        return {
          ...day,
          sessionDate: d.toISOString(),
        };
      });

      return {
        examName,
        examDate: parsedExamDate.toISOString(),
        subject,
        daysRemaining: diffDays,
        planSummary: parsed.planSummary || "Personalized exam revision plan.",
        priorityChapters: parsed.priorityChapters || chapters,
        schedule: daysWithDates,
      };
    }

    // Fallback schedule
    return generateFallbackPlan({ examName, examDate: parsedExamDate, subject, chapters, dailyMinutes, diffDays });
  } catch (err) {
    console.error("Generate study plan error:", err);
    return generateFallbackPlan({ examName, examDate: parsedExamDate, subject, chapters, dailyMinutes, diffDays });
  }
}

function generateFallbackPlan({ examName, examDate, subject, chapters, dailyMinutes, diffDays }) {
  const today = new Date();
  const scheduleDays = Math.min(diffDays, 7);
  const chapterList = chapters.length > 0 ? chapters : ["Core Concepts", "Key Formulas", "Past Questions"];

  const days = Array.from({ length: scheduleDays }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i + 1);
    d.setHours(17, 0, 0, 0);
    const chapter = chapterList[i % chapterList.length];

    return {
      dayNumber: i + 1,
      sessionDate: d.toISOString(),
      focus: `Revise ${chapter}`,
      activities: [
        { title: `Read ${chapter} notes`, durationMinutes: Math.round(dailyMinutes * 0.6), type: "revision" },
        { title: `Practice ${chapter} questions`, durationMinutes: Math.round(dailyMinutes * 0.4), type: "practice" },
      ],
    };
  });

  return {
    examName,
    examDate: examDate.toISOString(),
    subject,
    daysRemaining: diffDays,
    planSummary: `Structured ${scheduleDays}-day study schedule for ${examName}.`,
    priorityChapters: chapters,
    schedule: days,
  };
}

/**
 * Sync selected study sessions from the plan into Google Calendar
 */
async function syncPlanToGoogleCalendar(userId, sessionsToSync = []) {
  const user = await User.findById(userId);
  if (!user?.calendarTokens?.accessToken && !user?.calendarTokens?.refreshToken) {
    throw new Error("Google Calendar is not connected. Please authorize calendar access in Settings.");
  }

  const results = [];
  for (const session of sessionsToSync) {
    try {
      const deadline = new Date(session.sessionDate || Date.now() + 24 * 3600 * 1000);
      const title = `📚 SHS AI Study: ${session.focus || session.title || "Study Session"}`;
      const description = `Activities:\n${(session.activities || []).map((a) => `• ${a.title} (${a.durationMinutes} min)`).join("\n")}\n\nGenerated by SHS AI.`;

      const event = await createCalendarEvent(user.calendarTokens, {
        title,
        description,
        deadline,
      });

      results.push({ success: true, title, eventId: event.id });
    } catch (err) {
      console.error("Error syncing session to calendar:", err.message);
      results.push({ success: false, title: session.title, error: err.message });
    }
  }

  return results;
}

module.exports = {
  generateExamStudyPlan,
  syncPlanToGoogleCalendar,
};
