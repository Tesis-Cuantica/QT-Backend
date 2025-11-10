const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { protect, authorize } = require("../middleware/auth");

router.get(
  "/student",
  protect,
  authorize("STUDENT"),
  reportController.getStudentProgress
);

router.get(
  "/professor",
  protect,
  authorize("PROFESSOR"),
  reportController.getProfessorDashboard
);

router.get(
  "/admin",
  protect,
  authorize("ADMIN"),
  reportController.getAdminDashboard
);

module.exports = router;
