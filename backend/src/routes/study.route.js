const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");
const authMiddleware = require("../middleware/auth");
const studyController = require("../controllers/study.controller");

const router = express.Router();

// Ensure uploads directory exists (inside src/uploads as per structure)
const uploadDir = process.env.UPLOAD_DIR || path.join(os.tmpdir(), "shs-uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB || 200);
const MAX_UPLOAD_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExt = new Set([
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
      ".doc",
      ".docx",
      ".ppt",
      ".pptx",
      ".xls",
      ".xlsx",
      ".odt",
      ".ods",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".svg",
      ".zip",
      ".rar",
      ".7z",
      ".mp3",
      ".mp4",
      ".mov",
      ".avi",
      ".wav",
    ]);

    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExt.has(ext) || !ext) {
      return cb(null, true);
    }

    cb(new Error("Unsupported file type"));
  },
  limits: { fileSize: MAX_UPLOAD_SIZE },
});

// All routes require authentication (applied before all routes)
router.use(authMiddleware);

// ============ Study Session CRUD ============
router.post("/create", studyController.createStudySession);
router.get("/sessions", studyController.getAllStudySessions);
router.delete("/:sessionId", studyController.deleteStudySession);
router.get("/:sessionId", studyController.getStudySession);

// ============ Material Upload & Processing ============
router.post("/upload", upload.single("file"), studyController.uploadAndProcessMaterial);

// ============ AI Features ============
router.post("/:sessionId/summary", studyController.generateSummary);
router.post("/:sessionId/questions", studyController.generatePracticeQuestions);
router.post("/:sessionId/learning-path", studyController.generateLearningPath);

// ============ Quiz & Progress ============
router.post("/submit-answer", studyController.submitQuizAnswer);
router.put("/:sessionId/progress", studyController.updateLearningPathProgress);

// Multer error handler for this router
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "FILE_TOO_LARGE") {
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
