const StudySession = require("../models/StudySession");
const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");
const Tesseract = require("tesseract.js");
const mammoth = require("mammoth");
const { callGemini, parseJSONArrayFromText } = require("../utils/gemini");
const { extractTextFromPdf } = require("../utils/pdf");

// ============ Configuration ============
const MAX_FILE_SIZE = Number(process.env.MAX_UPLOAD_SIZE_MB || 200) * 1024 * 1024;
const MAX_CONTENT_LENGTH = 100000;       // characters stored in DB
const MAX_PROMPT_LENGTH = 3000;          // characters sent to AI per call
const MAX_QUESTIONS = 15;                // upper limit for practice questions
const COMMON_TOPIC_WORDS = new Set([
  "about",
  "after",
  "again",
  "because",
  "before",
  "between",
  "could",
  "every",
  "following",
  "from",
  "have",
  "material",
  "should",
  "study",
  "their",
  "there",
  "these",
  "thing",
  "this",
  "through",
  "using",
  "where",
  "which",
  "while",
  "would",
]);

// ============ Helper: Clean AI JSON response ============
function extractJSONArray(text) {
  const parsed = parseJSONArrayFromText(text);
  if (parsed.length) return parsed;

  // Fallback: treat each line as an item (very basic)
  return String(text || "").split("\n").filter(line => line.trim()).map(l => l.replace(/^[,\s"']+|["',\s]+$/g, ""));
}

function respondError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function normalizeStoredUserId(userId) {
  return isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null;
}

// ============ CREATE STUDY SESSION ============
const createStudySession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { title, description, tags } = req.body;

    if (!userId) return respondError(res, 401, "Unauthorized");
    if (!title || !String(title).trim()) return respondError(res, 400, "Title is required");

    const studySession = new StudySession({
      userId,
      title: String(title).trim(),
      description: description ? String(description).trim() : "",
      tags: Array.isArray(tags) ? tags : [],
      status: "in-progress",
    });

    await studySession.save();
    res.status(201).json({ success: true, message: "Study session created", studySession });
  } catch (error) {
    console.error("Create session error:", error);
    respondError(res, 500, "Error creating study session");
  }
};

// ================== UPLOAD & PROCESS ==================
const uploadAndProcessMaterial = async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return respondError(res, 400, "No file uploaded");
    }

    const userId = req.user?.id;

    if (!userId) {
      return respondError(res, 401, "Unauthorized");
    }

    const normalizedUserId = normalizeStoredUserId(userId);
    if (!normalizedUserId) {
      return respondError(res, 400, "Invalid user id");
    }

    filePath = req.file.path;

    // File size validation
    if (req.file.size > MAX_FILE_SIZE) {
      await fs.unlink(filePath).catch(() => {});
      return respondError(
        res,
        400,
        `File size exceeds ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB limit`
      );
    }

    const { sessionId } = req.body;

    const fileName = req.file.originalname;
    const ext = path.extname(fileName).toLowerCase();

    // ================== ALLOWED FILES ==================
    const allowedExt = [
      ".txt",
      ".md",
      ".json",
      ".js",
      ".html",
      ".css",
      ".csv",
      ".xml",
      ".log",
      ".pdf",
      ".doc",
      ".docx",
      ".ppt",
      ".pptx",
      ".xls",
      ".xlsx",
      ".odt",
      ".ods",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".svg",
      ".zip",
      ".rar",
      ".7z",
      ".mp3",
      ".mp4",
      ".mov",
      ".avi",
      ".wav",
    ];

    if (!allowedExt.includes(ext) && ext) {
      await fs.unlink(filePath).catch(() => {});
      return respondError(res, 400, "Unsupported file type");
    }

    // ================== EXTRACT CONTENT ==================
    let fileContent = "";

    // ---------- TEXT FILES ----------
    const textExtensions = [
      ".txt",
      ".md",
      ".json",
      ".js",
      ".html",
      ".css",
      ".csv",
      ".xml",
      ".log",
    ];

    if (textExtensions.includes(ext)) {
      fileContent = await fs.readFile(filePath, "utf-8");
    }

    // ---------- PDF ----------
    else if (ext === ".pdf") {
      const pdfBuffer = await fs.readFile(filePath);
      fileContent = await extractTextFromPdf(pdfBuffer);
    }

    // ---------- IMAGE OCR ----------
    else if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
      try {
        const result = await Tesseract.recognize(filePath, "eng");
        fileContent = result.data.text || "";
      } catch (ocrError) {
        console.warn("OCR failed for image upload:", ocrError.message);
        fileContent = `Image uploaded: ${fileName}`;
      }
    }

    // ---------- DOCX ----------
    else if (ext === ".docx") {
      try {
        const docxData = await mammoth.extractRawText({ path: filePath });
        fileContent = docxData.value || "";
      } catch (docxError) {
        console.warn("DOCX extraction failed:", docxError.message);
        fileContent = `Document uploaded: ${fileName}`;
      }
    }

    // ---------- OTHER FILE TYPES ----------
    else {
      fileContent = `Uploaded file: ${fileName}`;
    }

    // Fallback
    if (!fileContent || fileContent.trim() === "") {
      fileContent = `No readable text extracted from ${fileName}`;
    }

    if (typeof fileContent !== "string") {
      fileContent = String(fileContent || "");
    }

    // ================== STORE CONTENT ==================
    const storedContent = fileContent.substring(0, MAX_CONTENT_LENGTH);

    const preview = fileContent.substring(0, 2000);

    // ================== EXTRACT TOPICS ==================
    const topics = extractTopics(preview, fileName);

    let studySession;

    const hasValidSessionId = sessionId && mongoose.Types.ObjectId.isValid(sessionId);

    if (hasValidSessionId) {
      studySession = await StudySession.findOneAndUpdate(
        { _id: sessionId, userId: normalizedUserId },
        {
          uploadedFile: {
            fileName,
            originalName: fileName,
            uploadDate: new Date(),
            fileType: ext.substring(1),
            size: req.file.size,
          },

          content: {
            rawText: storedContent,
            extractedTopics: topics,
          },

          summary: undefined,
          practiceQuestions: [],

          learningPath: {
            steps: [],
            currentStep: 0,
            progress: 0,
            completedSteps: [],
            updatedAt: new Date(),
          },

          progress: {
            questionsAnswered: 0,
            correctAnswers: 0,
            accuracy: 0,
            lastActivityAt: new Date(),
          },

          status: "in-progress",
        },
        { returnDocument: "after"}
      );

      if (!studySession) {
        await fs.unlink(filePath).catch(() => {});
        return respondError(res, 404, "Study session not found");
      }
    } else {
      const sessionTitle = fileName.replace(/\.[^/.]+$/, "");

      studySession = new StudySession({
        userId: normalizedUserId,

        title: sessionTitle,

        uploadedFile: {
          fileName,
          originalName: fileName,
          uploadDate: new Date(),
          fileType: ext.substring(1),
          size: req.file.size,
        },

        content: {
          rawText: storedContent,
          extractedTopics: topics,
        },

        status: "in-progress",
      });

      await studySession.save();
    }

    // ================== CLEANUP ==================
    await fs.unlink(filePath).catch((err) => {
      console.error("File deletion error:", err);
    });

    return res.json({
      success: true,
      message: "Material processed successfully",
      studySession,
      topics,
    });
  } catch (error) {
    console.error("Upload error:", error);

    if (filePath) {
      await fs.unlink(filePath).catch(() => {});
    }

    return respondError(res, 500, "Error uploading material");
  }
};

