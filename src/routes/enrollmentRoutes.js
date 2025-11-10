const express = require("express");
const router = express.Router();
const enrollmentController = require("../controllers/enrollmentController");
const { protect } = require("../middleware/auth");

router
  .route("/")
  .post(protect, enrollmentController.enrollInCourse)
  .get(protect, enrollmentController.getMyEnrollments);

router
  .route("/progress")
  .put(protect, enrollmentController.updateProgress)
  .get(protect, enrollmentController.getProgress);

router
  .route("/:courseId/progress")
  .get(protect, enrollmentController.getProgress);

module.exports = router;
