// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-11
// Archivo: enrollmentRoutes.js
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const enrollmentController = require("../controllers/enrollmentController");
const { protect, authorize } = require("../middleware/auth");

router.post(
  "/join",
  protect,
  authorize("STUDENT"),
  enrollmentController.joinCourseByCode
);

router.get(
  "/",
  protect,
  authorize("ADMIN", "PROFESSOR", "STUDENT"),
  enrollmentController.getEnrollments
);

router.patch(
  "/:id/approve",
  protect,
  authorize("PROFESSOR", "ADMIN"),
  enrollmentController.approveEnrollment
);

router.delete(
  "/:id",
  protect,
  authorize("PROFESSOR", "ADMIN"),
  enrollmentController.deleteEnrollment
);

module.exports = router;