// ================== TOPIC EXTRACTION ==================
function extractTopics(content, fileName) {
  const fallbackTitle = path.basename(fileName, path.extname(fileName)).replace(/[-_]+/g, " ");
  const words = String(content || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4 && !COMMON_TOPIC_WORDS.has(word));

  const counts = new Map();
  words.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));

  const topics = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

  return topics.length ? topics : [fallbackTitle || "Study Material"];
}

// ============ GENERATE SUMMARY ============
const generateSummary = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    if (!userId) return respondError(res, 401, "Unauthorized");
    if (!isValidObjectId(sessionId)) return respondError(res, 400, "Invalid session id");

    const studySession = await StudySession.findOne({ _id: sessionId, userId });
    if (!studySession || !studySession.content?.rawText) {
      return respondError(res, 404, "Study session or content not found");
    }

    const summaryText = await generateSummaryAI(studySession.content.rawText);
    const keyPoints = await extractKeyPoints(studySession.content.rawText);

    studySession.summary = {
      aiGenerated: summaryText,
      keyPoints,
      generatedAt: new Date(),
    };
    await studySession.save();

    res.json({ success: true, message: "Summary generated", summary: studySession.summary });
  } catch (error) {
    console.error("Summary error:", error);
    respondError(res, 500, "Error generating summary");
  }
};

