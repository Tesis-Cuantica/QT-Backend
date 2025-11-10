// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: professorRoutes.js
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const professorController = require("../controllers/professorController");
const { protect, authorize } = require("../middleware/auth");

router
  .route("/courses")
  .get(protect, authorize("PROFESSOR"), professorController.getMyCourses);

router
  .route("/attempts/pending")
  .get(protect, authorize("PROFESSOR"), professorController.getPendingAttempts);

router
  .route("/attempts/:attemptId/grade")
  .post(protect, authorize("PROFESSOR"), professorController.gradeAttempt);

module.exports = router;
