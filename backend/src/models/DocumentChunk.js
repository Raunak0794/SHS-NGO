const mongoose = require("mongoose");

const documentChunkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudySession",
      required: true,
      index: true,
    },
    documentName: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      default: "General",
      index: true,
    },
    chapter: {
      type: String,
      default: "",
    },
    pageNumber: {
      type: Number,
      default: 1,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    tokenCount: {
      type: Number,
      default: 0,
    },
    embedding: {
      type: [Number],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient user + document filtering
documentChunkSchema.index({ userId: 1, documentId: 1 });
documentChunkSchema.index({ userId: 1, subject: 1 });

const DocumentChunk = mongoose.model("DocumentChunk", documentChunkSchema);

module.exports = DocumentChunk;
