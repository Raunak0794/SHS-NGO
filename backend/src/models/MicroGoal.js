const mongoose = require("mongoose");

const microGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    parentGoalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    estimatedHours: {
      type: Number,
      default: 1,
    },
    actualHours: {
      type: Number,
      default: 0,
    },
    deadline: Date,
    completedAt: Date,
    subtasks: [
      {
        title: String,
        completed: { type: Boolean, default: false },
        completedAt: Date,
      },
    ],
    resources: [
      {
        title: String,
        url: String,
        type: String, // article, video, book, etc.
      },
    ],
    feedback: {
      type: String,
      default: "",
    },
    aiSuggestions: [String],
    calendarEventId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("MicroGoal", microGoalSchema);
