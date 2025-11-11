// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-11
// Archivo: attemptRoutes.js
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const attemptController = require("../controllers/attemptController");
const { protect, authorize } = require("../middleware/auth");

router.post(
  "/exams/:examId",
  protect,
  authorize("STUDENT"),
  attemptController.createAttempt
);

router.get(
  "/mine",
  protect,
  authorize("STUDENT"),
  attemptController.getMyAttempts
);

router.get(
  "/",
  protect,
  authorize("ADMIN", "PROFESSOR"),
  attemptController.getAllAttempts
);

router.get(
  "/:id",
  protect,
  authorize("ADMIN", "PROFESSOR", "STUDENT"),
  attemptController.getAttemptById
);

router.patch(
  "/:id",
  protect,
  authorize("ADMIN", "PROFESSOR"),
  attemptController.updateAttempt
);

router.delete(
  "/:id",
  protect,
  authorize("ADMIN"),
  attemptController.deleteAttempt
);

module.exports = router;
