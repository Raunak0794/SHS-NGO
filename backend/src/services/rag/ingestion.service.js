const fs = require("fs").promises;
const path = require("path");
const DocumentChunk = require("../../models/DocumentChunk");
const { generateBatchEmbeddings } = require("../embedding.service");
const { chunkDocumentPages, cleanText } = require("./chunking.service");
const { extractTextFromPdf } = require("../../utils/pdf");
const mammoth = require("mammoth");
const Tesseract = require("tesseract.js");

/**
 * Extract pages from a buffer or file path
 * Returns Array of { pageNumber: number, text: string }
 */
async function extractDocumentPages(filePath, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();
  const pages = [];

  try {
    if (ext === ".pdf") {
      const buffer = await fs.readFile(filePath);
      const fullText = await extractTextFromPdf(buffer);

      // PDF text extracted by pdf-parse typically delimits pages with form feed (\f or \x0c)
      const rawPages = fullText.split(/\f|\x0c/);
      if (rawPages.length > 1) {
        rawPages.forEach((text, index) => {
          const cleaned = cleanText(text);
          if (cleaned) {
            pages.push({ pageNumber: index + 1, text: cleaned });
          }
        });
      } else {
        // Fallback: If no form feeds found, split into virtual pages if very long (>3000 chars)
        const cleaned = cleanText(fullText);
        if (cleaned.length > 3500) {
          const virtualPageSize = 3000;
          let pNum = 1;
          for (let i = 0; i < cleaned.length; i += virtualPageSize) {
            pages.push({
              pageNumber: pNum++,
              text: cleaned.substring(i, i + virtualPageSize),
            });
          }
        } else if (cleaned) {
          pages.push({ pageNumber: 1, text: cleaned });
        }
      }
    } else if (ext === ".docx") {
      const docxData = await mammoth.extractRawText({ path: filePath });
      const cleaned = cleanText(docxData.value || "");
      if (cleaned) {
        pages.push({ pageNumber: 1, text: cleaned });
      }
    } else if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
      const result = await Tesseract.recognize(filePath, "eng");
      const cleaned = cleanText(result.data.text || "");
      if (cleaned) {
        pages.push({ pageNumber: 1, text: cleaned });
      }
    } else {
      // Text-based files (.txt, .md, .csv, .json, .js, .html, etc.)
      const content = await fs.readFile(filePath, "utf-8");
      const cleaned = cleanText(content);
      if (cleaned) {
        pages.push({ pageNumber: 1, text: cleaned });
      }
    }
  } catch (err) {
    console.error(`Page extraction failed for ${originalName}:`, err.message);
  }

  if (pages.length === 0) {
    pages.push({
      pageNumber: 1,
      text: `Uploaded file: ${originalName} (No readable text extracted)`,
    });
  }

  return pages;
}

/**
 * Ingest document into MongoDB vector store
 */
async function ingestDocument({
  userId,
  documentId,
  documentName,
  subject = "General",
  chapter = "",
  filePath,
}) {
  if (!userId || !documentId) {
    throw new Error("userId and documentId are required for ingestion.");
  }

  // 1. Extract page-by-page text
  const pages = await extractDocumentPages(filePath, documentName);

  // 2. Split pages into sentence-aware overlapping chunks
  const chunks = chunkDocumentPages(pages);

  if (chunks.length === 0) {
    return {
      chunkCount: 0,
      pageCount: pages.length,
      chunks: [],
    };
  }

  // 3. Remove existing chunks for this document (prevent duplicates)
  await DocumentChunk.deleteMany({ userId, documentId });

  // 4. Generate embeddings in batches
  const textsToEmbed = chunks.map((c) => ({
    text: c.content,
    title: `${subject} - ${documentName} (Page ${c.pageNumber})`,
  }));

  const embeddings = await generateBatchEmbeddings(textsToEmbed, "RETRIEVAL_DOCUMENT", 10);

  // 5. Prepare documents for bulk insertion
  const chunkDocs = chunks.map((chunk, index) => ({
    userId,
    documentId,
    documentName,
    subject: subject || "General",
    chapter: chapter || "",
    pageNumber: chunk.pageNumber,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    tokenCount: chunk.tokenCount,
    embedding: embeddings[index] || new Array(768).fill(0),
  }));

  const inserted = await DocumentChunk.insertMany(chunkDocs);

  return {
    chunkCount: inserted.length,
    pageCount: pages.length,
    chunks: inserted,
  };
}

/**
 * Delete all chunks for a document
 */
async function deleteDocumentChunks(documentId, userId) {
  if (!documentId || !userId) return;
  await DocumentChunk.deleteMany({ documentId, userId });
}

module.exports = {
  extractDocumentPages,
  ingestDocument,
  deleteDocumentChunks,
};
