// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: certificateRoutes.js
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const {
  generateCertificateForCourse,
  downloadCertificate,
} = require("../controllers/certificateController");
const { protect } = require("../middleware/auth");

router.post("/courses/:courseId", protect, generateCertificateForCourse);

router.get("/download/:fileName", protect, downloadCertificate);

module.exports = router;
