// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-11
// Archivo: reportRoutes.js
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const reportController = require("../controllers/reportController");

router.get(
  "/admin",
  protect,
  authorize("ADMIN"),
  reportController.getAdminReport
);

router.get(
  "/professor",
  protect,
  authorize("ADMIN", "PROFESSOR"),
  reportController.getProfessorReport
);

router.get(
  "/professor/:id",
  protect,
  authorize("ADMIN"),
  reportController.getProfessorReport
);

router.get(
  "/student",
  protect,
  authorize("ADMIN", "STUDENT"),
  reportController.getStudentReport
);

router.get(
  "/student/:id",
  protect,
  authorize("ADMIN"),
  reportController.getStudentReport
);

module.exports = router;
