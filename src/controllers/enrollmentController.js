const prisma = require("../models");

const enrollInCourse = async (req, res) => {
  const { courseId } = req.body;
  const studentId = req.user.id;

  if (req.user.role !== "STUDENT") {
    return res
      .status(403)
      .json({ message: "Solo los estudiantes pueden inscribirse en cursos." });
  }

  try {
    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) },
    });

    if (!course) {
      return res.status(404).json({ message: "Curso no encontrado." });
    }

    if (course.status !== "ACTIVE") {
      return res
        .status(400)
        .json({ message: "El curso no está activo para inscripción." });
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId, courseId: parseInt(courseId) },
      },
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "Ya estás inscrito en este curso." });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        courseId: parseInt(courseId),
      },
    });

    res.status(201).json(enrollment);
  } catch (error) {
    res.status(400).json({
      message: "Error al inscribirse en el curso.",
      error: error.message,
    });
  }
};

const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.user.id },
      include: {
        course: {
          include: {
            professor: { select: { name: true, email: true } },
            _count: { select: { modules: true } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener tus inscripciones.",
      error: error.message,
    });
  }
};

const calculateProgress = async (studentId, courseId) => {
  const modules = await prisma.module.findMany({
    where: { courseId },
    include: {
      lessons: true,
      labs: true,
      exams: {
        include: {
          attempts: {
            where: { studentId, status: "GRADED" },
            orderBy: { score: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (modules.length === 0) return 0.0;

  let completedModules = 0;

  for (const module of modules) {
    const lessonsDone = module.lessons.length > 0;
    const labsDone =
      (await prisma.studentLab.count({
        where: { studentId, lab: { moduleId: module.id } },
      })) > 0;

    let examsPassed = true;
    for (const exam of module.exams) {
      const bestAttempt = exam.attempts[0];
      if (!bestAttempt || bestAttempt.score < exam.passingScore) {
        examsPassed = false;
        break;
      }
    }

    if (lessonsDone && labsDone && examsPassed) {
      completedModules++;
    }
  }

  return (completedModules / modules.length) * 100;
};

const updateProgress = async (req, res) => {
  const { courseId } = req.body;
  const studentId = req.user.id;

  try {
    const progress = await calculateProgress(studentId, parseInt(courseId));

    const updated = await prisma.enrollment.update({
      where: {
        studentId_courseId: { studentId, courseId: parseInt(courseId) },
      },
      data: {
        progress,
        completed: progress >= 100,
        completedAt: progress >= 100 ? new Date() : null,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({
      message: "Error al actualizar el progreso.",
      error: error.message,
    });
  }
};

const getProgress = async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.id;

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId, courseId: parseInt(courseId) },
      },
    });

    if (!enrollment) {
      return res
        .status(404)
        .json({ message: "No estás inscrito en este curso." });
    }

    res.json(enrollment);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener el progreso.", error: error.message });
  }
};

module.exports = {
  enrollInCourse,
  getMyEnrollments,
  updateProgress,
  getProgress,
};
