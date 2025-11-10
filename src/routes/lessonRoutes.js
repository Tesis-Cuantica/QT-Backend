// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: lessonRoutes.js
// ═══════════════════════════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();
const lessonController = require("../controllers/lessonController");
const { protect, authorize } = require("../middleware/auth");

router
  .route("/modules/:moduleId")
  .get(
    protect,
    authorize("STUDENT", "PROFESSOR", "ADMIN"),
    lessonController.getLessonsByModule
  )
  .post(
    protect,
    authorize("PROFESSOR", "ADMIN"),
    lessonController.createLesson
  );

router
  .route("/:id")
  .get(
    protect,
    authorize("STUDENT", "PROFESSOR", "ADMIN"),
    lessonController.getLessonById
  )
  .patch(
    protect,
    authorize("PROFESSOR", "ADMIN"),
    lessonController.updateLesson
  )
  .delete(
    protect,
    authorize("PROFESSOR", "ADMIN"),
    lessonController.deleteLesson
  );

module.exports = router;
