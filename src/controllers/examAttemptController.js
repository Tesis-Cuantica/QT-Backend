// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: examAttemptController.js
// ═══════════════════════════════════════════════════════════════════════════════

const prisma = require("../models");

const startAttempt = async (req, res) => {
  const eid = Number(req.body.examId);
  const studentId = req.user.id;

  if (isNaN(eid))
    return res.status(400).json({ message: "ID de examen inválido." });

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: eid },
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
      return res.status(403).json({ message: "Examen no publicado." });
    if (exam.module.course.enrollments.length === 0)
      return res
        .status(403)
        .json({ message: "No estás inscrito en este curso." });

    const attempts = await prisma.examAttempt.count({
      where: { studentId, examId: eid },
    });
    if (attempts >= exam.maxAttempts)
      return res
        .status(403)
        .json({ message: "Has alcanzado el límite de intentos." });

    const now = new Date();
    if (exam.availableFrom && new Date(exam.availableFrom) > now)
      return res
        .status(403)
        .json({ message: "El examen aún no está disponible." });
    if (exam.availableTo && new Date(exam.availableTo) < now)
      return res
        .status(403)
        .json({ message: "El examen ya no está disponible." });

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
  const aid = Number(req.body.attemptId);
  const { answers } = req.body;

  if (isNaN(aid))
    return res.status(400).json({ message: "ID de intento inválido." });

  try {
    const attempt = await prisma.examAttempt.findUnique({ where: { id: aid } });
    if (!attempt || attempt.studentId !== req.user.id)
      return res.status(404).json({ message: "Intento no encontrado." });
    if (attempt.status !== "IN_PROGRESS")
      return res
        .status(400)
        .json({ message: "El intento ya fue enviado o calificado." });

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

const normalizeArray = (arr) => {
  if (!arr) return "";
  if (!Array.isArray(arr)) arr = [String(arr)];
  return arr.map(String).sort().join("|");
};

const submitExam = async (req, res) => {
  const aid = Number(req.body.attemptId);
  const studentId = req.user.id;

  if (isNaN(aid))
    return res.status(400).json({ message: "ID de intento inválido." });

  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: aid },
      include: { exam: { include: { questions: true } } },
    });

    if (!attempt || attempt.studentId !== studentId)
      return res.status(404).json({ message: "Intento no encontrado." });
    if (attempt.status !== "IN_PROGRESS")
      return res
        .status(400)
        .json({ message: "El intento ya fue enviado o calificado." });

    const answers = JSON.parse(attempt.answers || "{}");
    let totalPoints = 0;
    let earnedPoints = 0;
    let requiresManual = false;

    for (const q of attempt.exam.questions) {
      totalPoints += q.points;
      const userAnswer = answers[q.id];

      if (q.type === "ESSAY") {
        requiresManual = true;
        continue;
      }

      if (q.type === "SHORT_ANSWER") {
        const expected = (q.correct || "").trim().toLowerCase();
        const given = userAnswer ? String(userAnswer).trim().toLowerCase() : "";
        if (given === expected) earnedPoints += q.points;
      } else if (["MULTIPLE_CHOICE", "QUANTUM_SIMULATION"].includes(q.type)) {
        let expected;
        try {
          expected = JSON.parse(q.correct);
        } catch {
          expected = q.correct;
        }
        const given = userAnswer;
        if (normalizeArray(given) === normalizeArray(expected))
          earnedPoints += q.points;
      }
    }

    const score = requiresManual
      ? null
      : parseFloat(((earnedPoints / (totalPoints || 1)) * 100).toFixed(2));
    const status = requiresManual ? "SUBMITTED" : "GRADED";

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
  const eid = Number(req.params.examId);
  if (isNaN(eid))
    return res.status(400).json({ message: "ID de examen inválido." });

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: eid },
      select: { authorId: true },
    });

    if (!exam)
      return res.status(404).json({ message: "Examen no encontrado." });

    let where = { examId: eid };

    if (req.user.role === "STUDENT") {
      where.studentId = req.user.id;
    } else if (req.user.role === "PROFESSOR") {
      if (exam.authorId !== req.user.id)
        return res
          .status(403)
          .json({ message: "No puedes ver intentos de exámenes ajenos." });
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
    res
      .status(500)
      .json({ message: "Error al obtener intentos.", error: error.message });
  }
};

const getAttemptById = async (req, res) => {
  const aid = Number(req.params.id);
  const userId = req.user.id;

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

    const isOwner = attempt.studentId === userId;
    const isProfessor = attempt.exam.module.course.professorId === userId;

    if (!isOwner && !isProfessor && req.user.role !== "ADMIN") {
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

const resetAttempts = async (req, res) => {
  const eid = Number(req.params.examId);
  const sid = Number(req.params.studentId);

  if (isNaN(eid) || isNaN(sid))
    return res.status(400).json({ message: "IDs inválidos." });

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: eid },
      select: { authorId: true },
    });
    if (!exam)
      return res.status(404).json({ message: "Examen no encontrado." });

    if (
      req.user.role !== "ADMIN" &&
      !(req.user.role === "PROFESSOR" && exam.authorId === req.user.id)
    ) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para reiniciar intentos." });
    }

    const deleted = await prisma.examAttempt.deleteMany({
      where: { examId: eid, studentId: sid },
    });

    res.json({
      message: `Intentos reiniciados para el estudiante ${sid}.`,
      deleted: deleted.count,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al reiniciar intentos.", error: error.message });
  }
};

module.exports = {
  startAttempt,
  saveAnswers,
  submitExam,
  getAttempts,
  getAttemptById,
  resetAttempts,
};
