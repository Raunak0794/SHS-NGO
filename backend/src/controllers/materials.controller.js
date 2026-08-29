const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");
const StudySession = require("../models/StudySession");
const DocumentChunk = require("../models/DocumentChunk");
const { ingestDocument, deleteDocumentChunks } = require("../services/rag/ingestion.service");
const { retrieveRelevantChunks } = require("../services/rag/retrieval.service");

/**
 * GET /api/materials
 * List student's materials
 */
const getMaterials = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject, search } = req.query;

    const query = { userId };
    if (subject && subject !== "All" && subject !== "General") {
      query.$or = [{ tags: subject }, { "content.extractedTopics": subject }];
    }

    if (search && String(search).trim()) {
      const searchRegex = new RegExp(String(search).trim(), "i");
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { title: searchRegex },
            { "uploadedFile.originalName": searchRegex },
            { "content.extractedTopics": searchRegex },
          ],
        },
      ];
    }

    const sessions = await StudySession.find(query)
      .select("title description status uploadedFile content.extractedTopics tags createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    // Attach chunk counts to each material
    const sessionIds = sessions.map((s) => s._id);
    const chunkCounts = await DocumentChunk.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), documentId: { $in: sessionIds } } },
      { $group: { _id: "$documentId", count: { $sum: 1 }, maxPage: { $max: "$pageNumber" } } },
    ]);

    const countMap = new Map();
    chunkCounts.forEach((c) => countMap.set(c._id.toString(), { count: c.count, maxPage: c.maxPage }));

    const materials = sessions.map((s) => {
      const info = countMap.get(s._id.toString()) || { count: 0, maxPage: 1 };
      return {
        _id: s._id,
        title: s.title,
        description: s.description,
        fileName: s.uploadedFile?.originalName || s.title,
        fileType: s.uploadedFile?.fileType || "pdf",
        size: s.uploadedFile?.size || 0,
        subject: s.tags?.[0] || "General",
        extractedTopics: s.content?.extractedTopics || [],
        chunkCount: info.count,
        pageCount: info.maxPage,
        status: info.count > 0 ? "ready" : s.status || "ready",
        createdAt: s.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      materials,
      totalCount: materials.length,
    });
  } catch (error) {
    console.error("Get materials error:", error);
    return res.status(500).json({ success: false, message: "Could not load study materials" });
  }
};

/**
 * POST /api/materials/upload
 * Upload document, extract pages, chunk, embed, and store in vector store
 */
const uploadMaterial = async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const userId = req.user.id;
    filePath = req.file.path;
    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    const { title, subject = "General", chapter = "" } = req.body || {};

    const cleanTitle = title?.trim() || path.basename(originalName, ext);

    // 1. Create or update StudySession
    const studySession = new StudySession({
      userId,
      title: cleanTitle,
      uploadedFile: {
        fileName: req.file.filename,
        originalName,
        uploadDate: new Date(),
        fileType: ext.replace(".", "") || "pdf",
        size: req.file.size,
      },
      tags: [subject || "General"],
      status: "in-progress",
    });
    await studySession.save();

    // 2. Ingest document (extract pages, chunk, generate embeddings, store DocumentChunks)
    const ingestionResult = await ingestDocument({
      userId,
      documentId: studySession._id,
      documentName: cleanTitle,
      subject: subject || "General",
      chapter: chapter || "",
      filePath,
    });

    // 3. Extract sample topics from chunks
    const sampleTopics = (ingestionResult.chunks || [])
      .slice(0, 5)
      .map((c) => c.content.split(/\s+/).slice(0, 3).join(" "))
      .filter(Boolean);

    studySession.content = {
      rawText: (ingestionResult.chunks || []).map((c) => c.content).join("\n\n").substring(0, 100000),
      extractedTopics: sampleTopics.length ? sampleTopics : [cleanTitle],
    };
    studySession.status = "completed";
    await studySession.save();

    // Clean up temporary file
    await fs.unlink(filePath).catch(() => {});

    return res.status(201).json({
      success: true,
      message: `Your notes for "${cleanTitle}" are ready for study!`,
      material: {
        _id: studySession._id,
        title: studySession.title,
        fileName: originalName,
        subject,
        chapter,
        chunkCount: ingestionResult.chunkCount,
        pageCount: ingestionResult.pageCount,
        status: "ready",
      },
    });
  } catch (error) {
    console.error("Material upload error:", error);
    if (filePath) {
      await fs.unlink(filePath).catch(() => {});
    }
    return res.status(500).json({
      success: false,
      message: "Could not read this document. Please try another file or a clearer version.",
    });
  }
};

