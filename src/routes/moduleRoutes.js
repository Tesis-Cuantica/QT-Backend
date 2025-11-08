const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  createModule,
  getModulesByCourse,
  getModuleById,
  updateModule,
  deleteModule,
} = require("../controllers/moduleController");

const router = express.Router();

router.get("/course/:courseId", protect, getModulesByCourse);
router.get("/:id", protect, getModuleById);

router.post("/", protect, authorize("PROFESSOR", "ADMIN"), createModule);
router.put("/:id", protect, authorize("PROFESSOR", "ADMIN"), updateModule);
router.delete("/:id", protect, authorize("PROFESSOR", "ADMIN"), deleteModule);

module.exports = router;
