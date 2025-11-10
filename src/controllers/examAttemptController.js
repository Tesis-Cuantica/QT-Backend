// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: examAttemptController.js
// ═══════════════════════════════════════════════════════════════════════════════
const prisma = require("../models");

const startAttempt = async (req, res) => {
  const { examId } = req.body;
  const studentId = req.user.id;
  const eid = Number(examId);

  if (isNaN(eid)) {
    return res.status(400).json({ message: "ID de examen inválido." });
  }

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: eid },
      include: {
        module: {
          course: { include: { enrollments: { where: { studentId } } } },
        },
      },
    });

    if (!exam)
      return res.status(404).json({ message: "Examen no encontrado." });
    if (!exam.published)
      return res.status(403).json({ message: "Examen no publicado." });

    const isEnrolled = exam.module.course.enrollments.length > 0;
    if (!isEnrolled)
      return res
        .status(403)
        .json({ message: "No estás inscrito en este curso." });

    const attempts = await prisma.examAttempt.count({
      where: { studentId, examId: eid },
    });
    if (attempts >= exam.maxAttempts) {
      return res
        .status(403)
        .json({ message: "Has alcanzado el límite de intentos." });
    }

    const now = new Date();
    if (exam.availableFrom && new Date(exam.availableFrom) > now) {
      return res
        .status(403)
        .json({ message: "El examen aún no está disponible." });
    }
    if (exam.availableTo && new Date(exam.availableTo) < now) {
      return res
        .status(403)
        .json({ message: "El examen ya no está disponible." });
    }

    const attempt = await prisma.examAttempt.create({
      data: { studentId, examId: eid, answers: "{}", status: "IN_PROGRESS" },
    });
    res.status(201).json(attempt);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al iniciar el intento.", error: error.message });
  }
};

const saveAnswers = async (req, res) => {
  const { attemptId, answers } = req.body;
  const aid = Number(attemptId);

  if (isNaN(aid)) {
    return res.status(400).json({ message: "ID de intento inválido." });
  }

  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: aid },
    });
    if (!attempt || attempt.studentId !== req.user.id) {
      return res.status(404).json({ message: "Intento no encontrado." });
    }
    if (attempt.status !== "IN_PROGRESS") {
      return res.status(400).json({
        message: "No se pueden guardar respuestas en un intento finalizado.",
      });
    }

    await prisma.examAttempt.update({
      where: { id: aid },
      data: { answers: JSON.stringify(answers) },
    });
    res.json({ message: "Respuestas guardadas." });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al guardar respuestas.", error: error.message });
  }
};

const normalizeArray = (arr) => (arr ? arr.map(String).sort().join("|") : "");

const submitExam = async (req, res) => {
  const { attemptId } = req.body;
  const aid = Number(attemptId);

  if (isNaN(aid)) {
    return res.status(400).json({ message: "ID de intento inválido." });
  }

  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: aid },
      include: { exam: { include: { questions: true } } },
    });

    if (!attempt || attempt.studentId !== req.user.id) {
      return res.status(404).json({ message: "Intento no encontrado." });
    }
    if (attempt.status !== "IN_PROGRESS") {
      return res.status(400).json({ message: "El intento ya fue enviado." });
    }

    const answers = JSON.parse(attempt.answers || "{}");
    let totalPoints = 0;
    let earnedPoints = 0;
    let hasManual = false;

    for (const q of attempt.exam.questions) {
      totalPoints += q.points;
      const userAnswer = answers[q.id];

      if (q.type === "ESSAY") {
        hasManual = true;
        continue;
      }

      if (q.type === "SHORT_ANSWER") {
        const expected =
          typeof q.correct === "string" ? q.correct.trim().toLowerCase() : "";
        const given = userAnswer ? String(userAnswer).trim().toLowerCase() : "";
        if (given === expected) {
          earnedPoints += q.points;
        }
      } else if (
        q.type === "MULTIPLE_CHOICE" ||
        q.type === "QUANTUM_SIMULATION"
      ) {
        const expected = normalizeArray(JSON.parse(q.correct));
        const given = normalizeArray(userAnswer);
        if (given === expected) {
          earnedPoints += q.points;
        }
      }
    }

    const score = hasManual
      ? null
      : parseFloat(((earnedPoints / (totalPoints || 1)) * 100).toFixed(2));
    const status = hasManual ? "SUBMITTED" : "GRADED";

    const updated = await prisma.examAttempt.update({
      where: { id: aid },
      data: { submittedAt: new Date(), score, status },
      include: { exam: true },
    });
    res.json(updated);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al enviar el examen.", error: error.message });
  }
};

const getAttempts = async (req, res) => {
  const { examId } = req.params;
  const eid = Number(examId);

  if (isNaN(eid)) {
    return res.status(400).json({ message: "ID de examen inválido." });
  }

  try {
    const attempts = await prisma.examAttempt.findMany({
      where: { studentId: req.user.id, examId: eid },
      orderBy: { startedAt: "desc" },
    });
    res.json(attempts);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener intentos.", error: error.message });
  }
};

const getAttemptById = async (req, res) => {
  const { id } = req.params;
  const aid = Number(id);
  const studentId = req.user.id;

  if (isNaN(aid)) {
    return res.status(400).json({ message: "ID de intento inválido." });
  }

  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: aid },
      include: {
        student: { select: { id: true, name: true } },
        exam: {
          include: {
            questions: { orderBy: { order: "asc" } },
            module: {
              include: { course: { select: { title: true } } },
            },
          },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({ message: "Intento no encontrado." });
    }

    const isOwner = attempt.studentId === studentId;
    const isProfessor = attempt.exam.module.course.professorId === studentId;

    if (!isOwner && !isProfessor) {
      return res
        .status(403)
        .json({ message: "No tienes acceso a este intento." });
    }

    res.json(attempt);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener el intento.", error: error.message });
  }
};

module.exports = {
  startAttempt,
  saveAnswers,
  submitExam,
  getAttempts,
  getAttemptById,
};
