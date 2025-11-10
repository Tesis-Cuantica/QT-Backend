const prisma = require("../models");

const getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalCourses = await prisma.course.count();
    const totalEnrollments = await prisma.enrollment.count();
    const totalExams = await prisma.exam.count();

    res.json({
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalExams,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener estadísticas.",
      error: error.message,
    });
  }
};

const getStudentProgress = async (req, res) => {
  try {
    const studentId = req.user.id;

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: true,
                labs: true,
                exams: true,
              },
            },
          },
        },
      },
    });

    const formatted = enrollments.map((enrollment) => {
      const totalModules = enrollment.course.modules.length;
      const completedModules =
        enrollment.progress >= 100
          ? totalModules
          : Math.floor((totalModules * enrollment.progress) / 100);
      return {
        course: enrollment.course.title,
        progress: enrollment.progress,
        completedModules,
        totalModules,
        completed: enrollment.completed,
      };
    });

    res.json(formatted);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener progreso.", error: error.message });
  }
};

const getProfessorDashboard = async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: { professorId: req.user.id },
      include: {
        _count: { select: { enrollments: true, modules: true } },
        modules: {
          include: {
            exams: {
              include: {
                attempts: {
                  where: { status: "GRADED" },
                  select: { id: true, score: true },
                },
              },
            },
          },
        },
      },
    });

    const data = courses.map((course) => {
      let totalExams = 0;
      let totalAttempts = 0;
      let avgScore = 0;

      course.modules.forEach((mod) => {
        mod.exams.forEach((exam) => {
          totalExams++;
          totalAttempts += exam.attempts.length;
          const scores = exam.attempts.map((a) => a.score || 0);
          if (scores.length > 0) {
            avgScore += scores.reduce((sum, s) => sum + s, 0) / scores.length;
          }
        });
      });

      const averageScore =
        totalExams > 0 ? parseFloat((avgScore / totalExams).toFixed(2)) : 0;

      return {
        id: course.id,
        title: course.title,
        totalStudents: course._count.enrollments,
        totalModules: course._count.modules,
        totalExams,
        totalAttempts,
        averageScore,
      };
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el dashboard del profesor.",
      error: error.message,
    });
  }
};

module.exports = {
  getAdminDashboard,
  getStudentProgress,
  getProfessorDashboard,
};
