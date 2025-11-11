// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: moduleRoutes.js
// ═══════════════════════════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();
const moduleController = require("../controllers/moduleController");
const { protect, authorize } = require("../middleware/auth");

router
  .route("/courses/:courseId")
  .get(protect, moduleController.getModulesByCourse)
  .post(
    protect,
    authorize("ADMIN", "PROFESSOR"),
    moduleController.createModule
  );

router
  .route("/:id")
  .get(protect, moduleController.getModuleById)
  .patch(
    protect,
    authorize("ADMIN", "PROFESSOR"),
    moduleController.updateModule
  )
  .delete(
    protect,
    authorize("ADMIN", "PROFESSOR"),
    moduleController.deleteModule
  );

module.exports = router;
