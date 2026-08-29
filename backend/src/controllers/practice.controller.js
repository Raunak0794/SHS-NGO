const mongoose = require("mongoose");
const User = require("../models/user.model");
const StudentMistake = require("../models/StudentMistake");
const StudentTopicProgress = require("../models/StudentTopicProgress");
const SavedRevision = require("../models/SavedRevision");
const DocumentChunk = require("../models/DocumentChunk");
const StudySession = require("../models/StudySession");
const { callGemini, parseJSONFromText } = require("../utils/gemini");
const { retrieveRelevantChunks } = require("../services/rag/retrieval.service");
const { recordTopicAttempt } = require("../services/mastery.service");

/**
 * POST /api/practice/quiz/generate
 * Generate adaptive quizzes grounded in student material or weak topics
 */
const generateQuiz = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      sourceType = "document", // 'document' | 'subject' | 'weak_topics' | 'chapter'
      documentId,
      subject = "General",
      chapter = "",
      numQuestions = 5,
      difficulty = "adaptive", // 'easy' | 'medium' | 'hard' | 'adaptive'
    } = req.body || {};

    const user = await User.findById(userId).lean();
    const classLevel = user?.classLevel || "Class 8";
    const requestedCount = Math.min(Math.max(Number(numQuestions) || 5, 2), 15);

    // 1. Determine effective difficulty if adaptive
    let effectiveDifficulty = difficulty;
    if (difficulty === "adaptive") {
      const topicStats = await StudentTopicProgress.find({
        userId,
        subject: new RegExp(`^${subject}$`, "i"),
      }).lean();

      const avgMastery = topicStats.length
        ? topicStats.reduce((sum, t) => sum + (t.masteryScore || 50), 0) / topicStats.length
        : 50;

      if (avgMastery >= 75) effectiveDifficulty = "hard";
      else if (avgMastery >= 50) effectiveDifficulty = "medium";
      else effectiveDifficulty = "easy";
    }

    // 2. Fetch context depending on sourceType
    let contextText = "";
    let targetedTopics = [];

    if (sourceType === "weak_topics") {
      const weakTopics = await StudentTopicProgress.find({
        userId,
        status: "weak",
      })
        .sort({ masteryScore: 1 })
        .limit(3)
        .lean();

      targetedTopics = weakTopics.map((t) => t.topic);
      if (targetedTopics.length > 0) {
        const chunks = await retrieveRelevantChunks({
          userId,
          query: targetedTopics.join(" "),
          scope: "all",
          topK: 6,
        });
        contextText = chunks.map((c) => c.content).join("\n\n");
      }
    } else if (sourceType === "document" && documentId) {
      const chunks = await DocumentChunk.find({ documentId, userId })
        .limit(10)
        .lean();
      contextText = chunks.map((c) => c.content).join("\n\n");
    } else if (sourceType === "subject" && subject) {
      const chunks = await DocumentChunk.find({ subject: new RegExp(`^${subject}$`, "i"), userId })
        .limit(10)
        .lean();
      contextText = chunks.map((c) => c.content).join("\n\n");
    }

    // 3. Formulate AI prompt
    const prompt = `You are an expert exam paper setter for a **${classLevel}** school student.
Subject: ${subject}
Difficulty: ${effectiveDifficulty.toUpperCase()}
Target Topics: ${targetedTopics.join(", ") || chapter || "Comprehensive Syllabus"}

${contextText ? `### SOURCE STUDY MATERIAL (Ground questions in this data):\n${contextText.substring(0, 4000)}\n\n` : ""}

TASK:
Create exactly ${requestedCount} multiple-choice practice questions suitable for a **${classLevel}** student.
Each question MUST:
1. Have 4 distinct, unambiguous options (A, B, C, D text).
2. Have a clear 'correctAnswer' that exactly matches one of the 4 options.
3. Have a supportive, clear educational 'explanation'.
4. Identify the specific 'topic' tested.

