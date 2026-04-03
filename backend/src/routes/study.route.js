const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middleware/auth");
const studyController = require("../controllers/study.controller");

const router = express.Router();

// Ensure uploads directory exists (inside src/uploads as per structure)
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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
    const allowedTypes = /txt|md|json|pdf|doc|docx/i;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only .txt, .md, .json, .pdf, .doc, .docx files are allowed"));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// All routes require authentication (applied before all routes)
router.use(authMiddleware);

// ============ Study Session CRUD ============
router.post("/create", studyController.createStudySession);
router.get("/sessions", studyController.getAllStudySessions);
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
      return res.status(400).json({ error: "File too large. Max size 50MB." });
    }
    return res.status(400).json({ error: error.message });
  }
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

module.exports = router;