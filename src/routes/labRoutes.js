const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  createLab,
  getLabsByModule,
  getLabById,
  updateLab,
  deleteLab,
  runSimulation,
  saveStudentLab,
} = require("../controllers/labController");

const router = express.Router();

router.get("/module/:moduleId", protect, getLabsByModule);
router.get("/:id", protect, getLabById);

router.post("/simulate", protect, runSimulation);
router.post("/save", protect, saveStudentLab);

router.post("/", protect, authorize("PROFESSOR", "ADMIN"), createLab);
router.put("/:id", protect, authorize("PROFESSOR", "ADMIN"), updateLab);
router.delete("/:id", protect, authorize("PROFESSOR", "ADMIN"), deleteLab);

module.exports = router;
