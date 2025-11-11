// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-11
// Archivo: attemptController.js
// ═══════════════════════════════════════════════════════════════════════════════
const prisma = require("../models");

// Crear intento (solo estudiantes)
const createAttempt = async (req, res) => {
  const examId = Number(req.params.examId);
  const studentId = req.user.id;
  const { answers } = req.body;

  if (isNaN(examId))
    return res.status(400).json({ message: "ID de examen inválido." });

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        module: {
          include: {
            course: { include: { enrollments: { where: { studentId } } } },
          },
        },
      },
    });

    if (!exam)
      return res.status(404).json({ message: "Examen no encontrado." });
    if (!exam.published)
      return res.status(403).json({ message: "El examen no está publicado." });
    if (exam.module.course.enrollments.length === 0)
      return res
        .status(403)
        .json({ message: "No estás inscrito en este curso." });

    const attempts = await prisma.examAttempt.count({
      where: { studentId, examId },
    });
    if (attempts >= exam.maxAttempts)
      return res.status(400).json({ message: "Límite de intentos alcanzado." });

    const attempt = await prisma.examAttempt.create({
      data: {
        studentId,
        examId,
        answers: JSON.stringify(answers || {}),
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
      include: {
        exam: { select: { id: true, title: true } },
      },
    });

    res.status(201).json(attempt);
  } catch (error) {
    res.status(400).json({
      message: "Error al crear el intento.",
      error: error.message,
    });
  }
};

// Obtener todos los intentos (ADMIN o PROFESSOR)
const getAllAttempts = async (req, res) => {
  try {
    const { examId, studentId, status } = req.query;

    let where = {};
    if (examId) where.examId = Number(examId);
    if (studentId) where.studentId = Number(studentId);
    if (status) where.status = status;

    // Si es profesor, solo ve sus exámenes
    if (req.user.role === "PROFESSOR") {
      where.exam = { authorId: req.user.id };
    }

    const attempts = await prisma.examAttempt.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true } },
        exam: { select: { id: true, title: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    res.json(attempts);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener los intentos.",
      error: error.message,
    });
  }
};

// Obtener intento por ID
const getAttemptById = async (req, res) => {
  const aid = Number(req.params.id);
  if (isNaN(aid))
    return res.status(400).json({ message: "ID de intento inválido." });

  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: aid },
      include: {
        student: { select: { id: true, name: true } },
        exam: {
          include: {
            questions: { orderBy: { order: "asc" } },
            module: {
              include: {
                course: { select: { title: true, professorId: true } },
              },
            },
          },
        },
      },
    });

    if (!attempt)
      return res.status(404).json({ message: "Intento no encontrado." });

    const isOwner = attempt.studentId === req.user.id;
    const isProfessor = attempt.exam.module.course.professorId === req.user.id;

    if (!isOwner && !isProfessor && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "No tienes acceso a este intento." });
    }

    res.json(attempt);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el intento.",
      error: error.message,
    });
  }
};

// Obtener intentos del estudiante autenticado
const getMyAttempts = async (req, res) => {
  try {
    const studentId = req.user.id;

    const attempts = await prisma.examAttempt.findMany({
      where: { studentId },
      include: {
        exam: { select: { id: true, title: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    return res.json(attempts);
  } catch (error) {
    res.status(400).json({
      message: "Error al obtener tus intentos.",
      error: error.message,
    });
  }
};

// Actualizar intento (profesor o admin)
const updateAttempt = async (req, res) => {
  const aid = Number(req.params.id);
  const { score, feedback, status } = req.body;

  if (isNaN(aid))
    return res.status(400).json({ message: "ID de intento inválido." });

  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: aid },
      include: { exam: { select: { authorId: true } } },
    });

    if (!attempt)
      return res.status(404).json({ message: "Intento no encontrado." });

    if (req.user.role !== "ADMIN" && attempt.exam.authorId !== req.user.id) {
      return res.status(403).json({
        message: "No tienes permiso para modificar este intento.",
      });
    }

    const updated = await prisma.examAttempt.update({
      where: { id: aid },
      data: {
        ...(score !== undefined && { score }),
        ...(feedback && { feedback }),
        ...(status && { status }),
      },
    });

    res.json({
      message: "Intento actualizado correctamente.",
      data: updated,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error al actualizar el intento.",
      error: error.message,
    });
  }
};

// Eliminar intento (solo admin)
const deleteAttempt = async (req, res) => {
  const aid = Number(req.params.id);
  if (isNaN(aid))
    return res.status(400).json({ message: "ID de intento inválido." });

  try {
    await prisma.examAttempt.delete({ where: { id: aid } });
    res.json({ message: "Intento eliminado correctamente." });
  } catch (error) {
    res.status(400).json({
      message: "Error al eliminar el intento.",
      error: error.message,
    });
  }
};

module.exports = {
  createAttempt,
  getAllAttempts,
  getAttemptById,
  getMyAttempts,
  updateAttempt,
  deleteAttempt,
};
