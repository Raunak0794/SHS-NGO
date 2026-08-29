const mongoose = require("mongoose");

const savedRevisionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      default: "General",
      index: true,
    },
    type: {
      type: String,
      enum: ["notes", "flashcards", "formula_sheet", "definitions", "exam_points"],
      default: "notes",
      index: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    sourceDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudySession",
    },
  },
  {
    timestamps: true,
  }
);

savedRevisionSchema.index({ userId: 1, type: 1, createdAt: -1 });

const SavedRevision = mongoose.model("SavedRevision", savedRevisionSchema);

module.exports = SavedRevision;
