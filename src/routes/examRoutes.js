// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: examRoutes.js
// ═══════════════════════════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");
const { protect, authorize } = require("../middleware/auth");

router
  .route("/modules/:moduleId")
  .get(
    protect,
    authorize("STUDENT", "PROFESSOR", "ADMIN"),
    examController.getExamsByModule
  )
  .post(protect, authorize("PROFESSOR", "ADMIN"), examController.createExam);

router
  .route("/:id")
  .get(
    protect,
    authorize("STUDENT", "PROFESSOR", "ADMIN"),
    examController.getExamById
  )
  .patch(protect, authorize("PROFESSOR", "ADMIN"), examController.updateExam)
  .delete(protect, authorize("PROFESSOR", "ADMIN"), examController.deleteExam);

module.exports = router;
