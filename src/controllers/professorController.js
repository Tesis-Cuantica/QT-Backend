// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: professorController.js
// ═══════════════════════════════════════════════════════════════════════════════
const prisma = require("../models");

const getMyCourses = async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: { professorId: req.user.id },
      include: {
        modules: {
          include: {
            lessons: true,
            labs: true,
            exams: {
              include: {
                questions: { orderBy: { order: "asc" } },
              },
            },
          },
          orderBy: { order: "asc" },
        },
        enrollments: {
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: { enrollments: true, modules: true },
        },
      },
    });
    res.json(courses);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener tus cursos.", error: error.message });
  }
};

const getPendingAttempts = async (req, res) => {
  try {
    const attempts = await prisma.examAttempt.findMany({
      where: {
        exam: {
          authorId: req.user.id,
          questions: {
            some: { type: "ESSAY" },
          },
        },
        status: "SUBMITTED",
      },
      include: {
        student: { select: { name: true } },
        exam: {
          select: { title: true, id: true },
          include: {
            module: {
              select: { title: true },
              include: {
                course: { select: { title: true } },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });
    res.json(attempts);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener intentos pendientes.",
      error: error.message,
    });
  }
};

const gradeAttempt = async (req, res) => {
  const { attemptId, feedback, questionGrades } = req.body;
  const aid = Number(attemptId);

  if (isNaN(aid)) {
    return res.status(400).json({ message: "ID de intento inválido." });
  }

  if (typeof questionGrades !== "object" || !questionGrades) {
    return res.status(400).json({ message: "Calificaciones inválidas." });
  }

  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: aid },
      include: {
        exam: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!attempt)
      return res.status(404).json({ message: "Intento no encontrado." });
    if (attempt.exam.authorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "No puedes calificar este intento." });
    }
    if (attempt.status !== "SUBMITTED") {
      return res.status(400).json({ message: "El intento ya fue calificado." });
    }

    const answers = JSON.parse(attempt.answers || "{}");
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const q of attempt.exam.questions) {
      totalPoints += q.points;

      if (q.type === "ESSAY") {
        const grade = parseFloat(questionGrades[q.id]);
        if (isNaN(grade) || grade < 0 || grade > q.points) {
          return res.status(400).json({
            message: `Calificación inválida para pregunta ${q.id}. Rango: 0-${q.points}.`,
          });
        }
        earnedPoints += grade;
      } else {
        const userAnswer = answers[q.id];
        let correct = false;

        if (q.type === "SHORT_ANSWER") {
          const expected =
            typeof q.correct === "string" ? q.correct.trim().toLowerCase() : "";
          const given = userAnswer
            ? String(userAnswer).trim().toLowerCase()
            : "";
          correct = given === expected;
        } else if (["MULTIPLE_CHOICE", "QUANTUM_SIMULATION"].includes(q.type)) {
          const expected = JSON.parse(q.correct);
          const given = userAnswer;

          if (Array.isArray(expected) && Array.isArray(given)) {
            correct =
              JSON.stringify(expected.sort()) === JSON.stringify(given.sort());
          } else {
            correct = JSON.stringify(expected) === JSON.stringify(given);
          }
        }

        if (correct) earnedPoints += q.points;
      }
    }

    const score = parseFloat(
      ((earnedPoints / (totalPoints || 1)) * 100).toFixed(2)
    );

    const updated = await prisma.examAttempt.update({
      where: { id: aid },
      data: {
        score,
        status: "GRADED",
        feedback: feedback || null,
      },
      include: { exam: true, student: true },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({
      message: "Error al calificar el intento.",
      error: error.message,
    });
  }
};

module.exports = {
  getMyCourses,
  getPendingAttempts,
  gradeAttempt,
};
