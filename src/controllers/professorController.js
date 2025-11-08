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
        exam: { select: { title: true } },
        answers: true,
      },
    });
    res.json(attempts);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error al obtener intentos pendientes.",
        error: error.message,
      });
  }
};

const gradeAttempt = async (req, res) => {
  const { attemptId, feedback, questionGrades } = req.body;

  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: parseInt(attemptId) },
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

    const answers = JSON.parse(attempt.answers);
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const q of attempt.exam.questions) {
      if (q.type === "ESSAY") {
        const grade = questionGrades[q.id] || 0;
        earnedPoints += grade;
      } else {
        if (answers[q.id] && JSON.stringify(answers[q.id]) === q.correct) {
          earnedPoints += q.points;
        }
      }
      totalPoints += q.points;
    }

    const score = (earnedPoints / totalPoints) * 100;

    const updated = await prisma.examAttempt.update({
      where: { id: parseInt(attemptId) },
      data: {
        score,
        status: "GRADED",
        feedback,
      },
    });

    res.json(updated);
  } catch (error) {
    res
      .status(400)
      .json({
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
