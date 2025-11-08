const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  enrollInCourse,
  getMyEnrollments,
  updateProgress,
  getProgress,
} = require("../controllers/enrollmentController");

const router = express.Router();

router.post("/", protect, authorize("STUDENT"), enrollInCourse);
router.get("/me", protect, authorize("STUDENT"), getMyEnrollments);
router.post("/progress", protect, authorize("STUDENT"), updateProgress);
router.get("/progress/:courseId", protect, authorize("STUDENT"), getProgress);

module.exports = router;
