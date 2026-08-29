const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");
const authMiddleware = require("../middleware/auth");
const materialsController = require("../controllers/materials.controller");

const router = express.Router();

// Uploads directory
const uploadDir = process.env.UPLOAD_DIR || path.join(os.tmpdir(), "shs-uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB || 200);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
});

// All material routes require auth
router.use(authMiddleware);

router.get("/", materialsController.getMaterials);
router.post("/upload", upload.single("file"), materialsController.uploadMaterial);
router.post("/search/semantic", materialsController.semanticSearch);
router.get("/:id", materialsController.getMaterialDetails);
router.patch("/:id", materialsController.updateMaterial);
router.delete("/:id", materialsController.deleteMaterial);

module.exports = router;