/**
 * GET /api/materials/:id
 * Get material details and its chunks
 */
const getMaterialDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid material ID" });
    }

    const session = await StudySession.findOne({ _id: id, userId }).lean();
    if (!session) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    const chunks = await DocumentChunk.find({ documentId: id, userId })
      .select("pageNumber chunkIndex content tokenCount createdAt")
      .sort({ chunkIndex: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      material: {
        ...session,
        chunks,
        chunkCount: chunks.length,
      },
    });
  } catch (error) {
    console.error("Get material details error:", error);
    return res.status(500).json({ success: false, message: "Could not load material details" });
  }
};

/**
 * PATCH /api/materials/:id
 * Rename or update subject/chapter
 */
const updateMaterial = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, subject, chapter } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid material ID" });
    }

    const updates = {};
    if (title && String(title).trim()) updates.title = String(title).trim();
    if (subject && String(subject).trim()) updates.tags = [String(subject).trim()];

    const updatedSession = await StudySession.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true }
    );

    if (!updatedSession) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    // Also update documentName and subject in chunks if changed
    if (updates.title || updates.tags) {
      await DocumentChunk.updateMany(
        { documentId: id, userId },
        {
          $set: {
            ...(updates.title ? { documentName: updates.title } : {}),
            ...(updates.tags ? { subject: updates.tags[0] } : {}),
            ...(chapter ? { chapter } : {}),
          },
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Material updated successfully",
      material: updatedSession,
    });
  } catch (error) {
    console.error("Update material error:", error);
    return res.status(500).json({ success: false, message: "Could not update material" });
  }
};

/**
 * DELETE /api/materials/:id
 * Delete material and cascade delete all chunks from vector store
 */
const deleteMaterial = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid material ID" });
    }

    const deleted = await StudySession.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    // Cascade delete chunks & vector embeddings
    await deleteDocumentChunks(id, userId);

    return res.status(200).json({
      success: true,
      message: "Material and vector indices deleted permanently.",
      deletedId: id,
    });
  } catch (error) {
    console.error("Delete material error:", error);
    return res.status(500).json({ success: false, message: "Could not delete material" });
  }
};

/**
 * POST /api/materials/search/semantic
 * Cross-material semantic vector search
 */
const semanticSearch = async (req, res) => {
  try {
    const userId = req.user.id;
    const { query, subject, documentId, topK = 8 } = req.body || {};

    const cleanQuery = String(query || "").trim();
    if (!cleanQuery) {
      return res.status(400).json({ success: false, message: "Search query is required." });
    }

    const results = await retrieveRelevantChunks({
      userId,
      query: cleanQuery,
      subject,
      documentId,
      scope: documentId ? "document" : subject ? "subject" : "all",
      topK: Number(topK) || 8,
      minScore: 0.15,
    });

    return res.status(200).json({
      success: true,
      query: cleanQuery,
      resultsCount: results.length,
      results,
    });
  } catch (error) {
    console.error("Semantic search error:", error);
    return res.status(500).json({ success: false, message: "Semantic search failed" });
  }
};

module.exports = {
  getMaterials,
  uploadMaterial,
  getMaterialDetails,
  updateMaterial,
  deleteMaterial,
  semanticSearch,
};
