// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-11
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
            exams: { include: { questions: true } },
          },
        },
        _count: { select: { enrollments: true, modules: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(courses);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener cursos.", error: error.message });
  }
};

const createCourse = async (req, res) => {
  const { title, description, level = "BASIC", status = "DRAFT" } = req.body;
  try {
    const course = await prisma.course.create({
      data: {
        title,
        description,
        level,
        status,
        professorId: req.user.id,
      },
    });
    res.status(201).json(course);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al crear curso.", error: error.message });
  }
};

const updateMyCourse = async (req, res) => {
  const id = Number(req.params.id);
  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course)
      return res.status(404).json({ message: "Curso no encontrado." });
    if (course.professorId !== req.user.id)
      return res
        .status(403)
        .json({ message: "No puedes modificar cursos ajenos." });

    const updated = await prisma.course.update({
      where: { id },
      data: req.body,
    });
    res.json(updated);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al actualizar curso.", error: error.message });
  }
};

const deleteMyCourse = async (req, res) => {
  const id = Number(req.params.id);
  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course)
      return res.status(404).json({ message: "Curso no encontrado." });
    if (course.professorId !== req.user.id)
      return res
        .status(403)
        .json({ message: "No puedes eliminar cursos ajenos." });

    await prisma.course.delete({ where: { id } });
    res.json({ message: "Curso eliminado correctamente." });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al eliminar curso.", error: error.message });
  }
};

// ==================== MÓDULOS ====================

const createModule = async (req, res) => {
  const { courseId, title, order } = req.body;
  try {
    const course = await prisma.course.findUnique({
      where: { id: Number(courseId) },
    });
    if (!course || course.professorId !== req.user.id)
      return res
        .status(403)
        .json({ message: "No puedes agregar módulos a cursos ajenos." });

    const module = await prisma.module.create({
      data: { courseId: course.id, title, order },
    });
    res.status(201).json(module);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al crear módulo.", error: error.message });
  }
};

const updateModule = async (req, res) => {
  const id = Number(req.params.id);
  const { title, order } = req.body;
  try {
    const module = await prisma.module.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!module)
      return res.status(404).json({ message: "Módulo no encontrado." });
    if (module.course.professorId !== req.user.id)
      return res
        .status(403)
        .json({ message: "No puedes editar módulos ajenos." });

    const updated = await prisma.module.update({
      where: { id },
      data: { title, order },
    });
    res.json(updated);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al actualizar módulo.", error: error.message });
  }
};

const deleteModule = async (req, res) => {
  const id = Number(req.params.id);
  try {
    const module = await prisma.module.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!module)
      return res.status(404).json({ message: "Módulo no encontrado." });
    if (module.course.professorId !== req.user.id)
      return res
        .status(403)
        .json({ message: "No puedes eliminar módulos ajenos." });

    await prisma.module.delete({ where: { id } });
    res.json({ message: "Módulo eliminado correctamente." });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al eliminar módulo.", error: error.message });
  }
};

// ==================== EXÁMENES ====================

const createExam = async (req, res) => {
  const { moduleId, title, description, timeLimit, maxAttempts, passingScore } =
    req.body;
  try {
    const module = await prisma.module.findUnique({
      where: { id: Number(moduleId) },
      include: { course: true },
    });
    if (!module)
      return res.status(404).json({ message: "Módulo no encontrado." });
    if (module.course.professorId !== req.user.id)
      return res
        .status(403)
        .json({ message: "No puedes crear exámenes en módulos ajenos." });

    const exam = await prisma.exam.create({
      data: {
        title,
        description,
        timeLimit,
        maxAttempts,
        passingScore,
        published: false,
        moduleId: module.id,
        authorId: req.user.id,
      },
    });
    res.status(201).json(exam);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al crear examen.", error: error.message });
  }
};

const updateExam = async (req, res) => {
  const id = Number(req.params.id);
  try {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: { module: { include: { course: true } } },
    });
    if (!exam)
      return res.status(404).json({ message: "Examen no encontrado." });
    if (exam.module.course.professorId !== req.user.id)
      return res.status(403).json({ message: "No puedes editar este examen." });

    const updated = await prisma.exam.update({ where: { id }, data: req.body });
    res.json(updated);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al actualizar examen.", error: error.message });
  }
};

const deleteExam = async (req, res) => {
  const id = Number(req.params.id);
  try {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: { module: { include: { course: true } } },
    });
    if (!exam)
      return res.status(404).json({ message: "Examen no encontrado." });
    if (exam.module.course.professorId !== req.user.id)
      return res
        .status(403)
        .json({ message: "No puedes eliminar este examen." });

    await prisma.exam.delete({ where: { id } });
    res.json({ message: "Examen eliminado correctamente." });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al eliminar examen.", error: error.message });
  }
};

// ==================== INTENTOS Y CALIFICACIÓN ====================

const getPendingAttempts = async (req, res) => {
  try {
    const attempts = await prisma.examAttempt.findMany({
      where: {
        exam: {
          authorId: req.user.id,
          questions: { some: { type: "ESSAY" } },
        },
        status: "SUBMITTED",
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
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
    res.json(attempts);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener intentos pendientes.",
      error: error.message,
    });
  }
};

const gradeAttempt = async (req, res) => {
  const id = Number(req.params.attemptId);
  const { feedback, questionGrades } = req.body;
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id },
      include: { exam: { include: { questions: true } } },
    });
    if (!attempt)
      return res.status(404).json({ message: "Intento no encontrado." });
    if (attempt.exam.authorId !== req.user.id)
      return res
        .status(403)
        .json({ message: "No puedes calificar este intento." });
    if (attempt.status !== "SUBMITTED")
      return res.status(400).json({ message: "El intento ya fue calificado." });

    let totalPoints = 0;
    let earnedPoints = 0;

    for (const q of attempt.exam.questions) {
      totalPoints += q.points;
      const grade = parseFloat(questionGrades[q.id]) || 0;
      earnedPoints += grade;
    }

    const score = parseFloat(
      ((earnedPoints / (totalPoints || 1)) * 100).toFixed(2)
    );
    const updated = await prisma.examAttempt.update({
      where: { id },
      data: { score, status: "GRADED", feedback: feedback || null },
      include: { exam: true, student: true },
    });

    res.json(updated);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al calificar intento.", error: error.message });
  }
};

module.exports = {
  getMyCourses,
  createCourse,
  updateMyCourse,
  deleteMyCourse,
  createModule,
  updateModule,
  deleteModule,
  createExam,
  updateExam,
  deleteExam,
  getPendingAttempts,
  gradeAttempt,
};
