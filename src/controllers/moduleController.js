// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: moduleController.js
// ═══════════════════════════════════════════════════════════════════════════════

const prisma = require("../models");

const canManageCourse = (user, courseProfessorId) =>
  user.role === "ADMIN" ||
  (user.role === "PROFESSOR" && user.id === courseProfessorId);

const createModule = async (req, res) => {
  const courseId = Number(req.params.courseId);
  const { title, order } = req.body;
  if (isNaN(courseId))
    return res.status(400).json({ message: "ID de curso inválido." });
  if (!title) return res.status(400).json({ message: "title es requerido." });

  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, status: true, professorId: true },
    });
    if (!course)
      return res.status(404).json({ message: "Curso no encontrado." });
    if (!canManageCourse(req.user, course.professorId))
      return res.status(403).json({
        message: "No tienes permiso para agregar módulos a este curso.",
      });

    const nextOrder =
      typeof order === "number"
        ? order
        : (await prisma.module.count({ where: { courseId } })) + 1;

    const mod = await prisma.module.create({
      data: { title, courseId, order: nextOrder },
      include: { course: { select: { id: true, title: true } } },
    });
    res.status(201).json(mod);
  } catch (error) {
    if (error.code === "P2002")
      return res
        .status(400)
        .json({ message: "Ya existe un módulo con ese orden en este curso." });
    res
      .status(400)
      .json({ message: "Error al crear el módulo.", error: error.message });
  }
};

const getModulesByCourse = async (req, res) => {
  const courseId = Number(req.params.courseId);
  if (isNaN(courseId))
    return res.status(400).json({ message: "ID de curso inválido." });

  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        enrollments: { where: { studentId: req.user.id } },
        professor: { select: { id: true } },
      },
    });
    if (!course)
      return res.status(404).json({ message: "Curso no encontrado." });

    if (req.user.role === "STUDENT") {
      const isEnrolled = course.enrollments.length > 0;
      if (!isEnrolled && course.status !== "ACTIVE")
        return res
          .status(403)
          .json({ message: "No tienes acceso a este curso." });
    }

    if (req.user.role === "PROFESSOR" && course.professor.id !== req.user.id) {
      if (course.status !== "ACTIVE") {
        return res
          .status(403)
          .json({ message: "No tienes acceso a este curso." });
      }
    }

    const modules = await prisma.module.findMany({
      where: { courseId },
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
  const id = Number(req.params.id);
  if (isNaN(id))
    return res.status(400).json({ message: "ID de módulo inválido." });

  try {
    const mod = await prisma.module.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            enrollments: { where: { studentId: req.user.id } },
          },
        },
        lessons: { orderBy: { order: "asc" } },
        labs: true,
        exams: true,
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

    if (
      req.user.role === "PROFESSOR" &&
      mod.course.professorId !== req.user.id
    ) {
      if (mod.course.status !== "ACTIVE") {
        return res
          .status(403)
          .json({ message: "No tienes acceso a este módulo." });
      }
    }

    res.json(mod);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener el módulo.", error: error.message });
  }
};

const updateModule = async (req, res) => {
  const id = Number(req.params.id);
  const { title, order } = req.body;
  if (isNaN(id))
    return res.status(400).json({ message: "ID de módulo inválido." });

  try {
    const existing = await prisma.module.findUnique({
      where: { id },
      include: { course: { select: { professorId: true, id: true } } },
    });
    if (!existing)
      return res.status(404).json({ message: "Módulo no encontrado." });
    if (!canManageCourse(req.user, existing.course.professorId))
      return res
        .status(403)
        .json({ message: "No tienes permiso para editar este módulo." });

    const data = {};
    if (typeof title === "string") data.title = title;
    if (typeof order === "number") data.order = order;

    const updated = await prisma.module.update({
      where: { id },
      data,
      include: { course: { select: { id: true, title: true } } },
    });
    res.json(updated);
  } catch (error) {
    if (error.code === "P2002")
      return res
        .status(400)
        .json({ message: "Ya existe un módulo con ese orden en el curso." });
    res.status(400).json({
      message: "Error al actualizar el módulo.",
      error: error.message,
    });
  }
};

const deleteModule = async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id))
    return res.status(400).json({ message: "ID de módulo inválido." });

  try {
    const existing = await prisma.module.findUnique({
      where: { id },
      include: { course: { select: { professorId: true, id: true } } },
    });
    if (!existing)
      return res.status(404).json({ message: "Módulo no encontrado." });
    if (!canManageCourse(req.user, existing.course.professorId))
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar este módulo." });

    await prisma.$transaction(async (tx) => {
      await tx.module.delete({ where: { id } });
      const remaining = await tx.module.findMany({
        where: { courseId: existing.course.id },
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