async function generateSummaryAI(content) {
  const prompt = `Create a comprehensive yet concise summary of the following material.
    The summary should be clear, well‑organized, and suitable for a beginner.
    Content: ${content.substring(0, MAX_PROMPT_LENGTH)}
    Provide a 3‑4 paragraph summary.`;
  try {
    return await callGemini(prompt);
  } catch (error) {
    return createFallbackSummary(content);
  }
}

async function extractKeyPoints(content) {
  const prompt = `Extract the 5‑10 most important key points from this material.
    Content: ${content.substring(0, MAX_PROMPT_LENGTH)}
    Return as JSON array of strings. Example: ["Point 1", "Point 2"]
    Return ONLY the JSON array.`;
  try {
    const response = await callGemini(prompt);
    const points = extractJSONArray(response);
    return Array.isArray(points) ? points : [];
  } catch (error) {
    return createFallbackKeyPoints(content);
  }
}

// ============ GENERATE PRACTICE QUESTIONS ============
const generatePracticeQuestions = async (req, res) => {
  try {
    const { sessionId } = req.params;
    let { numQuestions = 5, difficulty = "intermediate" } = req.body;
    const userId = req.user?.id;

    if (!userId) return respondError(res, 401, "Unauthorized");
    if (!isValidObjectId(sessionId)) return respondError(res, 400, "Invalid session id");
    numQuestions = Math.min(parseInt(numQuestions) || 5, MAX_QUESTIONS);
    const validDifficulties = ["beginner", "intermediate", "advanced"];
    if (!validDifficulties.includes(difficulty)) difficulty = "intermediate";

    const studySession = await StudySession.findOne({ _id: sessionId, userId });
    if (!studySession || !studySession.content?.rawText) {
      return respondError(res, 404, "Study session or content not found");
    }

    let newQuestions = await generateQuestionsAI(
      studySession.content.rawText,
      numQuestions,
      difficulty,
      studySession.content.extractedTopics || []
    );
    if (!newQuestions.length) {
      newQuestions = generateFallbackQuestions(studySession.content.rawText, numQuestions, difficulty);
    }

    // Append new questions (avoid duplicates by question text? optional)
    studySession.practiceQuestions.push(...newQuestions);
    await studySession.save();

    res.json({
      success: true,
      message: "Practice questions generated",
      questions: newQuestions,
      allQuestions: studySession.practiceQuestions,
      totalQuestions: studySession.practiceQuestions.length,
    });
  } catch (error) {
    console.error("Generate questions error:", error);
    respondError(res, 500, "Error generating questions");
  }
};

