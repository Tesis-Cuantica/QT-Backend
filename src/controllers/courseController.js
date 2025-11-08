const prisma = require("../models");

const createCourse = async (req, res) => {
  const { title, description, level = "BASIC", status = "DRAFT" } = req.body;
  const professorId =
    req.user.role === "PROFESSOR" ? req.user.id : req.body.professorId;

  if (!title) {
    return res
      .status(400)
      .json({ message: "El título del curso es requerido." });
  }

  if (
    req.user.role === "PROFESSOR" &&
    req.body.professorId &&
    req.body.professorId !== req.user.id
  ) {
    return res
      .status(403)
      .json({ message: "No puedes asignar otro profesor." });
  }

  try {
    const course = await prisma.course.create({
      data: {
        title,
        description,
        level,
        status,
        professor: {
          connect: { id: professorId },
        },
      },
      include: {
        professor: { select: { id: true, name: true, email: true } },
      },
    });
    res.status(201).json(course);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al crear el curso.", error: error.message });
  }
};

const getCourses = async (req, res) => {
  const { status, level } = req.query;
  let where = {};

  if (req.user.role === "STUDENT") {
    where.status = "ACTIVE";
  } else if (req.user.role === "PROFESSOR") {
    where.OR = [{ professorId: req.user.id }, { status: "ACTIVE" }];
    if (status) where.status = status;
  } else {
    if (status) where.status = status;
    if (level) where.level = level;
  }

  try {
    const courses = await prisma.course.findMany({
      where,
      include: {
        professor: { select: { id: true, name: true, email: true } },
        _count: { select: { enrollments: true, modules: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(courses);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener los cursos.", error: error.message });
  }
};

const getCourseById = async (req, res) => {
  const { id } = req.params;

  try {
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) },
      include: {
        professor: { select: { id: true, name: true, email: true } },
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: true,
            labs: true,
            exams: true,
          },
        },
        enrollments: {
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ message: "Curso no encontrado." });
    }

    if (req.user.role === "STUDENT") {
      const isEnrolled = course.enrollments.some(
        (e) => e.student.id === req.user.id
      );
      if (!isEnrolled && course.status !== "ACTIVE") {
        return res
          .status(403)
          .json({ message: "No tienes acceso a este curso." });
      }
    }

    res.json(course);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener el curso.", error: error.message });
  }
};

const updateCourse = async (req, res) => {
  const { id } = req.params;
  const { title, description, level, status, professorId } = req.body;

  try {
    const existing = await prisma.course.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existing)
      return res.status(404).json({ message: "Curso no encontrado." });

    if (req.user.role !== "ADMIN" && existing.professorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para editar este curso." });
    }

    if (
      req.user.role === "PROFESSOR" &&
      professorId &&
      professorId !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: "No puedes reasignar el profesor." });
    }

    const updated = await prisma.course.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        level,
        status,
        ...(professorId &&
          req.user.role === "ADMIN" && {
            professor: { connect: { id: professorId } },
          }),
      },
      include: {
        professor: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al actualizar el curso.", error: error.message });
  }
};

const deleteCourse = async (req, res) => {
  const { id } = req.params;

  try {
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) },
      include: { enrollments: true },
    });

    if (!course)
      return res.status(404).json({ message: "Curso no encontrado." });

    if (req.user.role !== "ADMIN" && course.professorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar este curso." });
    }

    if (course.enrollments.length > 0) {
      const archived = await prisma.course.update({
        where: { id: parseInt(id) },
        data: { status: "CLOSED" },
      });
      return res.json({
        ...archived,
        message: "Curso archivado (no eliminado por tener alumnos).",
      });
    }

    await prisma.course.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Curso eliminado permanentemente." });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al eliminar el curso.", error: error.message });
  }
};

module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
};
