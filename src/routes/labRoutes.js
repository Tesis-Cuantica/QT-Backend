// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: labRoutes.js
// ═══════════════════════════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();
const labController = require("../controllers/labController");
const { protect, authorize } = require("../middleware/auth");

router.post(
  "/",
  protect,
  authorize("ADMIN", "PROFESSOR"),
  labController.createLab
);
router.get("/modules/:moduleId", protect, labController.getLabsByModule);
router.get("/:id", protect, labController.getLabById);
router.patch(
  "/:id",
  protect,
  authorize("ADMIN", "PROFESSOR"),
  labController.updateLab
);
router.delete(
  "/:id",
  protect,
  authorize("ADMIN", "PROFESSOR"),
  labController.deleteLab
);

// extra endpoints
router.post("/simulate", protect, labController.runSimulation);
router.post(
  "/student/save",
  protect,
  authorize("STUDENT"),
  labController.saveStudentLab
);

module.exports = router;
