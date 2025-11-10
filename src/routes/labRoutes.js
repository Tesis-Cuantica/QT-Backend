// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: labRoutes.js
// ═══════════════════════════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();
const labController = require("../controllers/labController");
const { protect, authorize } = require("../middleware/auth");

router
  .route("/modules/:moduleId")
  .get(
    protect,
    authorize("STUDENT", "PROFESSOR", "ADMIN"),
    labController.getLabsByModule
  )
  .post(protect, authorize("PROFESSOR", "ADMIN"), labController.createLab);

router
  .route("/:id")
  .get(
    protect,
    authorize("STUDENT", "PROFESSOR", "ADMIN"),
    labController.getLabById
  )
  .patch(protect, authorize("PROFESSOR", "ADMIN"), labController.updateLab)
  .delete(protect, authorize("PROFESSOR", "ADMIN"), labController.deleteLab);

router
  .route("/simulate")
  .post(
    protect,
    authorize("STUDENT", "PROFESSOR", "ADMIN"),
    labController.runSimulation
  );

router
  .route("/student-labs")
  .post(protect, authorize("STUDENT"), labController.saveStudentLab);

module.exports = router;
