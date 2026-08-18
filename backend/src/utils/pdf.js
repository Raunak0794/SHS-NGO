const { PDFParse } = require("pdf-parse");

async function extractTextFromPdf(data) {
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();
    return result.text || "";
  } finally {
    await parser.destroy().catch(() => {});
  }
}

module.exports = { extractTextFromPdf };
