const prisma = require("../models");
const { generateCertificate } = require("../services/pdfService");
const path = require("path");

const generateCertificateForCourse = async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.id;

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: parseInt(studentId),
          courseId: parseInt(courseId),
        },
      },
      include: {
        course: { select: { title: true } },
        student: { select: { name: true } },
      },
    });

    if (!enrollment) {
      return res
        .status(404)
        .json({ message: "No estás inscrito en este curso." });
    }

    if (!enrollment.completed || enrollment.progress < 100) {
      return res
        .status(400)
        .json({ message: "Aún no has completado el curso." });
    }

    const { fileName } = generateCertificate(
      enrollment.student.name,
      enrollment.course.title,
      enrollment.completedAt || new Date()
    );

    res.json({
      message: "Certificado generado exitosamente.",
      downloadUrl: `/api/certificates/download/${fileName}`,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al generar el certificado.",
      error: error.message,
    });
  }
};

const downloadCertificate = async (req, res) => {
  const { fileName } = req.params;
  const filePath = path.join(__dirname, "../../public/certificates", fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Certificado no encontrado." });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.sendFile(filePath);
};

const fs = require("fs");

module.exports = {
  generateCertificateForCourse,
  downloadCertificate,
};
