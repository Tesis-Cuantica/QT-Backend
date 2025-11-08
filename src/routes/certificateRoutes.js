const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  generateCertificateForCourse,
  downloadCertificate,
} = require("../controllers/certificateController");

const router = express.Router();

router.post(
  "/course/:courseId",
  protect,
  authorize("STUDENT"),
  generateCertificateForCourse
);
router.get("/download/:fileName", protect, downloadCertificate);

module.exports = router;
