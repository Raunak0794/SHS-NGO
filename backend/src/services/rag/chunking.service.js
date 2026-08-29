/**
 * Chunking Service for Document Ingestion
 * Preserves page boundaries and splits text into sentence-aware overlapping chunks.
 */

const DEFAULT_CHUNK_SIZE_CHARS = 2400; // ~600 tokens
const DEFAULT_CHUNK_OVERLAP_CHARS = 450; // ~110 tokens
const MIN_CHUNK_LENGTH_CHARS = 60; // Ignore tiny fragments

/**
 * Clean and normalize text
 */
function cleanText(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Estimate token count roughly (~4 chars per token in English)
 */
function estimateTokenCount(text) {
  return Math.ceil(String(text || "").length / 4);
}

/**
 * Find the nearest sentence boundary near the target index
 */
function findSentenceBoundary(text, targetIndex, searchRadius = 150) {
  const minIndex = Math.max(0, targetIndex - searchRadius);
  const maxIndex = Math.min(text.length, targetIndex + searchRadius);
  const window = text.substring(minIndex, maxIndex);

  // Look for sentence terminators followed by whitespace or newline
  const match = window.match(/(?<=[.!?])\s+|\n\n+/);
  if (match && match.index !== undefined) {
    return minIndex + match.index + match[0].length;
  }

  // Fallback to space
  const spaceIndex = text.lastIndexOf(" ", targetIndex);
  if (spaceIndex > minIndex) {
    return spaceIndex + 1;
  }

  return targetIndex;
}

/**
 * Split a single page's text into overlapping chunks
 */
function chunkPageText(
  pageText,
  pageNumber,
  startChunkIndex = 0,
  chunkSize = DEFAULT_CHUNK_SIZE_CHARS,
  chunkOverlap = DEFAULT_CHUNK_OVERLAP_CHARS
) {
  const cleaned = cleanText(pageText);
  if (cleaned.length < MIN_CHUNK_LENGTH_CHARS) {
    if (cleaned.length > 0) {
      return [
        {
          content: cleaned,
          pageNumber,
          chunkIndex: startChunkIndex,
          tokenCount: estimateTokenCount(cleaned),
        },
      ];
    }
    return [];
  }

  const chunks = [];
  let startIndex = 0;
  let currentChunkIndex = startChunkIndex;

  while (startIndex < cleaned.length) {
    const rawEndIndex = startIndex + chunkSize;
    if (rawEndIndex >= cleaned.length) {
      const finalSlice = cleaned.substring(startIndex).trim();
      if (finalSlice.length >= MIN_CHUNK_LENGTH_CHARS || chunks.length === 0) {
        chunks.push({
          content: finalSlice,
          pageNumber,
          chunkIndex: currentChunkIndex,
          tokenCount: estimateTokenCount(finalSlice),
        });
      }
      break;
    }

    const boundaryEndIndex = findSentenceBoundary(cleaned, rawEndIndex);
    const chunkSlice = cleaned.substring(startIndex, boundaryEndIndex).trim();

    if (chunkSlice.length >= MIN_CHUNK_LENGTH_CHARS) {
      chunks.push({
        content: chunkSlice,
        pageNumber,
        chunkIndex: currentChunkIndex,
        tokenCount: estimateTokenCount(chunkSlice),
      });
      currentChunkIndex += 1;
    }

    // Step forward by (chunkSize - overlap)
    const nextStart = boundaryEndIndex - chunkOverlap;
    startIndex = nextStart > startIndex ? nextStart : boundaryEndIndex;
  }

  return chunks;
}

/**
 * Chunk a multi-page document
 * pages: Array of { pageNumber: number, text: string }
 */
function chunkDocumentPages(
  pages,
  chunkSize = DEFAULT_CHUNK_SIZE_CHARS,
  chunkOverlap = DEFAULT_CHUNK_OVERLAP_CHARS
) {
  if (!Array.isArray(pages) || pages.length === 0) {
    return [];
  }

  const allChunks = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const pageNum = page.pageNumber || 1;
    const pageText = page.text || "";
    const pageChunks = chunkPageText(
      pageText,
      pageNum,
      globalChunkIndex,
      chunkSize,
      chunkOverlap
    );

    for (const chunk of pageChunks) {
      allChunks.push(chunk);
      globalChunkIndex += 1;
    }
  }

  return allChunks;
}

module.exports = {
  cleanText,
  estimateTokenCount,
  chunkPageText,
  chunkDocumentPages,
  DEFAULT_CHUNK_SIZE_CHARS,
  DEFAULT_CHUNK_OVERLAP_CHARS,
};
