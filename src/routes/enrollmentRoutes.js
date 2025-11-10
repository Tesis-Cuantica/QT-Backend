// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: enrollmentRoutes.js
// ═══════════════════════════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();
const enrollmentController = require("../controllers/enrollmentController");
const { protect, authorize } = require("../middleware/auth");
router
  .route("/")
  .post(protect, authorize("STUDENT"), enrollmentController.enrollInCourse)
  .get(protect, authorize("STUDENT"), enrollmentController.getMyEnrollments);
router
  .route("/progress")
  .put(protect, enrollmentController.updateProgress)
  .get(protect, enrollmentController.getProgress);

router
  .route("/:courseId/progress")
  .get(protect, enrollmentController.getProgress);

module.exports = router;