Respond in valid JSON format:
{
  "questions": [
    {
      "id": "q1",
      "question": "Clear question text?",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correctAnswer": "Option A text",
      "explanation": "Clear explanation of why Option A is correct...",
      "topic": "Specific Concept",
      "difficulty": "${effectiveDifficulty}"
    }
  ]
}
Respond with JSON only.`;

    const raw = await callGemini(prompt);
    const parsed = parseJSONFromText(raw, null);

    let questions = [];
    if (parsed && Array.isArray(parsed.questions)) {
      questions = parsed.questions.map((q, idx) => ({
        _id: new mongoose.Types.ObjectId().toString(),
        question: q.question,
        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["A", "B", "C", "D"],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "Review the key concept.",
        topic: q.topic || subject,
        difficulty: q.difficulty || effectiveDifficulty,
      }));
    }

    if (questions.length === 0) {
      questions = [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          question: `What is a fundamental concept in ${subject}?`,
          options: ["Core Principle", "Random Option", "Irrelevant Fact", "None"],
          correctAnswer: "Core Principle",
          explanation: `This is an essential topic in ${subject}.`,
          topic: subject,
          difficulty: effectiveDifficulty,
        },
      ];
    }

    return res.status(200).json({
      success: true,
      difficulty: effectiveDifficulty,
      subject,
      totalQuestions: questions.length,
      questions,
    });
  } catch (error) {
    console.error("Generate quiz error:", error);
    return res.status(500).json({ success: false, message: "Could not generate practice quiz" });
  }
};

/**
 * POST /api/practice/quiz/submit
 * Submit quiz answers, update topic mastery and save mistakes
 */
const submitQuiz = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject = "General", answers = [], sessionId } = req.body || {};

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: "No answers provided" });
    }

    let correctCount = 0;
    const evaluatedResults = [];

    for (const item of answers) {
      const isCorrect =
        String(item.userAnswer || "").trim().toLowerCase() ===
        String(item.correctAnswer || "").trim().toLowerCase();

      if (isCorrect) correctCount += 1;

      // Update topic mastery and log mistakes
      await recordTopicAttempt({
        userId,
        subject: item.subject || subject,
        topic: item.topic || subject,
        isCorrect,
        question: item.question,
        options: item.options || [],
        studentAnswer: item.userAnswer || "",
        correctAnswer: item.correctAnswer || "",
        explanation: item.explanation || "",
        sourceMaterial: item.sourceMaterial || "",
      });

      evaluatedResults.push({
        questionId: item._id,
        question: item.question,
        userAnswer: item.userAnswer,
        correctAnswer: item.correctAnswer,
        isCorrect,
        explanation: item.explanation,
        topic: item.topic,
      });
    }

    const accuracy = Math.round((correctCount / answers.length) * 100);

    return res.status(200).json({
      success: true,
      totalQuestions: answers.length,
      correctCount,
      accuracy,
      results: evaluatedResults,
      message:
        accuracy >= 80
          ? "🎉 Outstanding work! You've mastered these concepts."
          : accuracy >= 50
          ? "👍 Good effort! Review your mistakes below to reach 100%."
          : "💪 Keep practicing! Added these questions to your Mistake Book for easy revision.",
    });
  } catch (error) {
    console.error("Submit quiz error:", error);
    return res.status(500).json({ success: false, message: "Could not record quiz submission" });
  }
};

/**
 * GET /api/practice/mistakes
 * Get student's mistake book
 */
const getMistakes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject } = req.query;

    const query = { userId };
    if (subject && subject !== "All") {
      query.subject = new RegExp(`^${subject}$`, "i");
    }

    const mistakes = await StudentMistake.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      count: mistakes.length,
      mistakes,
    });
  } catch (error) {
    console.error("Get mistakes error:", error);
    return res.status(500).json({ success: false, message: "Could not load mistake book" });
  }
};

/**
 * DELETE /api/practice/mistakes/:id
 * Remove or resolve mistake from Mistake Book
 */
const resolveMistake = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid mistake ID" });
    }

    await StudentMistake.findOneAndDelete({ _id: id, userId });

    return res.status(200).json({
      success: true,
      message: "Resolved and removed from Mistake Book!",
    });
  } catch (error) {
    console.error("Resolve mistake error:", error);
    return res.status(500).json({ success: false, message: "Could not update mistake" });
  }
};

/**
 * POST /api/practice/flashcards/generate
 * Generate flashcards
 */
const generateFlashcards = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject = "Science", topic = "Key Concepts", documentId } = req.body || {};
    const user = await User.findById(userId).lean();
    const classLevel = user?.classLevel || "Class 8";

    let context = "";
    if (documentId && mongoose.Types.ObjectId.isValid(documentId)) {
      const chunks = await DocumentChunk.find({ documentId, userId }).limit(8).lean();
      context = chunks.map((c) => c.content).join("\n\n");
    }

    const prompt = `Create 6 interactive flashcards for a **${classLevel}** student.
