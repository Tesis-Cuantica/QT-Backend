// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-11
// Archivo: questionController.js
// ═══════════════════════════════════════════════════════════════════════════════

const prisma = require("../models");

const createQuestion = async (req, res) => {
  const eid = Number(req.params.examId);
  const { text, type, options, correct, points = 1, order } = req.body;

  if (isNaN(eid))
    return res.status(400).json({ message: "ID de examen inválido." });

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: eid },
      include: { module: { include: { course: true } } },
    });

    if (!exam)
      return res.status(404).json({ message: "Examen no encontrado." });

    if (
      req.user.role !== "ADMIN" &&
      exam.module.course.professorId !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: "No puedes agregar preguntas a este examen." });
    }

    const validTypes = [
      "MULTIPLE_CHOICE",
      "SHORT_ANSWER",
      "ESSAY",
      "QUANTUM_SIMULATION",
    ];
    if (!validTypes.includes(type))
      return res.status(400).json({ message: "Tipo de pregunta inválido." });

    const question = await prisma.question.create({
      data: {
        examId: eid,
        text,
        type,
        options: options ? JSON.stringify(options) : null,
        correct: correct ? JSON.stringify(correct) : null,
        points,
        order:
          order ||
          (await prisma.question.count({ where: { examId: eid } })) + 1,
      },
      include: { exam: { select: { title: true } } },
    });

    res.status(201).json(question);
  } catch (error) {
    res.status(400).json({
      message: "Error al crear la pregunta.",
      error: error.message,
    });
  }
};

const getQuestionsByExam = async (req, res) => {
  const eid = Number(req.params.examId);
  if (isNaN(eid))
    return res.status(400).json({ message: "ID de examen inválido." });

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: eid },
      include: { module: { include: { course: true } } },
    });

    if (!exam)
      return res.status(404).json({ message: "Examen no encontrado." });

    const questions = await prisma.question.findMany({
      where: { examId: eid },
      orderBy: { order: "asc" },
    });

    // Ocultar respuestas correctas para estudiantes
    if (req.user.role === "STUDENT") {
      const filtered = questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options ? JSON.parse(q.options) : null,
        points: q.points,
        order: q.order,
      }));
      return res.json(filtered);
    }

    // Para admin o profesor
    res.json(
      questions.map((q) => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : null,
        correct: q.correct ? JSON.parse(q.correct) : null,
      }))
    );
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener las preguntas.",
      error: error.message,
    });
  }
};

const updateQuestion = async (req, res) => {
  const qid = Number(req.params.id);
  const { text, type, options, correct, points, order } = req.body;

  if (isNaN(qid))
    return res.status(400).json({ message: "ID de pregunta inválido." });

  try {
    const existing = await prisma.question.findUnique({
      where: { id: qid },
      include: { exam: { include: { module: { include: { course: true } } } } },
    });

    if (!existing)
      return res.status(404).json({ message: "Pregunta no encontrada." });

    if (
      req.user.role !== "ADMIN" &&
      existing.exam.module.course.professorId !== req.user.id
    )
      return res
        .status(403)
        .json({ message: "No puedes editar esta pregunta." });

    const updated = await prisma.question.update({
      where: { id: qid },
      data: {
        ...(text && { text }),
        ...(type && { type }),
        ...(options && { options: JSON.stringify(options) }),
        ...(correct && { correct: JSON.stringify(correct) }),
        ...(points && { points }),
        ...(order && { order }),
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({
      message: "Error al actualizar la pregunta.",
      error: error.message,
    });
  }
};

const deleteQuestion = async (req, res) => {
  const qid = Number(req.params.id);
  if (isNaN(qid))
    return res.status(400).json({ message: "ID de pregunta inválido." });

  try {
    const existing = await prisma.question.findUnique({
      where: { id: qid },
      include: { exam: { include: { module: { include: { course: true } } } } },
    });

    if (!existing)
      return res.status(404).json({ message: "Pregunta no encontrada." });

    if (
      req.user.role !== "ADMIN" &&
      existing.exam.module.course.professorId !== req.user.id
    )
      return res
        .status(403)
        .json({ message: "No puedes eliminar esta pregunta." });

    await prisma.question.delete({ where: { id: qid } });
    res.json({ message: "Pregunta eliminada correctamente." });
  } catch (error) {
    res.status(400).json({
      message: "Error al eliminar la pregunta.",
      error: error.message,
    });
  }
};

module.exports = {
  createQuestion,
  getQuestionsByExam,
  updateQuestion,
  deleteQuestion,
};
