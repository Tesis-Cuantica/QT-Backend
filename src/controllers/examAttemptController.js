const prisma = require("../models");

const startAttempt = async (req, res) => {
  const { examId } = req.body;
  const studentId = req.user.id;

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(examId) },
      include: { module: { course: { include: { enrollments: true } } } },
    });

    if (!exam)
      return res.status(404).json({ message: "Examen no encontrado." });

    const isEnrolled = exam.module.course.enrollments.some(
      (e) => e.studentId === studentId
    );
    if (!isEnrolled)
      return res
        .status(403)
        .json({ message: "No estás inscrito en este curso." });
    if (!exam.published)
      return res.status(403).json({ message: "Examen no publicado." });

    const attempts = await prisma.examAttempt.count({
      where: { studentId, examId },
    });
    if (attempts >= exam.maxAttempts) {
      return res
        .status(403)
        .json({ message: "Has alcanzado el límite de intentos." });
    }

    const now = new Date();
    if (exam.availableFrom && exam.availableFrom > now)
      return res
        .status(403)
        .json({ message: "El examen aún no está disponible." });
    if (exam.availableTo && exam.availableTo < now)
      return res
        .status(403)
        .json({ message: "El examen ya no está disponible." });

    const attempt = await prisma.examAttempt.create({
      data: {
        studentId,
        examId,
        answers: JSON.stringify({}),
        status: "IN_PROGRESS",
      },
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

  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: parseInt(attemptId) },
    });
    if (!attempt || attempt.studentId !== req.user.id) {
      return res.status(404).json({ message: "Intento no encontrado." });
    }

    await prisma.examAttempt.update({
      where: { id: parseInt(attemptId) },
      data: { answers: JSON.stringify(answers) },
    });

    res.json({ message: "Respuestas guardadas." });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al guardar respuestas.", error: error.message });
  }
};

const submitExam = async (req, res) => {
  const { attemptId } = req.body;

  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: parseInt(attemptId) },
      include: { exam: { include: { questions: true } } },
    });

    if (!attempt || attempt.studentId !== req.user.id) {
      return res.status(404).json({ message: "Intento no encontrado." });
    }

    if (attempt.status !== "IN_PROGRESS") {
      return res.status(400).json({ message: "El intento ya fue enviado." });
    }

    const answers = JSON.parse(attempt.answers);
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
        if (userAnswer && userAnswer.trim() === JSON.parse(q.correct)) {
          earnedPoints += q.points;
        }
      } else if (q.type === "MULTIPLE_CHOICE") {
        if (userAnswer && JSON.stringify(userAnswer) === q.correct) {
          earnedPoints += q.points;
        }
      } else if (q.type === "QUANTUM_SIMULATION") {
        if (userAnswer && JSON.stringify(userAnswer) === q.correct) {
          earnedPoints += q.points;
        }
      }
    }

    const score = hasManual ? null : (earnedPoints / totalPoints) * 100;
    const status = hasManual ? "SUBMITTED" : "GRADED";

    const updated = await prisma.examAttempt.update({
      where: { id: parseInt(attemptId) },
      data: {
        submittedAt: new Date(),
        score,
        status,
      },
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

  try {
    const attempts = await prisma.examAttempt.findMany({
      where: { studentId: req.user.id, examId: parseInt(examId) },
      orderBy: { startedAt: "desc" },
    });
    res.json(attempts);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener intentos.", error: error.message });
  }
};

module.exports = {
  startAttempt,
  saveAnswers,
  submitExam,
  getAttempts,
};
