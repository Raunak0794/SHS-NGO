const StudySession = require("../models/StudySession");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ============ CREATE STUDY SESSION ============ */
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

    res.status(201).json({
      success: true,
      message: "Study session created successfully",
      studySession,
    });
  } catch (error) {
    console.error("Error creating study session:", error);
    res.status(500).json({
      message: "Error creating study session",
      error: error.message,
    });
  }
};

/* ============ UPLOAD & PROCESS MATERIAL ============ */
const uploadAndProcessMaterial = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { sessionId } = req.body;
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileType = path.extname(fileName).substring(1);

    // Read file content safely
    let fileContent = "";
    const ext = path.extname(fileName).toLowerCase();
    if (["txt", "md", "json", "js", "html", "css", "csv"].includes(ext)) {
      fileContent = fs.readFileSync(filePath, "utf-8");
    } else {
      // For binary files, just store metadata
      fileContent = `[Binary file: ${fileName}]`;
    }

    // Extract topics using Gemini
    const topics = await extractTopics(fileContent, fileName);

    // Create or update study session
    let studySession;

    if (sessionId) {
      studySession = await StudySession.findOneAndUpdate(
        { _id: sessionId, userId },
        {
          uploadedFile: {
            fileName,
            originalName: fileName,
            uploadDate: new Date(),
            fileType,
          },
          content: {
            rawText: fileContent.substring(0, 10000), // limit size
            extractedTopics: topics,
          },
          status: "in-progress",
        },
        { new: true }
      );
      if (!studySession) {
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
          fileType,
        },
        content: {
          rawText: fileContent.substring(0, 10000),
          extractedTopics: topics,
        },
        status: "in-progress",
      });
      await studySession.save();
    }

    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error("File deletion error:", err);
    });

    res.json({
      success: true,
      message: "Material processed successfully",
      studySession,
      topics,
    });
  } catch (error) {
    console.error("Error uploading material:", error);
    res.status(500).json({
      message: "Error uploading material",
      error: error.message,
    });
  }
};

/* ============ EXTRACT TOPICS ============ */
async function extractTopics(content, fileName) {
  try {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Analyze this study material and extract the main topics/concepts covered. 
    File: ${fileName}
    Content: ${content.substring(0, 2000)}...
    
    Provide a JSON array of main topics (max 10). Example: ["Topic 1", "Topic 2"]
    Return ONLY the JSON array, no other text.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text(); // safer than accessing candidates directly

    try {
      const parsed = JSON.parse(responseText);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Fallback: split by commas
      return responseText.split(",").map((t) => t.trim()).filter(Boolean);
    }
  } catch (error) {
    console.error("Error extracting topics:", error);
    return [];
  }
}

/* ============ GENERATE SUMMARY ============ */
const generateSummary = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const studySession = await StudySession.findOne({
      _id: sessionId,
      userId,
    });

    if (!studySession || !studySession.content?.rawText) {
      return res.status(404).json({
        message: "Study session or content not found",
      });
    }

    const summary = await generateSummaryAI(studySession.content.rawText);
    const keyPoints = await extractKeyPoints(studySession.content.rawText);

    studySession.summary = {
      aiGenerated: summary,
      keyPoints,
      generatedAt: new Date(),
    };

    await studySession.save();

    res.json({
      success: true,
      message: "Summary generated successfully",
      summary: studySession.summary,
    });
  } catch (error) {
    console.error("Error generating summary:", error);
    res.status(500).json({
      message: "Error generating summary",
      error: error.message,
    });
  }
};

async function generateSummaryAI(content) {
  try {
   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Create a comprehensive yet concise summary of the following material. 
    The summary should be clear, well-organized, and suitable for someone learning this topic for the first time.
    
    Content: ${content.substring(0, 3000)}
    
    Provide a 3-4 paragraph summary that covers the main concepts.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error in generateSummaryAI:", error);
    throw error;
  }
}

async function extractKeyPoints(content) {
  try {
   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Extract the 5-10 most important key points from this material.
    
    Content: ${content.substring(0, 2000)}
    
    Return as JSON array of strings. Example: ["Point 1", "Point 2"]
    Return ONLY the JSON array.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    try {
      return JSON.parse(responseText);
    } catch {
      return responseText.split("\n").filter((p) => p.trim());
    }
  } catch (error) {
    console.error("Error extracting key points:", error);
    return [];
  }
}

/* ============ GENERATE PRACTICE QUESTIONS ============ */
const generatePracticeQuestions = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { numQuestions = 5, difficulty = "intermediate" } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const studySession = await StudySession.findOne({
      _id: sessionId,
      userId,
    });

    if (!studySession || !studySession.content?.rawText) {
      return res.status(404).json({
        message: "Study session or content not found",
      });
    }

    const questions = await generateQuestionsAI(
      studySession.content.rawText,
      numQuestions,
      difficulty,
      studySession.content.extractedTopics || []
    );

    studySession.practiceQuestions = [
      ...studySession.practiceQuestions,
      ...questions,
    ];
    await studySession.save();

    res.json({
      success: true,
      message: "Practice questions generated",
      questions,
      totalQuestions: studySession.practiceQuestions.length,
    });
  } catch (error) {
    console.error("Error generating questions:", error);
    res.status(500).json({
      message: "Error generating questions",
      error: error.message,
    });
  }
};

