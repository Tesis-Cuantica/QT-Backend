// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: server.js
// ═══════════════════════════════════════════════════════════════════════════════
require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const certificateRoutes = require("./routes/certificateRoutes");
const authRoutes = require("./routes/authRoutes");
const courseRoutes = require("./routes/courseRoutes");
const moduleRoutes = require("./routes/moduleRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const labRoutes = require("./routes/labRoutes");
const examRoutes = require("./routes/examRoutes");
const examAttemptRoutes = require("./routes/examAttemptRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const reportRoutes = require("./routes/reportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const professorRoutes = require("./routes/professorRoutes");
const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/labs", labRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/attempts", examAttemptRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/professor", professorRoutes);
app.use("/public", express.static(path.join(__dirname, "../public")));
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "QuantumTec Backend is running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ QuantumTec Backend corriendo en http://localhost:${PORT}`);
});
