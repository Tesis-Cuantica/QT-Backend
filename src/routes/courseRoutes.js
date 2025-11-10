// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: courseRoutes.js
// ═══════════════════════════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const { protect } = require("../middleware/auth");

router
  .route("/")
  .get(protect, courseController.getCourses)
  .post(protect, courseController.createCourse);

router
  .route("/:id")
  .get(protect, courseController.getCourseById)
  .patch(protect, courseController.updateCourse)
  .delete(protect, courseController.deleteCourse);
router
  .route("/:id/students")
  .get(protect, courseController.getEnrolledStudents);
module.exports = router;
