// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: server.js
// ═══════════════════════════════════════════════════════════════════════════════
require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const listRoutes = require("express-list-routes");

const certificateRoutes = require("./routes/certificateRoutes");
const authRoutes = require("./routes/authRoutes");
const courseRoutes = require("./routes/courseRoutes");
const moduleRoutes = require("./routes/moduleRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const labRoutes = require("./routes/labRoutes");
const examRoutes = require("./routes/examRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const reportRoutes = require("./routes/reportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const professorRoutes = require("./routes/professorRoutes");
const studentRoutes = require("./routes/studentRoutes");
const questionRoutes = require("./routes/questionRoutes");
const attemptRoutes = require("./routes/attemptRoutes");
const app = express();
app.use(cors());
app.use(express.json());

const routers = [
  ["/api/auth", authRoutes],
  ["/api/courses", courseRoutes],
  ["/api/modules", moduleRoutes],
  ["/api/lessons", lessonRoutes],
  ["/api/labs", labRoutes],
  ["/api/exams", examRoutes],
  ["/api/enrollments", enrollmentRoutes],
  ["/api/certificates", certificateRoutes],
  ["/api/reports", reportRoutes],
  ["/api/admin", adminRoutes],
  ["/api/professor", professorRoutes],
  ["/api/students", studentRoutes],
  ["/api/questions", questionRoutes],
  ["/api/attempts", attemptRoutes],
];

routers.forEach(([base, router]) => {
  app.use(base, router);
  console.log(`✅ Montado correctamente: ${base}`);
});

app.use("/public", express.static(path.join(__dirname, "../public")));

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "QuantumTec Backend is running" });
});

console.log("\n Endpoints detectados:");
listRoutes(app, { prefix: "" });

const fs = require("fs");
const output = listRoutes(app, { prefix: "", logger: false });
fs.writeFileSync("routes.json", JSON.stringify(output, null, 2));
console.log("Endpoints guardados en routes.json\n");

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ QuantumTec Backend corriendo en http://localhost:${PORT}`);
});
