// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-11
// Archivo: enrollmentController.js (con flujo de inscripción por código)
// ═══════════════════════════════════════════════════════════════════════════════

const prisma = require("../models");

// ────────────────────────────────────────────────────────────────────────────────
// 1️⃣ Estudiante se une a un curso usando código
// ────────────────────────────────────────────────────────────────────────────────
const joinCourseByCode = async (req, res) => {
  const { code } = req.body;
  const studentId = req.user.id;

  if (!code)
    return res
      .status(400)
      .json({ message: "El código del curso es requerido." });

  try {
    const course = await prisma.course.findUnique({ where: { code } });
    if (!course)
      return res.status(404).json({ message: "Curso no encontrado." });

    const existing = await prisma.enrollment.findFirst({
      where: { studentId, courseId: course.id },
    });
    if (existing)
      return res.status(400).json({
        message: "Ya tienes una solicitud o inscripción en este curso.",
      });

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        courseId: course.id,
        status: "PENDING", // Esperando aprobación del profesor
      },
      include: {
        course: { select: { id: true, title: true, code: true } },
      },
    });

    res.status(201).json({
      message: "Solicitud enviada. Esperando aprobación del profesor.",
      enrollment,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error al unirse al curso.",
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// 2️⃣ Profesor aprueba o rechaza solicitud de inscripción
// ────────────────────────────────────────────────────────────────────────────────
const approveEnrollment = async (req, res) => {
  const enrollmentId = Number(req.params.id);
  const { status } = req.body;

  if (isNaN(enrollmentId))
    return res.status(400).json({ message: "ID de inscripción inválido." });

  if (!["APPROVED", "REJECTED"].includes(status))
    return res.status(400).json({ message: "Estado inválido." });

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: { select: { professorId: true } } },
    });

    if (!enrollment)
      return res.status(404).json({ message: "Inscripción no encontrada." });

    if (
      req.user.role !== "ADMIN" &&
      req.user.id !== enrollment.course.professorId
    )
      return res
        .status(403)
        .json({ message: "No tienes permiso para modificar esta solicitud." });

    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status },
      include: {
        student: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, code: true } },
      },
    });

    res.json({
      message:
        status === "APPROVED"
          ? "Estudiante aprobado correctamente."
          : "Solicitud rechazada.",
      enrollment: updated,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error al aprobar o rechazar inscripción.",
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// 3️⃣ Obtener inscripciones (según rol)
// ────────────────────────────────────────────────────────────────────────────────
const getEnrollments = async (req, res) => {
  try {
    let where = {};
    if (req.user.role === "STUDENT") where.studentId = req.user.id;
    else if (req.user.role === "PROFESSOR")
      where.course = { professorId: req.user.id };

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener las inscripciones.",
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// 4️⃣ Eliminar inscripción (admin o profesor)
// ────────────────────────────────────────────────────────────────────────────────
const deleteEnrollment = async (req, res) => {
  const enrollmentId = Number(req.params.id);
  if (isNaN(enrollmentId))
    return res.status(400).json({ message: "ID de inscripción inválido." });

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: { select: { professorId: true } } },
    });
    if (!enrollment)
      return res.status(404).json({ message: "Inscripción no encontrada." });

    if (
      req.user.role !== "ADMIN" &&
      req.user.id !== enrollment.course.professorId
    )
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar esta inscripción." });

    await prisma.enrollment.delete({ where: { id: enrollmentId } });
    res.json({ message: "Inscripción eliminada correctamente." });
  } catch (error) {
    res.status(400).json({
      message: "Error al eliminar la inscripción.",
      error: error.message,
    });
  }
};

module.exports = {
  joinCourseByCode,
  approveEnrollment,
  getEnrollments,
  deleteEnrollment,
};