async function generateQuestionsAI(content, numQuestions, difficulty, topics) {
  try {
    const prompt = `Generate ${numQuestions} multiple choice practice questions for the following material.
    Difficulty level: ${difficulty}
    Topics: ${topics.join(", ")}
    Content: ${content.substring(0, MAX_PROMPT_LENGTH)}
    
    For each question, provide:
    - question (string)
    - options (array of 4 strings)
    - correctAnswer (string, e.g., "A")
    - explanation (string)
    - topic (string)
    - difficulty (string)
    
    Format as JSON array of objects. Return ONLY valid JSON array.`;
    const response = await callGemini(prompt);
    const parsed = extractJSONArray(response);
    if (!Array.isArray(parsed)) return [];

    return parsed.map(q => {
      const options = Array.isArray(q.options) ? q.options.slice(0, 4) : [];
      const correctAnswer = normalizeCorrectAnswer(q.correctAnswer, options);
      return {
        _id: new mongoose.Types.ObjectId(),
        question: q.question || "Missing question",
        options: options.length ? options : ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer,
        explanation: q.explanation || "",
        difficulty: q.difficulty || difficulty,
        topic: q.topic || "General",
      };
    });
  } catch (error) {
    return [];
  }
}

// ============ GENERATE ADAPTIVE LEARNING PATH ============
const generateLearningPath = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    if (!userId) return respondError(res, 401, "Unauthorized");
    if (!isValidObjectId(sessionId)) return respondError(res, 400, "Invalid session id");

    const studySession = await StudySession.findOne({ _id: sessionId, userId });
    if (!studySession || !studySession.content?.rawText) {
      return respondError(res, 404, "Study session or content not found");
    }

    let learningPath = await generateLearningPathAI(
      studySession.content.rawText,
      studySession.content.extractedTopics || []
    );
    if (!learningPath.steps.length) {
      learningPath = generateFallbackLearningPath(studySession.content.rawText, studySession.content.extractedTopics || []);
    }
    studySession.learningPath = learningPath;
    await studySession.save();

    res.json({ success: true, message: "Learning path generated", learningPath });
  } catch (error) {
    console.error("Learning path error:", error);
    respondError(res, 500, "Error generating learning path");
  }
};

async function generateLearningPathAI(content, topics) {
  try {
    const prompt = `Create an adaptive learning path for mastering the following topics: ${topics.join(", ")}
    Content: ${content.substring(0, MAX_PROMPT_LENGTH)}
    Generate 5‑7 progressive learning steps.
    For each step provide: title, description, estimated duration (minutes), learning objectives (array), recommended resources (array).
    Format as JSON array of objects with keys: title, description, duration, objectives, resources.
    Return ONLY valid JSON array.`;
    const response = await callGemini(prompt);
    const stepsArray = extractJSONArray(response);
    if (!Array.isArray(stepsArray)) {
      return { steps: [], currentStep: 0, progress: 0, completedSteps: [], updatedAt: new Date() };
    }
    const steps = stepsArray.map((s, idx) => ({
      step: idx + 1,
      title: s.title || "",
      description: s.description || "",
      duration: s.duration || 30,
      resources: s.resources || [],
      objectives: s.objectives || [],
    }));
    return {
      steps,
      currentStep: 0,
      progress: 0,
      completedSteps: [],
      updatedAt: new Date(),
    };
  } catch (error) {
    return { steps: [], currentStep: 0, progress: 0, completedSteps: [], updatedAt: new Date() };
  }
}

function createFallbackSummary(content) {
  const text = content.replace(/\s+/g, " ").trim();
  if (!text) return "No readable text was available to summarize.";
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, 4).join(" ").substring(0, 1200);
}

function createFallbackKeyPoints(content) {
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4);
  const counts = new Map();
  words.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  const topics = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => `Review key concept: ${word}`);
  return topics.length ? topics : ["Review the uploaded material", "Identify key definitions", "Practice applying the concepts"];
}

function normalizeCorrectAnswer(correctAnswer, options) {
  const answer = String(correctAnswer || "").trim();
  const letterIndex = /^[A-D]$/i.test(answer) ? answer.toUpperCase().charCodeAt(0) - 65 : -1;
  if (letterIndex >= 0 && options[letterIndex]) {
    return options[letterIndex];
  }
  return answer;
}

