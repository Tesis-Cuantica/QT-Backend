const express = require("express");
const router = express.Router();
const examAttemptController = require("../controllers/examAttemptController");
const { protect } = require("../middleware/auth");

router.route("/").post(protect, examAttemptController.startAttempt);

router.route("/save").post(protect, examAttemptController.saveAnswers);

router.route("/submit").post(protect, examAttemptController.submitExam);

router.route("/exams/:examId").get(protect, examAttemptController.getAttempts);

router.route("/:id").get(protect, examAttemptController.getAttemptById);

module.exports = router;
