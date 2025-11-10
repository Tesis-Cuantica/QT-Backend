// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: examController.js (versión final corregida)
// ═══════════════════════════════════════════════════════════════════════════════

const prisma = require("../models");

// ───────────────────────────────────────────────────────────────────────────────
// Crear examen
// ───────────────────────────────────────────────────────────────────────────────
const createExam = async (req, res) => {
  const {
    title,
    description,
    timeLimit,
    maxAttempts,
    passingScore,
    published,
    availableFrom,
    availableTo,
    questions,
  } = req.body;

  const { moduleId } = req.params;
  const mid = Number(moduleId);
  if (isNaN(mid))
    return res.status(400).json({ message: "ID de módulo inválido." });

  try {
    const module = await prisma.module.findUnique({
      where: { id: mid },
      include: { course: { select: { professorId: true } } },
    });

    if (!module)
      return res.status(404).json({ message: "Módulo no encontrado." });

    if (req.user.role !== "ADMIN" && module.course.professorId !== req.user.id)
      return res.status(403).json({
        message: "No tienes permiso para crear exámenes en este módulo.",
      });

    const validTypes = [
      "MULTIPLE_CHOICE",
      "SHORT_ANSWER",
      "ESSAY",
      "QUANTUM_SIMULATION",
    ];

    for (const [i, q] of questions.entries()) {
      if (!q.text)
        return res
          .status(400)
          .json({ message: `Pregunta ${i + 1}: texto requerido.` });
      if (!validTypes.includes(q.type))
        return res
          .status(400)
          .json({ message: `Pregunta ${i + 1}: tipo inválido.` });
      if (
        ["MULTIPLE_CHOICE", "QUANTUM_SIMULATION"].includes(q.type) &&
        !q.options
      )
        return res
          .status(400)
          .json({ message: `Pregunta ${i + 1}: opciones requeridas.` });
      if (
        ["SHORT_ANSWER", "MULTIPLE_CHOICE", "QUANTUM_SIMULATION"].includes(
          q.type
        ) &&
        q.correct == null
      )
        return res.status(400).json({
          message: `Pregunta ${i + 1}: respuesta correcta requerida.`,
        });
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        description: description || null,
        timeLimit: timeLimit || 60, // valor por defecto (en minutos)
        maxAttempts: maxAttempts || 1,
        passingScore: passingScore || 70,
        published: published || false,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableTo: availableTo ? new Date(availableTo) : null,
        module: { connect: { id: mid } },
        author: { connect: { id: req.user.id } },
        questions: {
          create: questions.map((q, index) => ({
            type: q.type,
            text: q.text,
            options: q.options ? JSON.stringify(q.options) : null,
            correct: JSON.stringify(q.correct),
            points: typeof q.points === "number" ? q.points : 1,
            order: typeof q.order === "number" ? q.order : index + 1,
          })),
        },
      },
      include: {
        author: { select: { name: true } },
        questions: { orderBy: { order: "asc" } },
      },
    });

    res.status(201).json(exam);
  } catch (error) {
    res.status(400).json({
      message: "Error al crear el examen.",
      error: error.message,
    });
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// Obtener exámenes por módulo
// ───────────────────────────────────────────────────────────────────────────────
const getExamsByModule = async (req, res) => {
  const mid = Number(req.params.moduleId);
  if (isNaN(mid))
    return res.status(400).json({ message: "ID de módulo inválido." });

  try {
    const module = await prisma.module.findUnique({
      where: { id: mid },
      include: {
        course: {
          include: { enrollments: { where: { studentId: req.user.id } } },
        },
      },
    });

    if (!module)
      return res.status(404).json({ message: "Módulo no encontrado." });

    let where = { moduleId: mid };

    if (req.user.role === "STUDENT") {
      const isEnrolled = module.course.enrollments.length > 0;
      if (!isEnrolled && module.course.status !== "ACTIVE")
        return res
          .status(403)
          .json({ message: "No tienes acceso a este examen." });

      const now = new Date();
      where.published = true;
      where.OR = [
        { availableFrom: null, availableTo: null },
        { availableFrom: { lte: now }, availableTo: null },
        { availableFrom: null, availableTo: { gte: now } },
        { availableFrom: { lte: now }, availableTo: { gte: now } },
      ];
    }

    const exams = await prisma.exam.findMany({
      where,
      include: {
        questions:
          req.user.role === "STUDENT"
            ? {
                select: {
                  id: true,
                  type: true,
                  text: true,
                  options: true,
                  points: true,
                  order: true,
                },
                orderBy: { order: "asc" },
              }
            : { orderBy: { order: "asc" } },
        _count: { select: { attempts: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(exams);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener los exámenes.",
      error: error.message,
    });
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// Obtener examen por ID
// ───────────────────────────────────────────────────────────────────────────────
const getExamById = async (req, res) => {
  const eid = Number(req.params.id);
  if (isNaN(eid))
    return res.status(400).json({ message: "ID de examen inválido." });

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: eid },
      include: {
        module: {
          include: {
            course: {
              include: { enrollments: { where: { studentId: req.user.id } } },
            },
          },
        },
        questions:
          req.user.role === "STUDENT"
            ? {
                select: {
                  id: true,
                  type: true,
                  text: true,
                  options: true,
                  points: true,
                  order: true,
                },
                orderBy: { order: "asc" },
              }
            : { orderBy: { order: "asc" } },
      },
    });

    if (!exam)
      return res.status(404).json({ message: "Examen no encontrado." });

    if (req.user.role === "STUDENT") {
      const isEnrolled = exam.module.course.enrollments.length > 0;
      if (!isEnrolled && exam.module.course.status !== "ACTIVE")
        return res
          .status(403)
          .json({ message: "No tienes acceso a este examen." });
      if (!exam.published)
        return res
          .status(403)
          .json({ message: "Este examen no está publicado." });

      const now = new Date();
      if (exam.availableFrom && new Date(exam.availableFrom) > now)
        return res
          .status(403)
          .json({ message: "El examen aún no está disponible." });
      if (exam.availableTo && new Date(exam.availableTo) < now)
        return res
          .status(403)
          .json({ message: "El examen ya no está disponible." });
    }

    res.json(exam);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el examen.",
      error: error.message,
    });
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// Actualizar examen
// ───────────────────────────────────────────────────────────────────────────────
const updateExam = async (req, res) => {
  const eid = Number(req.params.id);
  if (isNaN(eid))
    return res.status(400).json({ message: "ID de examen inválido." });

  const {
    title,
    description,
    timeLimit,
    maxAttempts,
    passingScore,
    published,
    availableFrom,
    availableTo,
  } = req.body;

  try {
    const existing = await prisma.exam.findUnique({ where: { id: eid } });
    if (!existing)
      return res.status(404).json({ message: "Examen no encontrado." });

    if (req.user.role !== "ADMIN" && existing.authorId !== req.user.id)
      return res
        .status(403)
        .json({ message: "No tienes permiso para editar este examen." });

    const updated = await prisma.exam.update({
      where: { id: eid },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(timeLimit && { timeLimit }),
        ...(maxAttempts && { maxAttempts }),
        ...(passingScore && { passingScore }),
        ...(published !== undefined && { published }),
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableTo: availableTo ? new Date(availableTo) : null,
      },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({
      message: "Error al actualizar el examen.",
      error: error.message,
    });
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// Eliminar examen
// ───────────────────────────────────────────────────────────────────────────────
const deleteExam = async (req, res) => {
  const eid = Number(req.params.id);
  if (isNaN(eid))
    return res.status(400).json({ message: "ID de examen inválido." });

  try {
    const exam = await prisma.exam.findUnique({ where: { id: eid } });
    if (!exam)
      return res.status(404).json({ message: "Examen no encontrado." });

    if (req.user.role !== "ADMIN" && exam.authorId !== req.user.id)
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar este examen." });

    await prisma.exam.delete({ where: { id: eid } });
    res.json({ message: "Examen eliminado correctamente." });
  } catch (error) {
    res.status(400).json({
      message: "Error al eliminar el examen.",
      error: error.message,
    });
  }
};

module.exports = {
  createExam,
  getExamsByModule,
  getExamById,
  updateExam,
  deleteExam,
};