async function generateQuestionsAI(content, numQuestions, difficulty, topics) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Generate ${numQuestions} multiple choice practice questions for the following material.
    Difficulty level: ${difficulty}
    Topics: ${topics.join(", ")}
    
    Content: ${content.substring(0, 3000)}
    
    For each question, provide:
    1. A clear question
    2. 4 multiple choice options (A, B, C, D)
    3. The correct answer (A/B/C/D)
    4. A brief explanation
    5. The topic it covers
    
    Format as JSON array with objects having: { question, options, correctAnswer, explanation, topic, difficulty }
    Return ONLY valid JSON array, no other text.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    try {
      const questions = JSON.parse(responseText);
      return questions.map((q) => ({
        _id: new mongoose.Types.ObjectId(),
        question: q.question,
        options: q.options || q.choices || [],
        correctAnswer: q.correctAnswer || q.correct_answer || "",
        explanation: q.explanation || "",
        difficulty: q.difficulty || difficulty,
        topic: q.topic || "General",
      }));
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return [];
    }
  } catch (error) {
    console.error("Error in generateQuestionsAI:", error);
    throw error;
  }
}

/* ============ GENERATE ADAPTIVE LEARNING PATH ============ */
const generateLearningPath = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const studySession = await StudySession.findOne({
      _id: sessionId,
      userId,
    });

    if (!studySession || !studySession.content?.rawText) {
      return res.status(404).json({
        message: "Study session or content not found",
      });
    }

    const learningPath = await generateLearningPathAI(
      studySession.content.rawText,
      studySession.content.extractedTopics || []
    );

    studySession.learningPath = learningPath;
    await studySession.save();

    res.json({
      success: true,
      message: "Learning path generated",
      learningPath,
    });
  } catch (error) {
    console.error("Error generating learning path:", error);
    res.status(500).json({
      message: "Error generating learning path",
      error: error.message,
    });
  }
};

async function generateLearningPathAI(content, topics) {
  try {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Create an adaptive learning path for mastering the following topics: ${topics.join(", ")}
    
    Content: ${content.substring(0, 2000)}
    
    Generate 5-7 progressive learning steps, each building on previous knowledge.
    For each step provide: title, description, estimated duration (in minutes), learning objectives, and recommended resources.
    
    Start from basics and progress to advanced concepts.
    
    Format as JSON array with objects having: { step, title, description, duration, objectives, resources }
    Return ONLY valid JSON array.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    try {
      const steps = JSON.parse(responseText);
      return {
        steps: steps.map((s, idx) => ({
          step: idx + 1,
          title: s.title || "",
          description: s.description || "",
          duration: s.duration || 30,
          resources: s.resources || [],
          objectives: s.objectives || [],
        })),
        currentStep: 0,
        progress: 0,
        completedSteps: [],
        updatedAt: new Date(),
      };
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return {
        steps: [],
        currentStep: 0,
        progress: 0,
        completedSteps: [],
        updatedAt: new Date(),
      };
    }
  } catch (error) {
    console.error("Error in generateLearningPathAI:", error);
    throw error;
  }
}

/* ============ SUBMIT QUIZ ANSWER ============ */
const submitQuizAnswer = async (req, res) => {
  try {
    const { sessionId, questionId, userAnswer } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!sessionId || !questionId || !userAnswer) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const studySession = await StudySession.findOne({
      _id: sessionId,
      userId,
    });

    if (!studySession) {
      return res.status(404).json({ message: "Study session not found" });
    }

    const question = studySession.practiceQuestions.find(
      (q) => q._id.toString() === questionId
    );

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const isCorrect =
      userAnswer.toLowerCase().trim() ===
      question.correctAnswer.toLowerCase().trim();

    question.userAnswer = userAnswer;
    question.isCorrect = isCorrect;
    question.attemptedAt = new Date();

    // Update progress
    studySession.progress.questionsAnswered += 1;
    if (isCorrect) {
      studySession.progress.correctAnswers += 1;
    }

    studySession.progress.accuracy =
      (studySession.progress.correctAnswers / studySession.progress.questionsAnswered) * 100;
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
    console.error("Error submitting answer:", error);
    res.status(500).json({
      message: "Error submitting answer",
      error: error.message,
    });
  }
};

/* ============ UPDATE LEARNING PATH PROGRESS ============ */
const updateLearningPathProgress = async (req, res) => {
  try {
    const { sessionId, stepNumber } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!sessionId || stepNumber === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const studySession = await StudySession.findOne({
      _id: sessionId,
      userId,
    });

    if (!studySession) {
      return res.status(404).json({ message: "Study session not found" });
    }

    if (!studySession.learningPath.completedSteps.includes(stepNumber)) {
      studySession.learningPath.completedSteps.push(stepNumber);
    }

    studySession.learningPath.currentStep = stepNumber;
    const totalSteps = studySession.learningPath.steps.length;
    studySession.learningPath.progress =
      totalSteps > 0 ? (studySession.learningPath.completedSteps.length / totalSteps) * 100 : 0;
    studySession.learningPath.updatedAt = new Date();

    await studySession.save();

    res.json({
      success: true,
      message: "Progress updated",
      learningPath: studySession.learningPath,
    });
  } catch (error) {
    console.error("Error updating progress:", error);
    res.status(500).json({
      message: "Error updating progress",
      error: error.message,
    });
  }
};

/* ============ GET STUDY SESSION ============ */
const getStudySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const studySession = await StudySession.findOne({
      _id: sessionId,
      userId,
    });

    if (!studySession) {
      return res.status(404).json({ message: "Study session not found" });
    }

    res.json({
      success: true,
      studySession,
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({
      message: "Error fetching session",
      error: error.message,
    });
  }
};

/* ============ GET ALL STUDY SESSIONS ============ */
const getAllStudySessions = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const sessions = await StudySession.find({ userId })
      .select(
        "title description status uploadedFile.originalName content.extractedTopics progress learningPath createdAt"
      )
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      sessions,
      totalSessions: sessions.length,
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({
      message: "Error fetching sessions",
      error: error.message,
    });
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