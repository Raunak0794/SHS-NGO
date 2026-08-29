const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "New Study Chat",
    },
    subject: {
      type: String,
      default: "General",
      index: true,
    },
    mode: {
      type: String,
      enum: ["material", "general", "tutor", "exam"],
      default: "material",
    },
    scope: {
      type: String,
      enum: ["all", "subject", "document", "selected"],
      default: "all",
    },
    documentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StudySession",
      },
    ],
    summary: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ userId: 1, lastMessageAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;
