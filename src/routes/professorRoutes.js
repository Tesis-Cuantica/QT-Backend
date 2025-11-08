const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  getMyCourses,
  getPendingAttempts,
  gradeAttempt,
} = require("../controllers/professorController");

const router = express.Router();

router.get("/courses", protect, authorize("PROFESSOR"), getMyCourses);
router.get(
  "/attempts/pending",
  protect,
  authorize("PROFESSOR"),
  getPendingAttempts
);
router.post("/attempts/grade", protect, authorize("PROFESSOR"), gradeAttempt);

module.exports = router;
