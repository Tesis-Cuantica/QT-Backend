// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: moduleController.js
// ═══════════════════════════════════════════════════════════════════════════════
const prisma = require("../models");

const createModule = async (req, res) => {
  const { courseId, title, order } = req.body;
  const cid = Number(courseId);
  if (isNaN(cid)) {
    return res.status(400).json({ message: "ID de curso inválido." });
  }

  if (!title) {
    return res.status(400).json({ message: "title es requerido." });
  }

  try {
    const course = await prisma.course.findUnique({
      where: { id: cid },
      select: { professorId: true },
    });
    if (!course)
      return res.status(404).json({ message: "Curso no encontrado." });
    if (req.user.role !== "ADMIN" && course.professorId !== req.user.id) {
      return res
        .status(403)
        .json({
          message: "No tienes permiso para agregar módulos a este curso.",
        });
    }

    const nextOrder =
      order || (await prisma.module.count({ where: { courseId: cid } })) + 1;

    const module = await prisma.module.create({
      data: { title, courseId: cid, order: nextOrder },
      include: { course: { select: { id: true, title: true } } },
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
  const cid = Number(courseId);
  if (isNaN(cid)) {
    return res.status(400).json({ message: "ID de curso inválido." });
  }

  try {
    const course = await prisma.course.findUnique({
      where: { id: cid },
      include: { enrollments: { where: { studentId: req.user.id } } },
    });
    if (!course)
      return res.status(404).json({ message: "Curso no encontrado." });

    if (req.user.role === "STUDENT") {
      const isEnrolled = course.enrollments.length > 0;
      if (!isEnrolled && course.status !== "ACTIVE") {
        return res
          .status(403)
          .json({ message: "No tienes acceso a este curso." });
      }
    }

    const modules = await prisma.module.findMany({
      where: { courseId: cid },
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
  const mid = Number(id);
  if (isNaN(mid)) {
    return res.status(400).json({ message: "ID de módulo inválido." });
  }

  try {
    const module = await prisma.module.findUnique({
      where: { id: mid },
      include: {
        course: {
          select: { id: true, title: true, professorId: true, status: true },
          include: { enrollments: { where: { studentId: req.user.id } } },
        },
        lessons: { orderBy: { order: "asc" } },
        labs: true,
        exams: true,
      },
    });
    if (!module)
      return res.status(404).json({ message: "Módulo no encontrado." });

    if (req.user.role === "STUDENT") {
      const isEnrolled = module.course.enrollments.length > 0;
      if (!isEnrolled && module.course.status !== "ACTIVE") {
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
  const mid = Number(id);
  if (isNaN(mid)) {
    return res.status(400).json({ message: "ID de módulo inválido." });
  }

  const { title, order } = req.body;

  try {
    const existing = await prisma.module.findUnique({
      where: { id: mid },
      include: { course: { select: { professorId: true } } },
    });
    if (!existing)
      return res.status(404).json({ message: "Módulo no encontrado." });
    if (
      req.user.role !== "ADMIN" &&
      existing.course.professorId !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para editar este módulo." });
    }

    const data = {};
    if (title !== undefined) data.title = title;
    if (order !== undefined && order !== existing.order) data.order = order;

    const updated = await prisma.module.update({
      where: { id: mid },
      data,
      include: { course: { select: { id: true, title: true } } },
    });
    res.json(updated);
  } catch (error) {
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ message: "Ya existe un módulo con ese orden en el curso." });
    }
    res
      .status(400)
      .json({
        message: "Error al actualizar el módulo.",
        error: error.message,
      });
  }
};

const deleteModule = async (req, res) => {
  const { id } = req.params;
  const mid = Number(id);
  if (isNaN(mid)) {
    return res.status(400).json({ message: "ID de módulo inválido." });
  }

  try {
    const module = await prisma.module.findUnique({
      where: { id: mid },
      include: { course: { select: { professorId: true } } },
    });
    if (!module)
      return res.status(404).json({ message: "Módulo no encontrado." });
    if (
      req.user.role !== "ADMIN" &&
      module.course.professorId !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar este módulo." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.module.delete({ where: { id: mid } });
      const remaining = await tx.module.findMany({
        where: { courseId: module.courseId },
        orderBy: { order: "asc" },
      });
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].order !== i + 1) {
          await tx.module.update({
            where: { id: remaining[i].id },
            data: { order: i + 1 },
          });
        }
      }
    });

    res.json({ message: "Módulo eliminado y orden reajustado." });
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
