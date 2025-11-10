// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: lessonRoutes.js
// ═══════════════════════════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();
const lessonController = require("../controllers/lessonController");
const { protect } = require("../middleware/auth");

router
  .route("/modules/:moduleId")
  .get(protect, lessonController.getLessonsByModule)
  .post(protect, lessonController.createLesson);

router
  .route("/:id")
  .get(protect, lessonController.getLessonById)
  .patch(protect, lessonController.updateLesson)
  .delete(protect, lessonController.deleteLesson);

module.exports = router;
