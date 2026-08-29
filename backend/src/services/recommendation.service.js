const StudentTopicProgress = require("../models/StudentTopicProgress");
const StudentMistake = require("../models/StudentMistake");
const StudySession = require("../models/StudySession");

/**
 * Generate smart personalized study recommendations from stored database records
 */
async function generateRecommendations(userId, user) {
  if (!userId) return null;

  // 1. Fetch weak and improving topics
  const topics = await StudentTopicProgress.find({ userId }).sort({ masteryScore: 1 }).lean();
  const mistakes = await StudentMistake.find({ userId, reviewed: false }).sort({ createdAt: -1 }).limit(10).lean();
  const recentSessions = await StudySession.find({ userId }).sort({ updatedAt: -1 }).limit(5).lean();

  const weakTopics = topics.filter((t) => t.status === "weak" || t.masteryScore < 50);
  const improvingTopics = topics.filter((t) => t.status === "improving" || (t.masteryScore >= 50 && t.masteryScore < 75));
  const strongTopics = topics.filter((t) => t.status === "mastered" || t.masteryScore >= 75);

  let priorityRecommendation = null;

  // Scenario A: Student has weak topics
  if (weakTopics.length > 0) {
    const worstTopic = weakTopics[0];
    const mistakeCount = mistakes.filter((m) => m.topic === worstTopic.topic).length;

    priorityRecommendation = {
      title: `Revise ${worstTopic.topic}`,
      subject: worstTopic.subject,
      topic: worstTopic.topic,
      reason: mistakeCount > 0
        ? `You had trouble with ${mistakeCount} question${mistakeCount > 1 ? "s" : ""} on ${worstTopic.topic}. Mastery is currently ${worstTopic.masteryScore}%.`
        : `Your mastery in ${worstTopic.topic} is ${worstTopic.masteryScore}%. A quick 15-minute practice will help boost it.`,
      estimatedMinutes: 20,
      action: "practice",
      actionType: "weak_topic",
    };
  }
  // Scenario B: Student has unreviewed mistakes in mistake book
  else if (mistakes.length > 0) {
    const recentMistake = mistakes[0];
    priorityRecommendation = {
      title: `Review Recent Mistakes in ${recentMistake.subject}`,
      subject: recentMistake.subject,
      topic: recentMistake.topic,
      reason: `You have ${mistakes.length} question${mistakes.length > 1 ? "s" : ""} in your Mistake Book waiting for revision.`,
      estimatedMinutes: 15,
      action: "mistakes",
      actionType: "mistake_book",
    };
  }
  // Scenario C: Student has uploaded materials but haven't practiced
  else if (recentSessions.length > 0) {
    const session = recentSessions[0];
    const mainTopic = session.content?.extractedTopics?.[0] || session.title;
    priorityRecommendation = {
      title: `Practice ${mainTopic}`,
      subject: session.tags?.[0] || "General",
      topic: mainTopic,
      reason: `You recently uploaded "${session.title}". Let's test your understanding with a quick 5-question quiz.`,
      estimatedMinutes: 15,
      action: "quiz",
      actionType: "document_quiz",
      sessionId: session._id,
    };
  }
  // Scenario D: New student with no data yet
  else {
    const defaultSubject = user?.subjects?.[0] || "Mathematics";
    priorityRecommendation = {
      title: "Upload Your First Notes or Ask AI Tutor",
      subject: defaultSubject,
      topic: "Getting Started",
      reason: "Upload a chapter PDF or ask the AI Tutor any concept to get personalized recommendations!",
      estimatedMinutes: 10,
      action: "upload",
      actionType: "onboarding",
    };
  }

  // Generate a list of secondary tips
  const tips = [];
  if (mistakes.length > 3) {
    tips.push(`You have ${mistakes.length} saved mistakes in your Mistake Book. Review them before exams.`);
  }
  if (improvingTopics.length > 0) {
    tips.push(`${improvingTopics[0].topic} is at ${improvingTopics[0].masteryScore}% mastery — almost mastered!`);
  }
  if (strongTopics.length > 0) {
    tips.push(`Great job! You've mastered ${strongTopics.map((t) => t.topic).slice(0, 2).join(" & ")}.`);
  }

  return {
    priority: priorityRecommendation,
    weakTopicsCount: weakTopics.length,
    improvingTopicsCount: improvingTopics.length,
    strongTopicsCount: strongTopics.length,
    unreviewedMistakesCount: mistakes.length,
    tips,
  };
}

module.exports = {
  generateRecommendations,
};
