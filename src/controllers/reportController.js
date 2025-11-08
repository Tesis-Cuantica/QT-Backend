const prisma = require("../models");

const getStudentDashboard = async (req, res) => {
  const studentId = parseInt(req.user.id);

  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        course: {
          include: {
            modules: {
              orderBy: { order: "asc" },
              include: {
                exams: {
                  include: {
                    attempts: {
                      where: { studentId },
                      orderBy: { submittedAt: "desc" },
                      take: 1,
                    },
                  },
                },
                _count: {
                  select: { lessons: true, labs: true },
                },
              },
            },
          },
        },
      },
    });

    const totalLabs = await prisma.studentLab.count({
      where: { studentId },
    });

    const passedLabs = await prisma.studentLab.count({
      where: { studentId, passed: true },
    });

    const successRate =
      totalLabs > 0
        ? parseFloat(((passedLabs / totalLabs) * 100).toFixed(2))
        : 0;

    const certificates = enrollments
      .filter((e) => e.completed)
      .map((e) => ({
        courseId: e.courseId,
        courseTitle: e.course.title,
        completedAt: e.completedAt,
      }));

    res.json({
      enrollments: enrollments.map((e) => ({
        courseId: e.courseId,
        courseTitle: e.course.title,
        progress: parseFloat(e.progress.toFixed(2)),
        completed: e.completed,
        modules: e.course.modules.map((m) => ({
          moduleId: m.id,
          title: m.title,
          lessonsTotal: m._count.lessons,
          labsTotal: m._count.labs,
          examScore: m.exams[0]?.attempts[0]?.score || null,
        })),
      })),
      labStats: {
        totalLabs,
        successRate,
      },
      certificates,
    });
  } catch (error) {
    console.error("Error en getStudentDashboard:", error);
    res.status(500).json({
      message: "Error al obtener el dashboard del estudiante.",
      error: error.message,
    });
  }
};

const getProfessorDashboard = async (req, res) => {
  const professorId = parseInt(req.user.id);

  try {
    const courses = await prisma.course.findMany({
      where: { professorId },
      include: {
        _count: { select: { enrollments: true, modules: true } },
        enrollments: {
          include: {
            student: { select: { name: true, email: true } },
          },
        },
        modules: {
          include: {
            exams: {
              include: {
                attempts: {
                  where: { status: "GRADED" },
                },
              },
              _count: { select: { attempts: true } },
            },
          },
        },
      },
    });

    const courseStats = courses.map((course) => {
      let totalAttempts = 0;
      let passedAttempts = 0;

      course.modules.forEach((module) => {
        module.exams.forEach((exam) => {
          totalAttempts += exam._count.attempts;
          const passed = exam.attempts.filter(
            (attempt) =>
              attempt.score !== null && attempt.score >= exam.passingScore
          ).length;
          passedAttempts += passed;
        });
      });

      return {
        courseId: course.id,
        title: course.title,
        studentsEnrolled: course._count.enrollments,
        modules: course._count.modules,
        approvalRate:
          totalAttempts > 0
            ? parseFloat(((passedAttempts / totalAttempts) * 100).toFixed(2))
            : 0,
      };
    });

    res.json({ courses: courseStats });
  } catch (error) {
    console.error("Error en getProfessorDashboard:", error);
    res.status(500).json({
      message: "Error al obtener el dashboard del profesor.",
      error: error.message,
    });
  }
};

const getAdminDashboard = async (req, res) => {
  try {
    const userStats = await prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    });

    const totalCourses = await prisma.course.count();
    const activeCourses = await prisma.course.count({
      where: { status: "ACTIVE" },
    });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const examsLast7Days = await prisma.examAttempt.count({
      where: { submittedAt: { gte: sevenDaysAgo } },
    });

    const labExecutionsLast7Days = await prisma.studentLab.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    const professors = await prisma.user.findMany({
      where: { role: "PROFESSOR" },
      include: {
        coursesCreated: {
          where: { status: "ACTIVE" },
          include: {
            _count: { select: { enrollments: true } },
          },
        },
      },
    });

    const professorPerformance = professors.map((p) => ({
      professorId: p.id,
      name: p.name,
      activeCourses: p.coursesCreated.length,
      totalStudents: p.coursesCreated.reduce(
        (sum, c) => sum + c._count.enrollments,
        0
      ),
    }));

    res.json({
      users: userStats.reduce(
        (acc, u) => ({ ...acc, [u.role]: u._count._all }),
        {}
      ),
      totalCourses,
      activeCourses,
      recentActivity: {
        examsLast7Days,
        labExecutionsLast7Days,
      },
      professorPerformance,
    });
  } catch (error) {
    console.error("Error en getAdminDashboard:", error);
    res.status(500).json({
      message: "Error al obtener el dashboard del administrador.",
      error: error.message,
    });
  }
};

module.exports = {
  getStudentDashboard,
  getProfessorDashboard,
  getAdminDashboard,
};
