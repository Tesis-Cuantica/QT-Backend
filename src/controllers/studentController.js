// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-11
// Archivo: studentController.js
// ═══════════════════════════════════════════════════════════════════════════════

const prisma = require("../models");

const getMyEnrollments = async (req, res) => {
  const studentId = req.user.id;
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        course: {
          include: {
            professor: { select: { id: true, name: true, email: true } },
            _count: { select: { modules: true, enrollments: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(enrollments);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener tus cursos inscritos.",
      error: error.message,
    });
  }
};

const getEnrollmentDetails = async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.id;

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: Number(studentId),
          courseId: Number(courseId),
        },
      },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: true,
                exams: true,
              },
            },
            professor: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!enrollment)
      return res
        .status(404)
        .json({ message: "No estás inscrito en este curso." });

    res.json(enrollment);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el curso del estudiante.",
      error: error.message,
    });
  }
};

const completeCourse = async (req, res) => {
  const studentId = req.user.id;
  const { courseId } = req.params;

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: Number(studentId),
          courseId: Number(courseId),
        },
      },
    });

    if (!enrollment)
      return res
        .status(404)
        .json({ message: "No estás inscrito en este curso." });

    if (enrollment.completed && enrollment.progress === 100)
      return res.status(400).json({ message: "El curso ya está completado." });

    const updated = await prisma.enrollment.update({
      where: {
        studentId_courseId: {
          studentId: Number(studentId),
          courseId: Number(courseId),
        },
      },
      data: {
        completed: true,
        progress: 100,
        completedAt: new Date(),
      },
    });

    res.json({
      message: "Curso marcado como completado.",
      enrollment: updated,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al marcar el curso como completado.",
      error: error.message,
    });
  }
};

const getAvailableExams = async (req, res) => {
  const studentId = req.user.id;
  try {
    const exams = await prisma.exam.findMany({
      where: {
        module: {
          course: {
            enrollments: { some: { studentId } },
          },
        },
        published: true,
      },
      include: {
        module: { include: { course: { select: { id: true, title: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(exams);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener exámenes disponibles.",
      error: error.message,
    });
  }
};

const submitExamAttempt = async (req, res) => {
  const { examId } = req.params;
  const studentId = req.user.id;
  const { answers } = req.body;

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: Number(examId) },
      include: { questions: true },
    });

    if (!exam || !exam.published)
      return res.status(404).json({ message: "Examen no disponible." });

    const existingAttempt = await prisma.examAttempt.findFirst({
      where: { studentId, examId: Number(examId), status: "SUBMITTED" },
    });

    if (existingAttempt)
      return res.status(400).json({ message: "Ya enviaste este examen." });

    let score = 0;
    let total = 0;

    exam.questions.forEach((q) => {
      total += q.points;
      const studentAnswer = answers[q.id];
      if (q.type === "MULTIPLE_CHOICE" && studentAnswer === q.correctAnswer) {
        score += q.points;
      }
    });

    const percentage = parseFloat(((score / (total || 1)) * 100).toFixed(2));

    const attempt = await prisma.examAttempt.create({
      data: {
        examId: exam.id,
        studentId,
        answers: JSON.stringify(answers),
        score: percentage,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    res.status(201).json({
      message: "Examen enviado correctamente.",
      attempt,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al enviar el examen.",
      error: error.message,
    });
  }
};

const getGrades = async (req, res) => {
  const studentId = req.user.id;
  try {
    const grades = await prisma.examAttempt.findMany({
      where: { studentId },
      include: {
        exam: {
          include: {
            module: {
              include: { course: { select: { id: true, title: true } } },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });
    res.json(grades);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener calificaciones.",
      error: error.message,
    });
  }
};

module.exports = {
  getMyEnrollments,
  getEnrollmentDetails,
  completeCourse,
  getAvailableExams,
  submitExamAttempt,
  getGrades,
};