function generateFallbackQuestions(content, numQuestions, difficulty) {
  const keyPoints = createFallbackKeyPoints(content);
  return keyPoints.slice(0, numQuestions).map((point, index) => {
    const correct = point.replace(/^Review key concept:\s*/i, "");
    return {
      _id: new mongoose.Types.ObjectId(),
      question: `Which topic should you review from this material? (${index + 1})`,
      options: [correct, "Unrelated topic", "Skip the material", "None of the above"],
      correctAnswer: correct,
      explanation: `This concept appears prominently in the uploaded material.`,
      difficulty,
      topic: correct,
    };
  });
}

function generateFallbackLearningPath(content, topics) {
  const selectedTopics = topics.length ? topics.slice(0, 5) : createFallbackKeyPoints(content).map((item) => item.replace(/^Review key concept:\s*/i, ""));
  return {
    steps: selectedTopics.map((topic, index) => ({
      step: index + 1,
      title: `Review ${topic}`,
      description: `Study the uploaded material section related to ${topic}, then write a short explanation in your own words.`,
      duration: 30,
      resources: ["Uploaded study material"],
      objectives: [`Understand ${topic}`, "Practice recall", "Apply the concept to one example"],
    })),
    currentStep: 0,
    progress: 0,
    completedSteps: [],
    updatedAt: new Date(),
  };
}

// ============ SUBMIT QUIZ ANSWER ============
// ============ SUBMIT QUIZ ANSWER ============
const submitQuizAnswer = async (req, res) => {
  try {
    const { sessionId, questionId, userAnswer } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return respondError(res, 401, "Unauthorized");
    }

    if (!sessionId || !questionId || userAnswer === undefined || userAnswer === null) {
      return respondError(res, 400, "sessionId, questionId, and userAnswer are required");
    }

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return respondError(res, 400, "Invalid sessionId");
    }

    const studySession = await StudySession.findOne({
      _id: sessionId,
      userId,
    });

    if (!studySession) {
      return respondError(res, 404, "Study session not found");
    }

    if (
      !studySession.practiceQuestions ||
      !Array.isArray(studySession.practiceQuestions)
    ) {
      return respondError(res, 404, "No practice questions found in this study session");
    }

    const question = studySession.practiceQuestions.find(
      (q) => q._id && q._id.toString() === questionId.toString()
    );

    if (!question) {
      return respondError(res, 404, "Question not found");
    }

    const previousUserAnswer = question.userAnswer;
    const previousIsCorrect = question.isCorrect;
    let selectedAnswer = String(userAnswer).trim();

    // If frontend sends an option index such as 0, 1, 2, 3
    if (
      question.options &&
      Array.isArray(question.options) &&
      /^[0-3]$/.test(selectedAnswer)
    ) {
      const index = Number(selectedAnswer);

      if (question.options[index] !== undefined) {
        selectedAnswer = String(question.options[index]).trim();
      }
    }

    let correctAnswer = String(question.correctAnswer || "").trim();

    // If correctAnswer is A/B/C/D, convert it to the actual option
    if (
      question.options &&
      Array.isArray(question.options) &&
      /^[A-D]$/i.test(correctAnswer)
    ) {
      const letterIndex = correctAnswer.toUpperCase().charCodeAt(0) - 65;

      if (question.options[letterIndex] !== undefined) {
        correctAnswer = String(question.options[letterIndex]).trim();
      }
    }

    const normalizedSelectedAnswer = selectedAnswer.toLowerCase();
    const normalizedCorrectAnswer = correctAnswer.toLowerCase();

    const isCorrect = normalizedSelectedAnswer === normalizedCorrectAnswer;

    if (!studySession.progress) {
      studySession.progress = {
        questionsAnswered: 0,
        correctAnswers: 0,
        accuracy: 0,
        lastActivityAt: new Date(),
      };
    }

    const wasPreviouslyAnswered = Boolean(previousUserAnswer);
    if (!wasPreviouslyAnswered) {
      studySession.progress.questionsAnswered += 1;
      if (isCorrect) {
        studySession.progress.correctAnswers += 1;
      }
    } else if (previousIsCorrect !== isCorrect) {
      if (previousIsCorrect && studySession.progress.correctAnswers > 0) {
        studySession.progress.correctAnswers -= 1;
      }
      if (isCorrect) {
        studySession.progress.correctAnswers += 1;
      }
    }

    question.userAnswer = selectedAnswer;
    question.isCorrect = isCorrect;
    question.attemptedAt = new Date();

    studySession.progress.accuracy =
      studySession.progress.questionsAnswered > 0
        ? (studySession.progress.correctAnswers /
            studySession.progress.questionsAnswered) *
          100
        : 0;

    studySession.progress.lastActivityAt = new Date();

    await studySession.save();

    return res.json({
      success: true,
      isCorrect,
      explanation: question.explanation || "",
      correctAnswer: question.correctAnswer || "",
      progress: studySession.progress,
    });
  } catch (error) {
    console.error("Submit answer error:", error);
    return respondError(res, 500, "Error submitting answer");
  }
};

