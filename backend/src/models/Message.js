const mongoose = require("mongoose");

const sourceCitationSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudySession",
    },
    documentName: {
      type: String,
      default: "Study Material",
    },
    pageNumber: {
      type: Number,
      default: 1,
    },
    excerpt: {
      type: String,
      default: "",
    },
    score: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      enum: ["material", "general", "tutor", "exam"],
      default: "material",
    },
    sources: [sourceCitationSchema],
    detectedConcepts: [String],
    suggestedFollowUps: [String],
    isSaved: {
      type: Boolean,
      default: false,
      index: true,
    },
    feedback: {
      type: String,
      enum: ["like", "dislike", "none"],
      default: "none",
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ userId: 1, isSaved: 1 });

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
