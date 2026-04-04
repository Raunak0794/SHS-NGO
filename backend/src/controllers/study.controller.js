const StudySession = require("../models/StudySession");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");
const fs = require("fs").promises; // Use promises for better cleanup
const path = require("path");

// ============ Configuration ============
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro"; // valid model
const MAX_CONTENT_LENGTH = 10000;        // characters stored in DB
const MAX_PROMPT_LENGTH = 3000;          // characters sent to AI per call
const MAX_QUESTIONS = 15;                // upper limit for practice questions

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ============ Helper: Clean AI JSON response ============
function extractJSONArray(text) {
  // Remove markdown code fences
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  // Find the first '[' and last ']'
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.substring(start, end + 1));
    } catch (e) {
      console.warn("JSON parse failed, falling back to line split");
    }
  }
  // Fallback: treat each line as an item (very basic)
  return cleaned.split("\n").filter(line => line.trim()).map(l => l.replace(/^[,\s"']+|["',\s]+$/g, ""));
}

// ============ Helper: Safe AI call with error handling ============
async function callGemini(prompt, schemaHint = "json") {
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error(`AI service failed: ${error.message}`);
  }
}

// ============ CREATE STUDY SESSION ============
const createStudySession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { title, description, tags } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!title) return res.status(400).json({ error: "Title is required" });

    const studySession = new StudySession({
      userId,
      title,
      description,
      tags: tags || [],
      status: "in-progress",
    });

    await studySession.save();
    res.status(201).json({ success: true, message: "Study session created", studySession });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({ message: "Error creating study session", error: error.message });
  }
};

// ============ UPLOAD & PROCESS MATERIAL ============
const uploadAndProcessMaterial = async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { sessionId } = req.body;
    filePath = req.file.path;
    const fileName = req.file.originalname;
    const ext = path.extname(fileName).toLowerCase();
    const allowedExt = [".txt", ".md", ".json", ".js", ".html", ".css", ".csv", ".xml", ".log"];
    if (!allowedExt.includes(ext)) {
      await fs.unlink(filePath).catch(() => {});
      return res.status(400).json({ error: "Unsupported file type. Please upload a text‑based file." });
    }

    // Read file content
    let fileContent = await fs.readFile(filePath, "utf-8");
    // Trim to avoid excessive storage
    const storedContent = fileContent.substring(0, MAX_CONTENT_LENGTH);
    // For topic extraction, use a preview (first 2000 chars)
    const preview = fileContent.substring(0, 2000);

    // Extract topics using Gemini
    const topics = await extractTopics(preview, fileName);

    let studySession;
    if (sessionId) {
      // Replace content and reset derived data (summary, questions, learning path)
      studySession = await StudySession.findOneAndUpdate(
        { _id: sessionId, userId },
        {
          uploadedFile: {
            fileName,
            originalName: fileName,
            uploadDate: new Date(),
            fileType: ext.substring(1),
          },
          content: {
            rawText: storedContent,
            extractedTopics: topics,
          },
          // Reset AI‑generated fields to avoid inconsistency
          summary: undefined,
          practiceQuestions: [],
          learningPath: { steps: [], currentStep: 0, progress: 0, completedSteps: [], updatedAt: new Date() },
          progress: { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, lastActivityAt: new Date() },
          status: "in-progress",
        },
        { new: true }
      );
      if (!studySession) {
        await fs.unlink(filePath).catch(() => {});
        return res.status(404).json({ error: "Study session not found" });
      }
    } else {
      const sessionTitle = fileName.replace(/\.[^/.]+$/, "");
      studySession = new StudySession({
        userId,
        title: sessionTitle,
        uploadedFile: {
          fileName,
          originalName: fileName,
          uploadDate: new Date(),
          fileType: ext.substring(1),
        },
        content: {
          rawText: storedContent,
          extractedTopics: topics,
        },
        status: "in-progress",
      });
      await studySession.save();
    }

    // Clean up uploaded file
    await fs.unlink(filePath).catch(err => console.error("File deletion error:", err));

    res.json({ success: true, message: "Material processed", studySession, topics });
  } catch (error) {
    console.error("Upload error:", error);
    if (filePath) await fs.unlink(filePath).catch(() => {});
    res.status(500).json({ message: "Error uploading material", error: error.message });
  }
};

async function extractTopics(content, fileName) {
  try {
    const prompt = `Analyze this study material and extract the main topics/concepts covered.
    File: ${fileName}
    Content: ${content}
    
    Provide a JSON array of main topics (max 10). Example: ["Topic 1", "Topic 2"]
    Return ONLY the JSON array, no other text.`;
    const responseText = await callGemini(prompt);
    const parsed = extractJSONArray(responseText);
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch (error) {
    console.error("Topic extraction error:", error);
    return [];
  }
}

// ============ GENERATE SUMMARY ============
const generateSummary = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const studySession = await StudySession.findOne({ _id: sessionId, userId });
    if (!studySession || !studySession.content?.rawText) {
      return res.status(404).json({ message: "Study session or content not found" });
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
    res.status(500).json({ message: "Error generating summary", error: error.message });
  }
};

async function generateSummaryAI(content) {
  const prompt = `Create a comprehensive yet concise summary of the following material.
    The summary should be clear, well‑organized, and suitable for a beginner.
    Content: ${content.substring(0, MAX_PROMPT_LENGTH)}
    Provide a 3‑4 paragraph summary.`;
  return await callGemini(prompt);
}

