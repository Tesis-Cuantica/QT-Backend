const express = require("express");
const router = express.Router();
const certificateController = require("../controllers/certificateController");
const { protect } = require("../middleware/auth");

router
  .route("/courses/:courseId")
  .post(protect, certificateController.generateCertificateForCourse);

router
  .route("/download/:fileName")
  .get(certificateController.downloadCertificate);

module.exports = router;
