// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-11
// Archivo: courseController.js
// ═══════════════════════════════════════════════════════════════════════════════

const prisma = require("../models");

// 🔹 Función para generar código único del curso
const generateCourseCode = () => {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `QTEC-${random}`;
};

// ────────────────────────────────────────────────────────────────────────────────
// Crear un nuevo curso (ADMIN o PROFESSOR)
// ────────────────────────────────────────────────────────────────────────────────
const createCourse = async (req, res) => {
  const { title, description, level = "BASIC", status = "DRAFT" } = req.body;
  const professorId =
    req.user.role === "PROFESSOR" ? req.user.id : Number(req.body.professorId);

  if (!title)
    return res
      .status(400)
      .json({ message: "El título del curso es requerido." });

  if (
    req.user.role === "PROFESSOR" &&
    req.body.professorId &&
    professorId !== req.user.id
  ) {
    return res
      .status(403)
      .json({ message: "No puedes asignar otro profesor." });
  }

  try {
    const validStatuses = ["DRAFT", "ACTIVE", "CLOSED"];
    const finalStatus = validStatuses.includes(status) ? status : "DRAFT";

    const course = await prisma.course.create({
      data: {
        title,
        description,
        level,
        status: finalStatus,
        professor: { connect: { id: professorId } },
        code: generateCourseCode(), // ← Nuevo campo
      },
      include: { professor: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json(course);
  } catch (error) {
    if (error.code === "P2003")
      return res.status(400).json({ message: "Profesor no válido." });
    res
      .status(400)
      .json({ message: "Error al crear el curso.", error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// Obtener lista de cursos (según rol)
// ────────────────────────────────────────────────────────────────────────────────
const getCourses = async (req, res) => {
  const { status, level, page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  let where = {};
  if (req.user.role === "STUDENT") where.status = "ACTIVE";
  else if (req.user.role === "PROFESSOR")
    where.OR = [{ professorId: req.user.id }, { status: "ACTIVE" }];
  if (status) where.status = status;
  if (level && req.user.role !== "STUDENT") where.level = level;

  try {
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          professor: { select: { id: true, name: true, email: true } },
          _count: { select: { enrollments: true, modules: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.course.count({ where }),
    ]);

    res.json({
      data: courses,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener los cursos.", error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// Obtener curso por ID (control de acceso por rol)
// ────────────────────────────────────────────────────────────────────────────────
const getCourseById = async (req, res) => {
  const courseId = Number(req.params.id);
  if (isNaN(courseId))
    return res.status(400).json({ message: "ID de curso inválido." });

  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        professor: { select: { id: true, name: true, email: true } },
        modules: {
          orderBy: { order: "asc" },
          include: { lessons: true, labs: true, exams: true },
        },
        enrollments: {
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!course)
      return res.status(404).json({ message: "Curso no encontrado." });

    if (req.user.role === "STUDENT") {
      const isEnrolled = course.enrollments.some(
        (e) => e.student.id === req.user.id
      );
      if (!isEnrolled && course.status !== "ACTIVE")
        return res
          .status(403)
          .json({ message: "No tienes acceso a este curso." });
    }

    res.json(course);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener el curso.", error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// Actualizar curso
// ────────────────────────────────────────────────────────────────────────────────
const updateCourse = async (req, res) => {
  const courseId = Number(req.params.id);
  if (isNaN(courseId))
    return res.status(400).json({ message: "ID de curso inválido." });

  const { title, description, level, status, professorId } = req.body;

  try {
    const existing = await prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!existing)
      return res.status(404).json({ message: "Curso no encontrado." });

    if (req.user.role !== "ADMIN" && existing.professorId !== req.user.id)
      return res
        .status(403)
        .json({ message: "No tienes permiso para editar este curso." });
    if (
      req.user.role === "PROFESSOR" &&
      professorId &&
      Number(professorId) !== req.user.id
    )
      return res
        .status(403)
        .json({ message: "No puedes reasignar el profesor." });

    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (level !== undefined) data.level = level;
    if (status !== undefined) data.status = status;
    if (professorId !== undefined && req.user.role === "ADMIN")
      data.professor = { connect: { id: Number(professorId) } };

    const updated = await prisma.course.update({
      where: { id: courseId },
      data,
      include: { professor: { select: { id: true, name: true, email: true } } },
    });
    res.json(updated);
  } catch (error) {
    if (error.code === "P2025")
      return res.status(404).json({ message: "Curso no encontrado." });
    if (error.code === "P2003")
      return res.status(400).json({ message: "Profesor no válido." });
    res
      .status(400)
      .json({ message: "Error al actualizar el curso.", error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// Eliminar o archivar curso
// ────────────────────────────────────────────────────────────────────────────────
const deleteCourse = async (req, res) => {
  const courseId = Number(req.params.id);
  if (isNaN(courseId))
    return res.status(400).json({ message: "ID de curso inválido." });

  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { enrollments: true },
    });
    if (!course)
      return res.status(404).json({ message: "Curso no encontrado." });

    if (req.user.role !== "ADMIN" && course.professorId !== req.user.id)
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar este curso." });
    if (course.enrollments.length > 0) {
      const archived = await prisma.course.update({
        where: { id: courseId },
        data: { status: "CLOSED" },
      });
      return res.json({
        ...archived,
        message: "Curso archivado (no eliminado por tener alumnos).",
      });
    }

    await prisma.course.delete({ where: { id: courseId } });
    res.json({ message: "Curso eliminado permanentemente." });
  } catch (error) {
    if (error.code === "P2025")
      return res.status(404).json({ message: "Curso no encontrado." });
    res
      .status(400)
      .json({ message: "Error al eliminar el curso.", error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// Listar estudiantes inscritos
// ────────────────────────────────────────────────────────────────────────────────
const getEnrolledStudents = async (req, res) => {
  const courseId = Number(req.params.id);
  if (isNaN(courseId))
    return res.status(400).json({ message: "ID de curso inválido." });

  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        professor: { select: { id: true, name: true } },
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!course)
      return res.status(404).json({ message: "Curso no encontrado." });

    if (req.user.role !== "ADMIN" && req.user.id !== course.professorId)
      return res.status(403).json({
        message: "No tienes permiso para ver los inscritos de este curso.",
      });

    const students = course.enrollments.map((e) => ({
      id: e.student.id,
      name: e.student.name,
      email: e.student.email,
      enrolledAt: e.student.createdAt,
    }));

    res.json({
      course: { id: course.id, title: course.title, code: course.code },
      professor: course.professor,
      totalStudents: students.length,
      students,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener estudiantes inscritos.",
      error: error.message,
    });
  }
};

module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getEnrolledStudents,
};