Subject: ${subject}
Topic: ${topic}

${context ? `Source context:\n${context.substring(0, 3000)}\n\n` : ""}

Format as JSON array:
{
  "flashcards": [
    {
      "id": "f1",
      "front": "Clear question or term (front of card)",
      "back": "Clear, concise definition or answer (back of card)",
      "topic": "${topic}"
    }
  ]
}
Respond with JSON only.`;

    const raw = await callGemini(prompt);
    const parsed = parseJSONFromText(raw, { flashcards: [] });

    return res.status(200).json({
      success: true,
      subject,
      topic,
      flashcards: parsed.flashcards || [],
    });
  } catch (error) {
    console.error("Generate flashcards error:", error);
    return res.status(500).json({ success: false, message: "Could not generate flashcards" });
  }
};

/**
 * POST /api/practice/flashcards/review
 * Record student grading on a flashcard
 */
const reviewFlashcard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject = "General", topic = "General", rating = "medium" } = req.body || {};

    const isCorrect = rating === "easy" || rating === "medium";
    await recordTopicAttempt({
      userId,
      subject,
      topic,
      isCorrect,
    });

    return res.status(200).json({ success: true, message: "Flashcard progress saved" });
  } catch (error) {
    console.error("Review flashcard error:", error);
    return res.status(500).json({ success: false, message: "Could not save progress" });
  }
};

/**
 * POST /api/practice/revision-notes
 * Generate and save quick revision notes, formula sheets, or definitions
 */
const generateRevisionNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      subject = "General",
      type = "notes", // 'notes' | 'formula_sheet' | 'definitions' | 'exam_points'
      documentId,
    } = req.body || {};

    const user = await User.findById(userId).lean();
    const classLevel = user?.classLevel || "Class 8";

    let context = "";
    if (documentId && mongoose.Types.ObjectId.isValid(documentId)) {
      const chunks = await DocumentChunk.find({ documentId, userId }).limit(10).lean();
      context = chunks.map((c) => c.content).join("\n\n");
    }

    const prompt = `You are SHS AI preparing a **${type.toUpperCase().replace("_", " ")}** for a **${classLevel}** student.
Subject: ${subject}
Title: ${title || `${subject} Revision`}

${context ? `### SOURCE MATERIAL:\n${context.substring(0, 4000)}\n\n` : ""}

Generate high quality revision material formatted in clean Markdown with headers, bullet points, and highlight boxes.

Respond in JSON:
{
  "title": "${title || `${subject} Revision`}",
  "content": "Full markdown content..."
}
Respond with JSON only.`;

    const raw = await callGemini(prompt);
    const parsed = parseJSONFromText(raw, {
      title: title || `${subject} Revision`,
      content: raw,
    });

    const savedRevision = await SavedRevision.create({
      userId,
      title: parsed.title || title || `${subject} Revision`,
      subject,
      type,
      content: parsed.content,
      sourceDocumentId: documentId || null,
    });

    return res.status(201).json({
      success: true,
      revision: savedRevision,
    });
  } catch (error) {
    console.error("Generate revision notes error:", error);
    return res.status(500).json({ success: false, message: "Could not generate revision notes" });
  }
};

/**
 * GET /api/practice/revision-notes
 * Get all saved revision notes
 */
const getRevisionNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const notes = await SavedRevision.find({ userId }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      notes,
    });
  } catch (error) {
    console.error("Get revision notes error:", error);
    return res.status(500).json({ success: false, message: "Could not load saved revision notes" });
  }
};

/**
 * DELETE /api/practice/revision-notes/:id
 */
const deleteRevisionNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await SavedRevision.findOneAndDelete({ _id: id, userId });
    return res.status(200).json({ success: true, message: "Deleted revision note" });
  } catch (error) {
    console.error("Delete revision note error:", error);
    return res.status(500).json({ success: false, message: "Could not delete revision note" });
  }
};

module.exports = {
  generateQuiz,
  submitQuiz,
  getMistakes,
  resolveMistake,
  generateFlashcards,
  reviewFlashcard,
  generateRevisionNotes,
  getRevisionNotes,
  deleteRevisionNote,
};