async function extractKeyPoints(content) {
  const prompt = `Extract the 5‑10 most important key points from this material.
    Content: ${content.substring(0, MAX_PROMPT_LENGTH)}
    Return as JSON array of strings. Example: ["Point 1", "Point 2"]
    Return ONLY the JSON array.`;
  const response = await callGemini(prompt);
  const points = extractJSONArray(response);
  return Array.isArray(points) ? points : [];
}

// ============ GENERATE PRACTICE QUESTIONS ============
const generatePracticeQuestions = async (req, res) => {
  try {
    const { sessionId } = req.params;
    let { numQuestions = 5, difficulty = "intermediate" } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    numQuestions = Math.min(parseInt(numQuestions) || 5, MAX_QUESTIONS);
    const validDifficulties = ["beginner", "intermediate", "advanced"];
    if (!validDifficulties.includes(difficulty)) difficulty = "intermediate";

    const studySession = await StudySession.findOne({ _id: sessionId, userId });
    if (!studySession || !studySession.content?.rawText) {
      return res.status(404).json({ message: "Study session or content not found" });
    }

    const newQuestions = await generateQuestionsAI(
      studySession.content.rawText,
      numQuestions,
      difficulty,
      studySession.content.extractedTopics || []
    );

    // Append new questions (avoid duplicates by question text? optional)
    studySession.practiceQuestions.push(...newQuestions);
    await studySession.save();

    res.json({ success: true, message: "Practice questions generated", questions: newQuestions, totalQuestions: studySession.practiceQuestions.length });
  } catch (error) {
    console.error("Generate questions error:", error);
    res.status(500).json({ message: "Error generating questions", error: error.message });
  }
};

async function generateQuestionsAI(content, numQuestions, difficulty, topics) {
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

  return parsed.map(q => ({
    _id: new mongoose.Types.ObjectId(),
    question: q.question || "Missing question",
    options: q.options || [],
    correctAnswer: q.correctAnswer || "",
    explanation: q.explanation || "",
    difficulty: q.difficulty || difficulty,
    topic: q.topic || "General",
  }));
}

// ============ GENERATE ADAPTIVE LEARNING PATH ============
const generateLearningPath = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const studySession = await StudySession.findOne({ _id: sessionId, userId });
    if (!studySession || !studySession.content?.rawText) {
      return res.status(404).json({ message: "Study session or content not found" });
    }

    const learningPath = await generateLearningPathAI(
      studySession.content.rawText,
      studySession.content.extractedTopics || []
    );
    studySession.learningPath = learningPath;
    await studySession.save();

    res.json({ success: true, message: "Learning path generated", learningPath });
  } catch (error) {
    console.error("Learning path error:", error);
    res.status(500).json({ message: "Error generating learning path", error: error.message });
  }
};

async function generateLearningPathAI(content, topics) {
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
}

// ============ SUBMIT QUIZ ANSWER ============
const submitQuizAnswer = async (req, res) => {
  try {
    const { sessionId, questionId, userAnswer } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!sessionId || !questionId || userAnswer == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const studySession = await StudySession.findOne({ _id: sessionId, userId });
    if (!studySession) return res.status(404).json({ message: "Study session not found" });

    const question = studySession.practiceQuestions.find(q => q._id.toString() === questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    const isCorrect = userAnswer.trim().toLowerCase() === (question.correctAnswer || "").trim().toLowerCase();

    question.userAnswer = userAnswer;
    question.isCorrect = isCorrect;
    question.attemptedAt = new Date();

    // Initialize progress if missing
    if (!studySession.progress) {
      studySession.progress = { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, lastActivityAt: new Date() };
    }
    studySession.progress.questionsAnswered += 1;
    if (isCorrect) studySession.progress.correctAnswers += 1;
    studySession.progress.accuracy = (studySession.progress.correctAnswers / studySession.progress.questionsAnswered) * 100;
    studySession.progress.lastActivityAt = new Date();

    await studySession.save();

    res.json({
      success: true,
      isCorrect,
      explanation: question.explanation,
      correctAnswer: question.correctAnswer,
      progress: studySession.progress,
    });
  } catch (error) {
    console.error("Submit answer error:", error);
    res.status(500).json({ message: "Error submitting answer", error: error.message });
  }
};

// ============ UPDATE LEARNING PATH PROGRESS ============
const updateLearningPathProgress = async (req, res) => {
  try {
    const { sessionId, stepNumber } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!sessionId || stepNumber === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const studySession = await StudySession.findOne({ _id: sessionId, userId });
    if (!studySession) return res.status(404).json({ message: "Study session not found" });

    const totalSteps = studySession.learningPath.steps.length;
    if (stepNumber < 1 || stepNumber > totalSteps) {
      return res.status(400).json({ error: "Invalid step number" });
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
    res.status(500).json({ message: "Error updating progress", error: error.message });
  }
};

// ============ GET STUDY SESSION (single) ============
const getStudySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const studySession = await StudySession.findOne({ _id: sessionId, userId });
    if (!studySession) return res.status(404).json({ message: "Study session not found" });

    res.json({ success: true, studySession });
  } catch (error) {
    console.error("Fetch session error:", error);
    res.status(500).json({ message: "Error fetching session", error: error.message });
  }
};

// ============ GET ALL STUDY SESSIONS ============
const getAllStudySessions = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const sessions = await StudySession.find({ userId })
      .select("title description status uploadedFile.originalName content.extractedTopics progress learningPath createdAt")
      .sort({ createdAt: -1 });

    res.json({ success: true, sessions, totalSessions: sessions.length });
  } catch (error) {
    console.error("Fetch all sessions error:", error);
    res.status(500).json({ message: "Error fetching sessions", error: error.message });
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