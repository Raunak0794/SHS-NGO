const express = require("express");
const router = express.Router();
const { getAIDashboard, uploadMaterial } = require("../controllers/ai.controller");
const authMiddleware = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");
// npm install file-type
// Verifies actual file content (magic bytes) instead of trusting the
// client-supplied extension/MIME type alone.
const { fileTypeFromFile } = require("file-type");

// Ensure uploads directory exists
const uploadDir = process.env.UPLOAD_DIR || path.join(os.tmpdir(), "shs-uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB || 200);
const MAX_UPLOAD_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

// Extensions the app actually knows how to extract text/content from.
// Kept in sync with ai.controller.js's SUPPORTED_TEXT_EXTENSIONS + pdf/docx/images.
const ALLOWED_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".json",
  ".js",
  ".html",
  ".css",
  ".csv",
  ".xml",
  ".log",
  ".pdf",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
]);

// Maps extension -> expected magic-byte MIME type(s), for the extensions
// where file-type can actually detect a signature (plain text formats have
// no reliable magic number, so they're skipped in the post-upload check).
const EXPECTED_MIME = {
  ".pdf": ["application/pdf"],
  ".docx": ["application/zip", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ALLOWED_EXTENSIONS.has(ext)) {
      return cb(null, true);
    }

    cb(new Error("Unsupported file type. Please upload a document, PDF, or image."));
  },
});

// Verifies the uploaded file's real content matches its extension before
// it ever reaches the controller. Text-like extensions (.txt, .md, .json,
// .js, .html, .css, .csv, .xml, .log) have no reliable magic number, so
// they pass through untouched.
async function verifyFileContent(req, res, next) {
  if (!req.file) return next();

  const ext = path.extname(req.file.originalname).toLowerCase();
  const expected = EXPECTED_MIME[ext];

  if (!expected) {
    return next(); // plain-text formats: nothing to sniff
  }

  try {
    const detected = await fileTypeFromFile(req.file.path);

    if (!detected || !expected.includes(detected.mime)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        error: "File content does not match its extension. Upload may be corrupted or mislabeled.",
      });
    }

    next();
  } catch (error) {
    fs.unlink(req.file.path, () => {});
    console.error("File signature check failed:", error);
    res.status(400).json({ error: "Could not verify file contents." });
  }
}

// Routes
router.get("/dashboard", authMiddleware, getAIDashboard);
router.post("/upload", authMiddleware, upload.single("file"), verifyFileContent, uploadMaterial);

// Error handler for multer (must come after routes that use `upload`)
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: `File too large. Max size ${MAX_UPLOAD_SIZE_MB}MB.` });
    }
    return res.status(400).json({ error: error.message });
  }
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

module.exports = router;