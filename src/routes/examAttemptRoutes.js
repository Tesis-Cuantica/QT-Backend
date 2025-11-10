// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: examAttemptRoutes.js
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const examAttemptController = require("../controllers/examAttemptController");
const { protect, authorize } = require("../middleware/auth");

router
  .route("/")
  .post(protect, authorize("STUDENT"), examAttemptController.startAttempt);

router
  .route("/save")
  .post(protect, authorize("STUDENT"), examAttemptController.saveAnswers);

router
  .route("/submit")
  .post(protect, authorize("STUDENT"), examAttemptController.submitExam);

router
  .route("/exams/:examId")
  .get(protect, authorize("STUDENT"), examAttemptController.getAttempts);

router
  .route("/:id")
  .get(
    protect,
    authorize("STUDENT", "PROFESSOR"),
    examAttemptController.getAttemptById
  );
router
  .route("/reset/:examId/:studentId")
  .delete(
    protect,
    authorize("ADMIN", "PROFESSOR"),
    examAttemptController.resetAttempts
  );

module.exports = router;
