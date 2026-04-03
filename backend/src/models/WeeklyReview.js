const mongoose = require("mongoose");

const weeklyReviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    week: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    goalsTracked: [
      {
        goalId: mongoose.Schema.Types.ObjectId,
        title: String,
        progress: Number,
        completed: Boolean,
      },
    ],
    microGoalsCompleted: {
      type: Number,
      default: 0,
    },
    totalMicroGoals: {
      type: Number,
      default: 0,
    },
    overallProgress: {
      type: Number,
      default: 0,
    },
    hoursSpent: {
      type: Number,
      default: 0,
    },
    consistencyScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    aiSummary: {
      type: String,
      default: "",
    },
    aiRecommendations: [String],
    challenges: [String],
    achievements: [String],
    nextWeekGoals: [String],
    streak: {
      type: Number,
      default: 0,
    },
    moodRating: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("WeeklyReview", weeklyReviewSchema);
