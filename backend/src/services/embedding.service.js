const { GoogleGenerativeAI, TaskType } = require("@google/generative-ai");
const crypto = require("crypto");
const redis = require("../db/redis");

const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";
const GEMINI_EMBEDDING_FALLBACK = "text-embedding-004";
const EMBEDDING_DIMENSIONS = Number(process.env.GEMINI_EMBEDDING_DIMENSIONS || 768);
const CACHE_TTL_SECONDS = 3600 * 24; // 24 hours

let genAIClient = null;

function getGenAI() {
  if (!genAIClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in backend environment.");
    }
    genAIClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAIClient;
}

function hashKey(str) {
  return crypto.createHash("sha256").update(String(str || "").trim()).digest("hex");
}

function truncateToDimension(vector, targetDim = EMBEDDING_DIMENSIONS) {
  if (!Array.isArray(vector)) return [];
  if (vector.length === targetDim) return vector;
  if (vector.length > targetDim) {
    // Truncate and renormalize if needed
    const truncated = vector.slice(0, targetDim);
    const norm = Math.sqrt(truncated.reduce((sum, v) => sum + v * v, 0)) || 1;
    return truncated.map((v) => v / norm);
  }
  // Pad with zeros if smaller
  const padded = [...vector];
  while (padded.length < targetDim) {
    padded.push(0);
  }
  return padded;
}

/**
 * Generate embedding for a single text chunk
 */
async function generateEmbedding(text, taskType = "RETRIEVAL_DOCUMENT", title = "") {
  const cleanText = String(text || "").trim();
  if (!cleanText) {
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  const ai = getGenAI();
  const modelsToTry = [GEMINI_EMBEDDING_MODEL, GEMINI_EMBEDDING_FALLBACK];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      const requestPayload = {
        content: { parts: [{ text: cleanText }] },
      };

      if (taskType === "RETRIEVAL_QUERY") {
        requestPayload.taskType = TaskType?.RETRIEVAL_QUERY || "RETRIEVAL_QUERY";
      } else if (taskType === "RETRIEVAL_DOCUMENT") {
        requestPayload.taskType = TaskType?.RETRIEVAL_DOCUMENT || "RETRIEVAL_DOCUMENT";
        if (title) requestPayload.title = title;
      }

      // Add outputDimensionality if supported by model
      requestPayload.outputDimensionality = EMBEDDING_DIMENSIONS;

      const result = await model.embedContent(requestPayload);
      const values = result?.embedding?.values || [];

      if (values.length > 0) {
        return truncateToDimension(values, EMBEDDING_DIMENSIONS);
      }
    } catch (err) {
      lastError = err;
      console.warn(`Embedding attempt with ${modelName} failed: ${err.message}. Trying fallback...`);
    }
  }

  console.error("All embedding models failed. Returning zero vector.", lastError?.message);
  return new Array(EMBEDDING_DIMENSIONS).fill(0);
}

/**
 * Generate embedding for a search query (with Redis/Memory cache)
 */
async function generateQueryEmbedding(query) {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) {
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  const cacheKey = `embed:query:${hashKey(cleanQuery)}`;

  // Try Redis cache if available
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (redisErr) {
      console.warn("Redis query embedding get failed:", redisErr.message);
    }
  }

  const embedding = await generateEmbedding(cleanQuery, "RETRIEVAL_QUERY");

  if (redis && embedding.length > 0) {
    try {
      await redis.set(cacheKey, JSON.stringify(embedding), "EX", CACHE_TTL_SECONDS);
    } catch (redisErr) {
      console.warn("Redis query embedding set failed:", redisErr.message);
    }
  }

  return embedding;
}

/**
 * Generate batch embeddings with batching and backoff
 */
async function generateBatchEmbeddings(texts, taskType = "RETRIEVAL_DOCUMENT", batchSize = 10) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const results = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchPromises = batch.map(async (item) => {
      const text = typeof item === "string" ? item : item.text || item.content || "";
      const title = typeof item === "object" ? item.title || "" : "";
      return generateEmbedding(text, taskType, title);
    });

    const batchEmbeddings = await Promise.all(batchPromises);
    results.push(...batchEmbeddings);

    // Brief pause between batches to respect rate limits
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  return results;
}

module.exports = {
  generateEmbedding,
  generateQueryEmbedding,
  generateBatchEmbeddings,
  EMBEDDING_DIMENSIONS,
  GEMINI_EMBEDDING_MODEL,
};
