const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} = require("../controllers/courseController");

const router = express.Router();

router.get("/", protect, getCourses);
router.get("/:id", protect, getCourseById);

router.post("/", protect, authorize("PROFESSOR", "ADMIN"), createCourse);
router.put("/:id", protect, authorize("PROFESSOR", "ADMIN"), updateCourse);
router.delete("/:id", protect, authorize("PROFESSOR", "ADMIN"), deleteCourse);

module.exports = router;
