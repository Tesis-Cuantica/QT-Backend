const express = require("express");
const { protect } = require("../middleware/auth");
const {
  startAttempt,
  saveAnswers,
  submitExam,
  getAttempts,
} = require("../controllers/examAttemptController");

const router = express.Router();

router.post("/start", protect, startAttempt);
router.post("/save", protect, saveAnswers);
router.post("/submit", protect, submitExam);
router.get("/exam/:examId", protect, getAttempts);

module.exports = router;
