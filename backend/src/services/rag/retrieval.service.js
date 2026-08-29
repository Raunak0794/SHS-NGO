const mongoose = require("mongoose");
const DocumentChunk = require("../../models/DocumentChunk");
const { generateQueryEmbedding } = require("../embedding.service");

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Create a concise snippet / excerpt from content
 */
function createExcerpt(content, maxLength = 250) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

/**
 * Perform semantic vector retrieval for an authenticated student
 */
async function retrieveRelevantChunks({
  userId,
  query,
  documentId,
  documentIds = [],
  subject,
  scope = "all",
  topK = 6,
  minScore = 0.25,
}) {
  if (!userId) {
    throw new Error("Unauthorized: userId is required for vector retrieval.");
  }

  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) {
    return [];
  }

  // 1. Generate query embedding
  const queryEmbedding = await generateQueryEmbedding(cleanQuery);

  // 2. Build filter for vector search
  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const filter = { userId: userObjectId };

  if (scope === "document" && documentId && mongoose.Types.ObjectId.isValid(documentId)) {
    filter.documentId = new mongoose.Types.ObjectId(documentId);
  } else if (scope === "selected" && Array.isArray(documentIds) && documentIds.length > 0) {
    const validIds = documentIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (validIds.length > 0) {
      filter.documentId = { $in: validIds };
    }
  } else if (scope === "subject" && subject && subject !== "General" && subject !== "All") {
    filter.subject = new RegExp(`^${subject}$`, "i");
  }

  // 3. Attempt MongoDB Atlas $vectorSearch
  try {
    const atlasVectorFilter = { userId: userObjectId };
    if (filter.documentId) atlasVectorFilter.documentId = filter.documentId;
    if (filter.subject) atlasVectorFilter.subject = filter.subject;

    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: Math.max(topK * 10, 40),
          limit: topK,
          filter: atlasVectorFilter,
        },
      },
      {
        $project: {
          _id: 1,
          documentId: 1,
          documentName: 1,
          subject: 1,
          chapter: 1,
          pageNumber: 1,
          chunkIndex: 1,
          content: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    const results = await DocumentChunk.aggregate(pipeline);
    if (results && results.length > 0) {
      return results
        .filter((r) => (r.score || 0) >= minScore)
        .map((r) => ({
          documentId: r.documentId,
          documentName: r.documentName || "Study Material",
          subject: r.subject || "General",
          chapter: r.chapter || "",
          pageNumber: r.pageNumber || 1,
          chunkIndex: r.chunkIndex,
          content: r.content,
          score: Number((r.score || 0).toFixed(4)),
          excerpt: createExcerpt(r.content),
        }));
    }
  } catch (atlasErr) {
    // Atlas vector search index might not exist in local dev or non-Atlas MongoDB; gracefully fallback
    console.warn("Atlas $vectorSearch not available or index missing. Using in-database similarity fallback:", atlasErr.message);
  }

  // 4. Resilient Fallback: Compute cosine similarity in memory over candidate chunks
  try {
    const candidateChunks = await DocumentChunk.find(filter)
      .select("documentId documentName subject chapter pageNumber chunkIndex content embedding")
      .limit(200)
      .lean();

    if (!candidateChunks || candidateChunks.length === 0) {
      return [];
    }

    const scoredChunks = candidateChunks.map((chunk) => {
      const score = cosineSimilarity(queryEmbedding, chunk.embedding || []);
      return {
        documentId: chunk.documentId,
        documentName: chunk.documentName || "Study Material",
        subject: chunk.subject || "General",
        chapter: chunk.chapter || "",
        pageNumber: chunk.pageNumber || 1,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        score: Number(score.toFixed(4)),
        excerpt: createExcerpt(chunk.content),
      };
    });

    // Sort by score descending and take topK
    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.filter((c) => c.score >= minScore).slice(0, topK);
  } catch (fallbackErr) {
    console.error("Retrieval fallback failed:", fallbackErr.message);
    return [];
  }
}

module.exports = {
  retrieveRelevantChunks,
  cosineSimilarity,
  createExcerpt,
};
