const prisma = require("../models");

const createExam = async (req, res) => {
  const {
    moduleId,
    title,
    description,
    timeLimit,
    maxAttempts = 1,
    passingScore = 70,
    published = false,
    availableFrom,
    availableTo,
    questions = [],
  } = req.body;

  try {
    const module = await prisma.module.findUnique({
      where: { id: parseInt(moduleId) },
      include: { course: { select: { professorId: true } } },
    });

    if (!module)
      return res.status(404).json({ message: "Módulo no encontrado." });
    if (
      req.user.role !== "ADMIN" &&
      module.course.professorId !== req.user.id
    ) {
      return res.status(403).json({
        message: "No tienes permiso para crear exámenes en este módulo.",
      });
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        description,
        timeLimit,
        maxAttempts,
        passingScore,
        published,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableTo: availableTo ? new Date(availableTo) : null,
        module: { connect: { id: parseInt(moduleId) } },
        author: { connect: { id: req.user.id } },
        questions: {
          create: questions.map((q, index) => ({
            type: q.type,
            text: q.text,
            options: q.options ? JSON.stringify(q.options) : null,
            correct: JSON.stringify(q.correct),
            points: q.points || 1.0,
            order: q.order || index + 1,
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
    res
      .status(400)
      .json({ message: "Error al crear el examen.", error: error.message });
  }
};

const getExamsByModule = async (req, res) => {
  const { moduleId } = req.params;
  const now = new Date();

  try {
    const module = await prisma.module.findUnique({
      where: { id: parseInt(moduleId) },
      include: { course: { include: { enrollments: true } } },
    });

    if (!module)
      return res.status(404).json({ message: "Módulo no encontrado." });

    let where = { moduleId: parseInt(moduleId) };

    if (req.user.role === "STUDENT") {
      const isEnrolled = module.course.enrollments.some(
        (e) => e.studentId === req.user.id
      );
      if (!isEnrolled && module.course.status !== "ACTIVE") {
        return res
          .status(403)
          .json({ message: "No tienes acceso a este examen." });
      }

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

const getExamById = async (req, res) => {
  const { id } = req.params;
  const now = new Date();

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(id) },
      include: {
        module: {
          include: { course: { include: { enrollments: true } } },
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
      const isEnrolled = exam.module.course.enrollments.some(
        (e) => e.studentId === req.user.id
      );
      if (!isEnrolled && exam.module.course.status !== "ACTIVE") {
        return res
          .status(403)
          .json({ message: "No tienes acceso a este examen." });
      }
      if (!exam.published)
        return res
          .status(403)
          .json({ message: "Este examen no está publicado." });
      if (exam.availableFrom && exam.availableFrom > now)
        return res
          .status(403)
          .json({ message: "El examen aún no está disponible." });
      if (exam.availableTo && exam.availableTo < now)
        return res
          .status(403)
          .json({ message: "El examen ya no está disponible." });
    }

    res.json(exam);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener el examen.", error: error.message });
  }
};

const updateExam = async (req, res) => {
  const { id } = req.params;
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
    const existing = await prisma.exam.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existing)
      return res.status(404).json({ message: "Examen no encontrado." });
    if (req.user.role !== "ADMIN" && existing.authorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para editar este examen." });
    }

    const updated = await prisma.exam.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        timeLimit,
        maxAttempts,
        passingScore,
        published,
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

const deleteExam = async (req, res) => {
  const { id } = req.params;

  try {
    const exam = await prisma.exam.findUnique({ where: { id: parseInt(id) } });
    if (!exam)
      return res.status(404).json({ message: "Examen no encontrado." });
    if (req.user.role !== "ADMIN" && exam.authorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar este examen." });
    }

    await prisma.exam.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Examen eliminado correctamente." });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al eliminar el examen.", error: error.message });
  }
};

module.exports = {
  createExam,
  getExamsByModule,
  getExamById,
  updateExam,
  deleteExam,
};
