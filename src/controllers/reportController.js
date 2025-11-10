const prisma = require("../models");

const getStudentDashboard = async (req, res) => {
  const studentId = Number(req.user.id);
  if (isNaN(studentId)) {
    return res.status(400).json({ message: "ID de estudiante inválido." });
  }

  try {
    const [enrollments, labCounts] = await Promise.all([
      prisma.enrollment.findMany({
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
      }),
      prisma.studentLab.groupBy({
        by: ["passed"],
        where: { studentId },
        _count: { _all: true },
      }),
    ]);

    const totalLabs = labCounts.reduce((sum, g) => sum + g._count._all, 0);
    const passedLabs =
      labCounts.find((g) => g.passed === true)?._count._all || 0;
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
          examScore: m.exams.reduce((best, exam) => {
            const latest = exam.attempts[0];
            return latest && latest.score > best ? latest.score : best;
          }, null),
        })),
      })),
      labStats: {
        totalLabs,
        passedLabs,
        successRate,
      },
      certificates,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el dashboard del estudiante.",
      error: error.message,
    });
  }
};

const getProfessorDashboard = async (req, res) => {
  const professorId = Number(req.user.id);
  if (isNaN(professorId)) {
    return res.status(400).json({ message: "ID de profesor inválido." });
  }

  try {
    const courses = await prisma.course.findMany({
      where: { professorId },
      include: {
        _count: { select: { enrollments: true, modules: true } },
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
          passedAttempts += exam.attempts.filter(
            (attempt) =>
              attempt.score !== null && attempt.score >= exam.passingScore
          ).length;
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
    res.status(500).json({
      message: "Error al obtener el dashboard del profesor.",
      error: error.message,
    });
  }
};

const getAdminDashboard = async (req, res) => {
  try {
    const [
      userStats,
      courseCount,
      activeCourseCount,
      recentCounts,
      professors,
    ] = await Promise.all([
      prisma.user.groupBy({
        by: ["role"],
        _count: { _all: true },
      }),
      prisma.course.count(),
      prisma.course.count({ where: { status: "ACTIVE" } }),
      (async () => {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const [exams, labs] = await Promise.all([
          prisma.examAttempt.count({
            where: { submittedAt: { gte: sevenDaysAgo } },
          }),
          prisma.studentLab.count({
            where: { createdAt: { gte: sevenDaysAgo } },
          }),
        ]);
        return { exams, labs };
      })(),
      prisma.user.findMany({
        where: { role: "PROFESSOR" },
        include: {
          coursesCreated: {
            where: { status: "ACTIVE" },
            include: {
              _count: { select: { enrollments: true } },
            },
          },
        },
      }),
    ]);

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
      totalCourses: courseCount,
      activeCourses: activeCourseCount,
      recentActivity: {
        examsLast7Days: recentCounts.exams,
        labExecutionsLast7Days: recentCounts.labs,
      },
      professorPerformance,
    });
  } catch (error) {
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
