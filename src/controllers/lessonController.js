// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: lessonController.js
// ═══════════════════════════════════════════════════════════════════════════════

const prisma = require("../models");

const canManageModule = async (user, moduleId) => {
  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { course: { select: { professorId: true } } },
  });
  if (!mod) return { allowed: false, reason: "Módulo no encontrado." };
  if (user.role === "ADMIN") return { allowed: true, module: mod };
  if (user.role === "PROFESSOR" && mod.course.professorId === user.id)
    return { allowed: true, module: mod };
  return {
    allowed: false,
    reason: "No tienes permiso para gestionar lecciones de este módulo.",
  };
};

const createLesson = async (req, res) => {
  try {
    const { moduleId, title, content, type, order } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    if (!moduleId || isNaN(moduleId))
      return res
        .status(400)
        .json({ message: "El ID del módulo es requerido y debe ser válido." });

    if (!title)
      return res
        .status(400)
        .json({ message: "El título de la lección es obligatorio." });

    const mod = await prisma.module.findUnique({
      where: { id: Number(moduleId) },
      include: {
        course: { select: { id: true, professorId: true } },
        lessons: true,
      },
    });

    if (!mod) return res.status(404).json({ message: "Módulo no encontrado." });

    if (role === "PROFESSOR" && mod.course.professorId !== userId)
      return res.status(403).json({
        message: "No tienes permiso para agregar lecciones en este módulo.",
      });

    const sameOrder = mod.lessons.find((l) => l.order === order);
    if (sameOrder)
      return res.status(400).json({
        message: "Ya existe una lección con ese orden en este módulo.",
      });

    const lesson = await prisma.lesson.create({
      data: {
        moduleId: Number(moduleId),
        title,
        content,
        type: type || "TEXT",
        order: order || mod.lessons.length + 1,
      },
    });

    res.status(201).json({
      message: "Lección creada correctamente.",
      data: lesson,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear la lección.",
      error: error.message,
    });
  }
};

module.exports = { createLesson };

module.exports = { createLesson };

const getLessonsByModule = async (req, res) => {
  const moduleId = Number(req.params.moduleId);
  if (isNaN(moduleId))
    return res.status(400).json({ message: "ID de módulo inválido." });

  try {
    const mod = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        course: {
          include: {
            enrollments: { where: { studentId: req.user.id } },
          },
        },
      },
    });

    if (!mod) return res.status(404).json({ message: "Módulo no encontrado." });

    if (req.user.role === "STUDENT") {
      const isEnrolled = mod.course.enrollments.length > 0;
      if (!isEnrolled && mod.course.status !== "ACTIVE")
        return res
          .status(403)
          .json({ message: "No tienes acceso a este módulo." });
    }

    const lessons = await prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { order: "asc" },
    });
    res.json(lessons);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener lecciones.", error: error.message });
  }
};

const getLessonById = async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id))
    return res.status(400).json({ message: "ID de lección inválido." });

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
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
  const id = Number(req.params.id);
  const { title, content, type, order } = req.body;
  if (isNaN(id))
    return res.status(400).json({ message: "ID de lección inválido." });

  try {
    const existing = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: { include: { course: { select: { professorId: true } } } },
      },
    });

    if (!existing)
      return res.status(404).json({ message: "Lección no encontrada." });

    const professorId = existing.module.course.professorId;
    if (
      !(
        req.user.role === "ADMIN" ||
        (req.user.role === "PROFESSOR" && req.user.id === professorId)
      )
    )
      return res
        .status(403)
        .json({ message: "No tienes permiso para editar esta lección." });

    const data = {};
    if (typeof title === "string") data.title = title;
    if (typeof content === "string" || content === null)
      data.content = content ?? null;
    if (typeof type === "string") data.type = type.toUpperCase();

    // 🔁 Si se envía un nuevo order diferente
    if (typeof order === "number" && order !== existing.order) {
      const otherLesson = await prisma.lesson.findFirst({
        where: {
          moduleId: existing.moduleId,
          order,
          NOT: { id },
        },
      });

      if (otherLesson) {
        // Transacción para evitar violación de unicidad
        await prisma.$transaction(async (tx) => {
          // Paso 1: mover la otra lección temporalmente
          await tx.lesson.update({
            where: { id: otherLesson.id },
            data: { order: -1 },
          });

          // Paso 2: mover la lección actual al nuevo orden
          await tx.lesson.update({
            where: { id: existing.id },
            data: { ...data, order },
          });

          // Paso 3: devolver la otra al orden antiguo
          await tx.lesson.update({
            where: { id: otherLesson.id },
            data: { order: existing.order },
          });
        });
      } else {
        // No hay conflicto, solo actualizar
        data.order = order;
        await prisma.lesson.update({
          where: { id },
          data,
        });
      }
    } else {
      await prisma.lesson.update({
        where: { id },
        data,
      });
    }

    const updated = await prisma.lesson.findUnique({ where: { id } });
    res.json({ message: "Lección actualizada correctamente.", data: updated });
  } catch (error) {
    res.status(400).json({
      message: "Error al actualizar la lección.",
      error: error.message,
    });
  }
};

const deleteLesson = async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id))
    return res.status(400).json({ message: "ID de lección inválido." });

  try {
    const existing = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: { include: { course: { select: { professorId: true } } } },
      },
    });
    if (!existing)
      return res.status(404).json({ message: "Lección no encontrada." });

    const professorId = existing.module.course.professorId;
    if (
      !(
        req.user.role === "ADMIN" ||
        (req.user.role === "PROFESSOR" && req.user.id === professorId)
      )
    )
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar esta lección." });

    await prisma.lesson.delete({ where: { id } });

    // Reordenar
    const remaining = await prisma.lesson.findMany({
      where: { moduleId: existing.moduleId },
      orderBy: { order: "asc" },
    });

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order !== i + 1) {
        await prisma.lesson.update({
          where: { id: remaining[i].id },
          data: { order: i + 1 },
        });
      }
    }

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
