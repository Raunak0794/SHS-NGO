const express = require("express");
const authMiddleware = require("../middleware/auth");
const practiceController = require("../controllers/practice.controller");

const router = express.Router();

router.use(authMiddleware);

// Quizzes
router.post("/quiz/generate", practiceController.generateQuiz);
router.post("/quiz/submit", practiceController.submitQuiz);

// Mistake Book
router.get("/mistakes", practiceController.getMistakes);
router.delete("/mistakes/:id", practiceController.resolveMistake);

// Flashcards
router.post("/flashcards/generate", practiceController.generateFlashcards);
router.post("/flashcards/review", practiceController.reviewFlashcard);

// Revision Notes
router.post("/revision-notes", practiceController.generateRevisionNotes);
router.get("/revision-notes", practiceController.getRevisionNotes);
router.delete("/revision-notes/:id", practiceController.deleteRevisionNote);

module.exports = router;
