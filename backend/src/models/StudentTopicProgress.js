const mongoose = require("mongoose");

const studentTopicProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
    },
    normalizedTopic: {
      type: String,
      required: true,
      index: true,
    },
    chapter: {
      type: String,
      default: "",
    },
    questionsAsked: {
      type: Number,
      default: 0,
    },
    correctAnswers: {
      type: Number,
      default: 0,
    },
    incorrectAnswers: {
      type: Number,
      default: 0,
    },
    totalAttempts: {
      type: Number,
      default: 0,
    },
    confidenceScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    masteryScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ["weak", "improving", "mastered"],
      default: "improving",
      index: true,
    },
    lastStudiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

studentTopicProgressSchema.index({ userId: 1, normalizedTopic: 1 }, { unique: true });
studentTopicProgressSchema.index({ userId: 1, subject: 1, status: 1 });

const StudentTopicProgress = mongoose.model("StudentTopicProgress", studentTopicProgressSchema);

module.exports = StudentTopicProgress;
