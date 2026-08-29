const express = require("express");
const authMiddleware = require("../middleware/auth");
const progressController = require("../controllers/progress.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/dashboard", progressController.getProgressDashboard);
router.get("/recommendation", progressController.getRecommendation);
router.post("/study-plan", progressController.createStudyPlan);
router.post("/study-plan/sync-calendar", progressController.syncCalendarPlan);

module.exports = router;