// ============ UPDATE LEARNING PATH PROGRESS ============
const updateLearningPathProgress = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { stepNumber } = req.body;
    const userId = req.user?.id;
    if (!userId) return respondError(res, 401, "Unauthorized");
    if (!sessionId || stepNumber === undefined) {
      return respondError(res, 400, "Missing required fields");
    }
    if (!isValidObjectId(sessionId)) return respondError(res, 400, "Invalid session id");

    const studySession = await StudySession.findOne({ _id: sessionId, userId });
    if (!studySession) return respondError(res, 404, "Study session not found");

    const totalSteps = studySession.learningPath.steps.length;
    if (stepNumber < 1 || stepNumber > totalSteps) {
      return respondError(res, 400, "Invalid step number");
    }

    if (!studySession.learningPath.completedSteps.includes(stepNumber)) {
      studySession.learningPath.completedSteps.push(stepNumber);
    }
    studySession.learningPath.currentStep = stepNumber;
    studySession.learningPath.progress = totalSteps > 0 ? (studySession.learningPath.completedSteps.length / totalSteps) * 100 : 0;
    studySession.learningPath.updatedAt = new Date();
    await studySession.save();

    res.json({ success: true, message: "Progress updated", learningPath: studySession.learningPath });
  } catch (error) {
    console.error("Update progress error:", error);
    respondError(res, 500, "Error updating progress");
  }
};

// ============ GET STUDY SESSION (single) ============
const getStudySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    if (!userId) return respondError(res, 401, "Unauthorized");
    if (!isValidObjectId(sessionId)) return respondError(res, 400, "Invalid session id");

    const studySession = await StudySession.findOne({ _id: sessionId, userId });
    if (!studySession) return respondError(res, 404, "Study session not found");

    res.json({ success: true, studySession });
  } catch (error) {
    console.error("Fetch session error:", error);
    respondError(res, 500, "Error fetching session");
  }
};

// ============ GET ALL STUDY SESSIONS ============
const getAllStudySessions = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return respondError(res, 401, "Unauthorized");

    const sessions = await StudySession.find({ userId })
      .select("title description status uploadedFile.originalName content.extractedTopics progress learningPath createdAt")
      .sort({ createdAt: -1 });

    res.json({ success: true, sessions, totalSessions: sessions.length });
  } catch (error) {
    console.error("Fetch all sessions error:", error);
    respondError(res, 500, "Error fetching sessions");
  }
};

module.exports = {
  createStudySession,
  uploadAndProcessMaterial,
  generateSummary,
  generatePracticeQuestions,
  generateLearningPath,
  submitQuizAnswer,
  updateLearningPathProgress,
  getStudySession,
  getAllStudySessions,
};
