// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: pdfService.js
// ═══════════════════════════════════════════════════════════════════════════════

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const generateCertificate = (studentName, courseTitle, date) => {
  const doc = new PDFDocument({ size: "LETTER", margin: 100 });
  const fileName = `certificado_${Date.now()}.pdf`;
  const filePath = path.join(__dirname, "../../public/certificates", fileName);

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const writeStream = fs.createWriteStream(filePath);

  doc.font("Helvetica-Bold");
  doc.fontSize(24).text("CERTIFICADO DE FINALIZACIÓN", { align: "center" });
  doc.moveDown(2);

  doc.fontSize(16).text("Este certifica que", { align: "center" });
  doc.moveDown(0.5);

  doc.fontSize(20).fillColor("#333").text(studentName, { align: "center" });
  doc.moveDown(1);

  doc
    .fontSize(16)
    .fillColor("#000")
    .text(`ha completado satisfactoriamente el curso:\n\n"${courseTitle}"`, {
      align: "center",
    });
  doc.moveDown(2);

  doc
    .fontSize(14)
    .text(`Fecha de emisión: ${new Date(date).toLocaleDateString("es-ES")}`, {
      align: "center",
    });
  doc.moveDown(3);

  doc
    .fontSize(12)
    .text("QuantumTec LMS — Aprendizaje en Computación Cuántica", {
      align: "center",
    });

  doc.pipe(writeStream);
  doc.end();

  return { filePath, fileName };
};

module.exports = { generateCertificate };
