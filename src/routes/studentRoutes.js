const express = require("express");
const router = express.Router();
const { completeCourse } = require("../controllers/studentController");
const { protect, authorize } = require("../middleware/auth");

router.patch(
  "/enrollments/:courseId/complete",
  protect,
  authorize("STUDENT"),
  completeCourse
);

module.exports = router;
