const prisma = require("../models");

const enrollInCourse = async (req, res) => {
  const cid = Number(req.body.courseId);
  const studentId = req.user.id;

  if (isNaN(cid))
    return res.status(400).json({ message: "ID de curso inválido." });
  if (req.user.role !== "STUDENT")
    return res
      .status(403)
      .json({ message: "Solo los estudiantes pueden inscribirse en cursos." });

  try {
    const course = await prisma.course.findUnique({ where: { id: cid } });
    if (!course)
      return res.status(404).json({ message: "Curso no encontrado." });
    if (course.status !== "ACTIVE")
      return res
        .status(400)
        .json({ message: "El curso no está activo para inscripción." });

    const existing = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: cid } },
    });
    if (existing)
      return res
        .status(400)
        .json({ message: "Ya estás inscrito en este curso." });

    const enrollment = await prisma.enrollment.create({
      data: { studentId, courseId: cid },
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
  const pageNum = parseInt(req.query.page || 1);
  const limitNum = parseInt(req.query.limit || 10);
  const skip = (pageNum - 1) * limitNum;

  try {
    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where: { studentId: req.user.id },
        skip,
        take: limitNum,
        include: {
          course: {
            include: {
              professor: { select: { name: true, email: true } },
              _count: { select: { modules: true } },
            },
          },
        },
        orderBy: { enrolledAt: "desc" },
      }),
      prisma.enrollment.count({ where: { studentId: req.user.id } }),
    ]);

    res.json({
      enrollments,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
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
      lessons: { select: { id: true } },
      labs: { select: { id: true } },
      exams: { select: { id: true, passingScore: true } },
    },
  });
  if (modules.length === 0) return 0.0;

  const labsDoneCount = await prisma.studentLab.count({
    where: { studentId, lab: { moduleId: { in: modules.map((m) => m.id) } } },
  });
  const examAttempts = await prisma.examAttempt.findMany({
    where: {
      studentId,
      exam: { moduleId: { in: modules.map((m) => m.id) } },
      status: "GRADED",
    },
    orderBy: { score: "desc" },
  });

  const examResults = {};
  examAttempts.forEach((a) => {
    if (!examResults[a.examId] || examResults[a.examId].score < a.score)
      examResults[a.examId] = a;
  });

  let completedModules = 0;
  for (const module of modules) {
    const lessonsDone = module.lessons.length > 0;
    const labsDone = labsDoneCount > 0;
    let examsPassed = true;
    for (const exam of module.exams) {
      const attempt = examResults[exam.id];
      if (!attempt || attempt.score < exam.passingScore) {
        examsPassed = false;
        break;
      }
    }
    if (lessonsDone && labsDone && examsPassed) completedModules++;
  }

  return parseFloat(((completedModules / modules.length) * 100).toFixed(2));
};

const updateProgress = async (req, res) => {
  const cid = Number(req.body.courseId);
  const studentId = req.user.id;
  if (isNaN(cid))
    return res.status(400).json({ message: "ID de curso inválido." });

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: cid } },
    });
    if (!enrollment)
      return res
        .status(404)
        .json({ message: "No estás inscrito en este curso." });

    const progress = await calculateProgress(studentId, cid);

    const updated = await prisma.enrollment.update({
      where: { studentId_courseId: { studentId, courseId: cid } },
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
  const cid = Number(req.params.courseId);
  const studentId = req.user.id;
  if (isNaN(cid))
    return res.status(400).json({ message: "ID de curso inválido." });

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: cid } },
    });
    if (!enrollment)
      return res
        .status(404)
        .json({ message: "No estás inscrito en este curso." });

    res.json(enrollment);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener el progreso.", error: error.message });
  }
};
const completeCourse = async (req, res) => {
  const studentId = req.user.id;
  const { courseId } = req.params;

  try {
    const updated = await prisma.enrollment.update({
      where: { studentId_courseId: { studentId, courseId: Number(courseId) } },
      data: { completed: true, progress: 100, completedAt: new Date() },
    });

    res.json({ message: "Curso completado.", enrollment: updated });
  } catch (error) {
    res.status(500).json({
      message: "Error al marcar curso como completado.",
      error: error.message,
    });
  }
};
module.exports = {
  enrollInCourse,
  getMyEnrollments,
  updateProgress,
  getProgress,
  completeCourse,
};
