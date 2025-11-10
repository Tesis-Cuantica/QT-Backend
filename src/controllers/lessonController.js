// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: lessonController.js
// ═══════════════════════════════════════════════════════════════════════════════

const prisma = require("../models");

const createLesson = async (req, res) => {
  const { title, content, type, order } = req.body;
  const { moduleId } = req.params;
  const mid = Number(moduleId);
  if (isNaN(mid))
    return res.status(400).json({ message: "ID de módulo inválido." });
  if (!title || !type)
    return res.status(400).json({ message: "title y type son requeridos." });

  try {
    const module = await prisma.module.findUnique({
      where: { id: mid },
      include: { course: { select: { professorId: true } } },
    });
    if (!module)
      return res.status(404).json({ message: "Módulo no encontrado." });
    if (req.user.role !== "ADMIN" && module.course.professorId !== req.user.id)
      return res.status(403).json({
        message: "No tienes permiso para agregar lecciones a este módulo.",
      });

    const nextOrder =
      order || (await prisma.lesson.count({ where: { moduleId: mid } })) + 1;

    const lesson = await prisma.lesson.create({
      data: { title, content, type, moduleId: mid, order: nextOrder },
      include: { module: { select: { id: true, title: true } } },
    });
    res.status(201).json(lesson);
  } catch (error) {
    if (error.code === "P2002")
      return res.status(400).json({
        message: "Ya existe una lección con ese orden en este módulo.",
      });
    res
      .status(400)
      .json({ message: "Error al crear la lección.", error: error.message });
  }
};

const getLessonsByModule = async (req, res) => {
  const mid = Number(req.params.moduleId);
  if (isNaN(mid))
    return res.status(400).json({ message: "ID de módulo inválido." });

  try {
    const module = await prisma.module.findUnique({
      where: { id: mid },
      include: {
        course: {
          include: { enrollments: { where: { studentId: req.user.id } } },
        },
      },
    });
    if (!module)
      return res.status(404).json({ message: "Módulo no encontrado." });

    if (req.user.role === "STUDENT") {
      const isEnrolled = module.course.enrollments.length > 0;
      if (!isEnrolled && module.course.status !== "ACTIVE")
        return res
          .status(403)
          .json({ message: "No tienes acceso a este contenido." });
    }

    const lessons = await prisma.lesson.findMany({
      where: { moduleId: mid },
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
  const lid = Number(req.params.id);
  if (isNaN(lid))
    return res.status(400).json({ message: "ID de lección inválido." });

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lid },
      include: {
        module: {
          include: {
            course: {
              include: { enrollments: { where: { studentId: req.user.id } } },
            },
          },
        },
      },
    });
    if (!lesson)
      return res.status(404).json({ message: "Lección no encontrada." });

    if (req.user.role === "STUDENT") {
      const isEnrolled = lesson.module.course.enrollments.length > 0;
      if (!isEnrolled && lesson.module.course.status !== "ACTIVE")
        return res
          .status(403)
          .json({ message: "No tienes acceso a esta lección." });
    }

    res.json(lesson);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener la lección.", error: error.message });
  }
};

const updateLesson = async (req, res) => {
  const lid = Number(req.params.id);
  if (isNaN(lid))
    return res.status(400).json({ message: "ID de lección inválido." });

  const { title, content, type, order } = req.body;

  try {
    const existing = await prisma.lesson.findUnique({
      where: { id: lid },
      include: {
        module: { include: { course: { select: { professorId: true } } } },
      },
    });
    if (!existing)
      return res.status(404).json({ message: "Lección no encontrada." });
    if (
      req.user.role !== "ADMIN" &&
      existing.module.course.professorId !== req.user.id
    )
      return res
        .status(403)
        .json({ message: "No tienes permiso para editar esta lección." });

    const updated = await prisma.lesson.update({
      where: { id: lid },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(type && { type }),
        ...(order && order !== existing.order && { order }),
      },
    });
    res.json(updated);
  } catch (error) {
    if (error.code === "P2002")
      return res
        .status(400)
        .json({ message: "Ya existe una lección con ese orden en el módulo." });
    res.status(400).json({
      message: "Error al actualizar la lección.",
      error: error.message,
    });
  }
};

const deleteLesson = async (req, res) => {
  const lid = Number(req.params.id);
  if (isNaN(lid))
    return res.status(400).json({ message: "ID de lección inválido." });

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lid },
      include: {
        module: { include: { course: { select: { professorId: true } } } },
      },
    });
    if (!lesson)
      return res.status(404).json({ message: "Lección no encontrada." });
    if (
      req.user.role !== "ADMIN" &&
      lesson.module.course.professorId !== req.user.id
    )
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar esta lección." });

    await prisma.$transaction(async (tx) => {
      await tx.lesson.delete({ where: { id: lid } });
      const remaining = await tx.lesson.findMany({
        where: { moduleId: lesson.moduleId },
        orderBy: { order: "asc" },
      });
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].order !== i + 1)
          await tx.lesson.update({
            where: { id: remaining[i].id },
            data: { order: i + 1 },
          });
      }
    });

    res.json({ message: "Lección eliminada y orden reajustado." });
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
