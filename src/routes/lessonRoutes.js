// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: lessonRoutes.js
// ═══════════════════════════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();
const lessonController = require("../controllers/lessonController");
const { protect, authorize } = require("../middleware/auth");

router.post(
  "/",
  protect,
  authorize("ADMIN", "PROFESSOR"),
  lessonController.createLesson
);

router
  .route("/:id")
  .get(protect, lessonController.getLessonById)
  .patch(
    protect,
    authorize("ADMIN", "PROFESSOR"),
    lessonController.updateLesson
  )
  .delete(
    protect,
    authorize("ADMIN", "PROFESSOR"),
    lessonController.deleteLesson
  );

router.get("/module/:moduleId", protect, lessonController.getLessonsByModule);

module.exports = router;
