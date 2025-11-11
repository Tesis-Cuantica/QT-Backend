// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-11
// Archivo: reportController.js
// ═══════════════════════════════════════════════════════════════════════════════

const prisma = require("../models");

const getAdminReport = async (req, res) => {
  try {
    const [users, courses, modules, labs, exams, attempts, enrollments] =
      await Promise.all([
        prisma.user.count(),
        prisma.course.count(),
        prisma.module.count(),
        prisma.quantumLab.count(),
        prisma.exam.count(),
        prisma.examAttempt.count(),
        prisma.enrollment.count(),
      ]);

    const avgScore =
      (
        await prisma.examAttempt.aggregate({
          _avg: { score: true },
        })
      )._avg.score || 0;

    res.json({
      users,
      courses,
      modules,
      labs,
      exams,
      enrollments,
      attempts,
      averageScore: avgScore.toFixed(2),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al generar reporte global.",
      error: error.message,
    });
  }
};

const getProfessorReport = async (req, res) => {
  try {
    const professorId =
      req.user.role === "PROFESSOR"
        ? req.user.id
        : Number(req.params.id) || req.user.id;

    const courses = await prisma.course.findMany({
      where: { professorId },
      include: {
        _count: {
          select: {
            enrollments: true,
            modules: true,
          },
        },
        modules: {
          include: {
            exams: { include: { attempts: true } },
          },
        },
      },
    });

    const summary = courses.map((c) => {
      const allAttempts = c.modules.flatMap((m) =>
        m.exams.flatMap((e) => e.attempts)
      );
      const avgScore =
        allAttempts.length > 0
          ? (
              allAttempts.reduce((acc, a) => acc + (a.score || 0), 0) /
              allAttempts.length
            ).toFixed(2)
          : 0;
      return {
        courseId: c.id,
        title: c.title,
        students: c._count.enrollments,
        modules: c._count.modules,
        averageScore: avgScore,
      };
    });

    res.json({ professorId, courses: summary });
  } catch (error) {
    res.status(500).json({
      message: "Error al generar reporte del profesor.",
      error: error.message,
    });
  }
};

const getStudentReport = async (req, res) => {
  try {
    const studentId =
      req.user.role === "STUDENT"
        ? req.user.id
        : Number(req.params.id) || req.user.id;

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        course: {
          select: { id: true, title: true, level: true },
        },
      },
    });

    const attempts = await prisma.examAttempt.findMany({
      where: { studentId },
      include: { exam: { select: { title: true } } },
    });

    const avgScore =
      attempts.length > 0
        ? (
            attempts.reduce((acc, a) => acc + (a.score || 0), 0) /
            attempts.length
          ).toFixed(2)
        : 0;

    const completed = enrollments.filter((e) => e.completed).length;

    res.json({
      studentId,
      totalCourses: enrollments.length,
      completedCourses: completed,
      progress: ((completed / (enrollments.length || 1)) * 100).toFixed(2),
      averageScore: avgScore,
      attempts: attempts.map((a) => ({
        id: a.id,
        exam: a.exam.title,
        score: a.score,
        status: a.status,
      })),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al generar reporte del estudiante.",
      error: error.message,
    });
  }
};

module.exports = {
  getAdminReport,
  getProfessorReport,
  getStudentReport,
};
