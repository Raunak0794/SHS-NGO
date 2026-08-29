const mongoose = require("mongoose");

const studentMistakeSchema = new mongoose.Schema(
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
    question: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      default: [],
    },
    studentAnswer: {
      type: String,
      required: true,
    },
    correctAnswer: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      default: "",
    },
    sourceMaterial: {
      type: String,
      default: "",
    },
    difficulty: {
      type: String,
      default: "medium",
    },
    reviewed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

studentMistakeSchema.index({ userId: 1, subject: 1, reviewed: 1 });

const StudentMistake = mongoose.model("StudentMistake", studentMistakeSchema);

module.exports = StudentMistake;
