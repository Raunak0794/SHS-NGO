const mongoose = require("mongoose");

const studySessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    uploadedFile: {
      fileName: String,
      originalName: String,
      uploadDate: Date,
      fileType: String, // pdf, txt, md, etc
    },
    content: {
      rawText: String,
      extractedTopics: [String],
      difficulty: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
        default: "intermediate",
      },
    },
    summary: {
      aiGenerated: String,
      keyPoints: [String],
      generatedAt: Date,
    },
    practiceQuestions: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        question: String,
        options: [String],
        correctAnswer: String,
        explanation: String,
        difficulty: String,
        topic: String,
        userAnswer: String,
        isCorrect: Boolean,
        attemptedAt: Date,
      },
    ],
    learningPath: {
      steps: [
        {
          step: Number,
          title: String,
          description: String,
          duration: Number, // in minutes
          resources: [String],
          objectives: [String],
        },
      ],
      currentStep: { type: Number, default: 0 },
      progress: { type: Number, default: 0 }, // 0-100
      completedSteps: [Number],
      updatedAt: Date,
    },
    quizzes: [
      {
        quizId: mongoose.Schema.Types.ObjectId,
        title: String,
        totalQuestions: Number,
        userScore: Number,
        passedAt: Date,
        duration: Number, // in seconds
      },
    ],
    progress: {
      questionsAnswered: { type: Number, default: 0 },
      correctAnswers: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 }, // percentage
      timeSpent: { type: Number, default: 0 }, // in minutes
      lastActivityAt: Date,
    },
    status: {
      type: String,
      enum: ["not-started", "in-progress", "completed"],
      default: "in-progress",
    },
    tags: [String],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("StudySession", studySessionSchema);
