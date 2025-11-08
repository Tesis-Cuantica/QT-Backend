const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  createLesson,
  getLessonsByModule,
  getLessonById,
  updateLesson,
  deleteLesson,
} = require("../controllers/lessonController");

const router = express.Router();

router.get("/module/:moduleId", protect, getLessonsByModule);
router.get("/:id", protect, getLessonById);

router.post("/", protect, authorize("PROFESSOR", "ADMIN"), createLesson);
router.put("/:id", protect, authorize("PROFESSOR", "ADMIN"), updateLesson);
router.delete("/:id", protect, authorize("PROFESSOR", "ADMIN"), deleteLesson);

module.exports = router;
