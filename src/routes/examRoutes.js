const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  createExam,
  getExamsByModule,
  getExamById,
  updateExam,
  deleteExam,
} = require("../controllers/examController");

const router = express.Router();

router.get("/module/:moduleId", protect, getExamsByModule);
router.get("/:id", protect, getExamById);

router.post("/", protect, authorize("PROFESSOR", "ADMIN"), createExam);
router.put("/:id", protect, authorize("PROFESSOR", "ADMIN"), updateExam);
router.delete("/:id", protect, authorize("PROFESSOR", "ADMIN"), deleteExam);

module.exports = router;
