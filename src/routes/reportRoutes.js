const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { protect } = require("../middleware/auth");

router.route("/student").get(protect, reportController.getStudentDashboard);

router.route("/professor").get(protect, reportController.getProfessorDashboard);

router.route("/admin").get(protect, reportController.getAdminDashboard);

module.exports = router;
