const prisma = require("../models");

const createLesson = async (req, res) => {
  const { moduleId, title, content, type, order } = req.body;

  if (!moduleId || !title || !type) {
    return res
      .status(400)
      .json({ message: "moduleId, title y type son requeridos." });
  }

  try {
    const module = await prisma.module.findUnique({
      where: { id: parseInt(moduleId) },
      include: { course: { select: { professorId: true } } },
    });

    if (!module) {
      return res.status(404).json({ message: "Módulo no encontrado." });
    }

    if (
      req.user.role !== "ADMIN" &&
      module.course.professorId !== req.user.id
    ) {
      return res.status(403).json({
        message: "No tienes permiso para agregar lecciones a este módulo.",
      });
    }

    const nextOrder =
      order ||
      (await prisma.lesson.count({ where: { moduleId: parseInt(moduleId) } })) +
        1;

    const lesson = await prisma.lesson.create({
      data: {
        title,
        content,
        type,
        moduleId: parseInt(moduleId),
        order: nextOrder,
      },
      include: {
        module: { select: { id: true, title: true } },
      },
    });

    res.status(201).json(lesson);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({
        message: "Ya existe una lección con ese orden en este módulo.",
      });
    }
    res
      .status(400)
      .json({ message: "Error al crear la lección.", error: error.message });
  }
};

const getLessonsByModule = async (req, res) => {
  const { moduleId } = req.params;

  try {
    const module = await prisma.module.findUnique({
      where: { id: parseInt(moduleId) },
      include: { course: { include: { enrollments: true } } },
    });

    if (!module) {
      return res.status(404).json({ message: "Módulo no encontrado." });
    }

    if (req.user.role === "STUDENT") {
      const isEnrolled = module.course.enrollments.some(
        (e) => e.studentId === req.user.id
      );
      const courseActive = module.course.status === "ACTIVE";
      if (!isEnrolled && !courseActive) {
        return res
          .status(403)
          .json({ message: "No tienes acceso a este contenido." });
      }
    }

    const lessons = await prisma.lesson.findMany({
      where: { moduleId: parseInt(moduleId) },
      orderBy: { order: "asc" },
    });

    res.json(lessons);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener las lecciones.",
      error: error.message,
    });
  }
};

const getLessonById = async (req, res) => {
  const { id } = req.params;

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: parseInt(id) },
      include: {
        module: {
          include: {
            course: {
              include: { enrollments: true },
            },
          },
        },
      },
    });

    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada." });
    }

    if (req.user.role === "STUDENT") {
      const isEnrolled = lesson.module.course.enrollments.some(
        (e) => e.studentId === req.user.id
      );
      const courseActive = lesson.module.course.status === "ACTIVE";
      if (!isEnrolled && !courseActive) {
        return res
          .status(403)
          .json({ message: "No tienes acceso a esta lección." });
      }
    }

    res.json(lesson);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener la lección.", error: error.message });
  }
};

const updateLesson = async (req, res) => {
  const { id } = req.params;
  const { title, content, type, order } = req.body;

  try {
    const existing = await prisma.lesson.findUnique({
      where: { id: parseInt(id) },
      include: {
        module: {
          include: { course: { select: { professorId: true } } },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "Lección no encontrada." });
    }

    if (
      req.user.role !== "ADMIN" &&
      existing.module.course.professorId !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para editar esta lección." });
    }

    const updated = await prisma.lesson.update({
      where: { id: parseInt(id) },
      data: { title, content, type, order },
    });

    res.json(updated);
  } catch (error) {
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ message: "Ya existe una lección con ese orden en el módulo." });
    }
    res.status(400).json({
      message: "Error al actualizar la lección.",
      error: error.message,
    });
  }
};

const deleteLesson = async (req, res) => {
  const { id } = req.params;

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: parseInt(id) },
      include: {
        module: {
          include: { course: { select: { professorId: true } } },
        },
      },
    });

    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada." });
    }

    if (
      req.user.role !== "ADMIN" &&
      lesson.module.course.professorId !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar esta lección." });
    }

    await prisma.lesson.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Lección eliminada correctamente." });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al eliminar la lección.", error: error.message });
  }
};

module.exports = {
  createLesson,
  getLessonsByModule,
  getLessonById,
  updateLesson,
  deleteLesson,
};
