const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  getStudentDashboard,
  getProfessorDashboard,
  getAdminDashboard,
} = require("../controllers/reportController");

const router = express.Router();

router.get("/student", protect, authorize("STUDENT"), getStudentDashboard);
router.get(
  "/professor",
  protect,
  authorize("PROFESSOR"),
  getProfessorDashboard
);
router.get("/admin", protect, authorize("ADMIN"), getAdminDashboard);

module.exports = router;
