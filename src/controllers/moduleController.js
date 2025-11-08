const prisma = require("../models");

const createModule = async (req, res) => {
  const { courseId, title, order } = req.body;

  if (!courseId || !title) {
    return res
      .status(400)
      .json({ message: "courseId y title son requeridos." });
  }

  try {
    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) },
      select: { professorId: true },
    });

    if (!course) {
      return res.status(404).json({ message: "Curso no encontrado." });
    }

    if (req.user.role !== "ADMIN" && course.professorId !== req.user.id) {
      return res.status(403).json({
        message: "No tienes permiso para agregar módulos a este curso.",
      });
    }

    const nextOrder =
      order ||
      (await prisma.module.count({ where: { courseId: parseInt(courseId) } })) +
        1;

    const module = await prisma.module.create({
      data: {
        title,
        courseId: parseInt(courseId),
        order: nextOrder,
      },
      include: {
        course: { select: { id: true, title: true } },
      },
    });

    res.status(201).json(module);
  } catch (error) {
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ message: "Ya existe un módulo con ese orden en este curso." });
    }
    res
      .status(400)
      .json({ message: "Error al crear el módulo.", error: error.message });
  }
};

const getModulesByCourse = async (req, res) => {
  const { courseId } = req.params;

  try {
    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) },
      include: { enrollments: true },
    });

    if (!course) {
      return res.status(404).json({ message: "Curso no encontrado." });
    }

    if (req.user.role === "STUDENT") {
      const isEnrolled = course.enrollments.some(
        (e) => e.studentId === req.user.id
      );
      if (!isEnrolled && course.status !== "ACTIVE") {
        return res
          .status(403)
          .json({ message: "No tienes acceso a este curso." });
      }
    }

    const modules = await prisma.module.findMany({
      where: { courseId: parseInt(courseId) },
      orderBy: { order: "asc" },
      include: {
        lessons: { orderBy: { order: "asc" } },
        labs: true,
        exams: true,
      },
    });

    res.json(modules);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener los módulos.", error: error.message });
  }
};

const getModuleById = async (req, res) => {
  const { id } = req.params;

  try {
    const module = await prisma.module.findUnique({
      where: { id: parseInt(id) },
      include: {
        course: { select: { id: true, title: true, professorId: true } },
        lessons: { orderBy: { order: "asc" } },
        labs: true,
        exams: true,
      },
    });

    if (!module) {
      return res.status(404).json({ message: "Módulo no encontrado." });
    }

    if (req.user.role === "STUDENT") {
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: req.user.id, courseId: module.course.id },
      });
      const course = await prisma.course.findUnique({
        where: { id: module.course.id },
      });
      if (!enrollment && course.status !== "ACTIVE") {
        return res
          .status(403)
          .json({ message: "No tienes acceso a este módulo." });
      }
    }

    res.json(module);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener el módulo.", error: error.message });
  }
};

const updateModule = async (req, res) => {
  const { id } = req.params;
  const { title, order } = req.body;

  try {
    const existing = await prisma.module.findUnique({
      where: { id: parseInt(id) },
      include: { course: { select: { professorId: true } } },
    });

    if (!existing) {
      return res.status(404).json({ message: "Módulo no encontrado." });
    }

    if (
      req.user.role !== "ADMIN" &&
      existing.course.professorId !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para editar este módulo." });
    }

    const updated = await prisma.module.update({
      where: { id: parseInt(id) },
      data: { title, order },
      include: {
        course: { select: { id: true, title: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ message: "Ya existe un módulo con ese orden en el curso." });
    }
    res.status(400).json({
      message: "Error al actualizar el módulo.",
      error: error.message,
    });
  }
};

const deleteModule = async (req, res) => {
  const { id } = req.params;

  try {
    const module = await prisma.module.findUnique({
      where: { id: parseInt(id) },
      include: { course: { select: { professorId: true } } },
    });

    if (!module) {
      return res.status(404).json({ message: "Módulo no encontrado." });
    }

    if (
      req.user.role !== "ADMIN" &&
      module.course.professorId !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar este módulo." });
    }

    await prisma.module.delete({ where: { id: parseInt(id) } });

    res.json({ message: "Módulo eliminado correctamente." });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al eliminar el módulo.", error: error.message });
  }
};

module.exports = {
  createModule,
  getModulesByCourse,
  getModuleById,
  updateModule,
  deleteModule,
};
