// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: moduleRoutes.js
// ═══════════════════════════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();
const moduleController = require("../controllers/moduleController");
const { protect } = require("../middleware/auth");

router
  .route("/courses/:courseId")
  .get(protect, moduleController.getModulesByCourse)
  .post(protect, moduleController.createModule);

router
  .route("/:id")
  .get(protect, moduleController.getModuleById)
  .patch(protect, moduleController.updateModule)
  .delete(protect, moduleController.deleteModule);

module.exports = router;
