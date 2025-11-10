// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: labController.js
// ═══════════════════════════════════════════════════════════════════════════════

const prisma = require("../models");
const { simulateCircuit } = require("../services/quantumSimulator");

const createLab = async (req, res) => {
  const {
    moduleId,
    title,
    description,
    circuitJSON,
    correctResult,
    isTemplate = false,
  } = req.body;
  const mid = moduleId ? Number(moduleId) : null;
  if (moduleId && isNaN(mid))
    return res.status(400).json({ message: "ID de módulo inválido." });

  try {
    let professorId = req.user.id;
    if (mid) {
      const module = await prisma.module.findUnique({
        where: { id: mid },
        include: { course: { select: { professorId: true } } },
      });
      if (!module)
        return res.status(404).json({ message: "Módulo no encontrado." });
      if (
        req.user.role !== "ADMIN" &&
        module.course.professorId !== req.user.id
      )
        return res.status(403).json({
          message: "No tienes permiso para crear laboratorios en este módulo.",
        });
      professorId = module.course.professorId;
    }

    const lab = await prisma.quantumLab.create({
      data: {
        title,
        description,
        circuitJSON,
        correctResult,
        isTemplate,
        author: { connect: { id: professorId } },
        ...(mid && { module: { connect: { id: mid } } }),
      },
      include: {
        author: { select: { id: true, name: true } },
        ...(mid && { module: { select: { id: true, title: true } } }),
      },
    });

    res.status(201).json(lab);
  } catch (error) {
    res.status(400).json({
      message: "Error al crear el laboratorio.",
      error: error.message,
    });
  }
};

const getLabsByModule = async (req, res) => {
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
          .json({ message: "No tienes acceso a este laboratorio." });
    }

    const labs = await prisma.quantumLab.findMany({
      where: { moduleId: mid },
      include: { author: { select: { name: true } } },
    });

    res.json(labs);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener los laboratorios.",
      error: error.message,
    });
  }
};

const runSimulation = async (req, res) => {
  const { circuitJSON } = req.body;
  if (!circuitJSON || typeof circuitJSON !== "string")
    return res
      .status(400)
      .json({ message: "circuitJSON es requerido y debe ser string." });
  if (circuitJSON.length > 10000)
    return res.status(400).json({ message: "Circuito demasiado grande." });

  try {
    const result = simulateCircuit(circuitJSON);
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const normalizeResult = (obj) => {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(normalizeResult).sort();
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = normalizeResult(obj[key]);
      return acc;
    }, {});
};

const saveStudentLab = async (req, res) => {
  const { labId, circuitJSON } = req.body;
  const studentId = req.user.id;

  if (!circuitJSON)
    return res.status(400).json({ message: "circuitJSON es requerido." });

  const lid = labId ? Number(labId) : null;
  if (labId && isNaN(lid))
    return res.status(400).json({ message: "ID de laboratorio inválido." });

  try {
    const result = simulateCircuit(circuitJSON);
    let passed = true;

    if (lid) {
      const lab = await prisma.quantumLab.findUnique({
        where: { id: lid },
        include: {
          module: {
            include: {
              course: { include: { enrollments: { where: { studentId } } } },
            },
          },
        },
      });

      if (!lab)
        return res.status(404).json({ message: "Laboratorio no encontrado." });
      if (lab.module) {
        const isEnrolled = lab.module.course.enrollments.length > 0;
        if (!isEnrolled && lab.module.course.status !== "ACTIVE")
          return res
            .status(403)
            .json({ message: "No tienes acceso a este laboratorio." });
      }

      if (lab.correctResult) {
        const expected = normalizeResult(JSON.parse(lab.correctResult));
        const given = normalizeResult(result);
        passed = JSON.stringify(expected) === JSON.stringify(given);
      }
    }

    const data = {
      studentId,
      circuitJSON,
      result: JSON.stringify(result),
      passed,
    };

    const studentLab = lid
      ? await prisma.studentLab.upsert({
          where: { studentId_labId: { studentId, labId: lid } },
          update: data,
          create: { ...data, labId: lid },
        })
      : await prisma.studentLab.create({ data });

    res.status(201).json({ ...studentLab, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const getLabById = async (req, res) => {
  const lid = Number(req.params.id);
  if (isNaN(lid))
    return res.status(400).json({ message: "ID de laboratorio inválido." });

  try {
    const lab = await prisma.quantumLab.findUnique({
      where: { id: lid },
      include: {
        module: {
          include: {
            course: {
              include: { enrollments: { where: { studentId: req.user.id } } },
            },
          },
        },
        author: { select: { name: true } },
      },
    });

    if (!lab)
      return res.status(404).json({ message: "Laboratorio no encontrado." });
    if (lab.module && req.user.role === "STUDENT") {
      const isEnrolled = lab.module.course.enrollments.length > 0;
      if (!isEnrolled && lab.module.course.status !== "ACTIVE")
        return res
          .status(403)
          .json({ message: "No tienes acceso a este laboratorio." });
    }

    res.json(lab);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el laboratorio.",
      error: error.message,
    });
  }
};

const updateLab = async (req, res) => {
  const lid = Number(req.params.id);
  if (isNaN(lid))
    return res.status(400).json({ message: "ID de laboratorio inválido." });

  const { title, description, circuitJSON, correctResult, isTemplate } =
    req.body;

  try {
    const existing = await prisma.quantumLab.findUnique({ where: { id: lid } });
    if (!existing)
      return res.status(404).json({ message: "Laboratorio no encontrado." });
    if (req.user.role !== "ADMIN" && existing.authorId !== req.user.id)
      return res
        .status(403)
        .json({ message: "No tienes permiso para editar este laboratorio." });

    const updated = await prisma.quantumLab.update({
      where: { id: lid },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(circuitJSON && { circuitJSON }),
        ...(correctResult && { correctResult }),
        ...(isTemplate !== undefined && { isTemplate }),
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({
      message: "Error al actualizar el laboratorio.",
      error: error.message,
    });
  }
};

const deleteLab = async (req, res) => {
  const lid = Number(req.params.id);
  if (isNaN(lid))
    return res.status(400).json({ message: "ID de laboratorio inválido." });

  try {
    const lab = await prisma.quantumLab.findUnique({ where: { id: lid } });
    if (!lab)
      return res.status(404).json({ message: "Laboratorio no encontrado." });
    if (req.user.role !== "ADMIN" && lab.authorId !== req.user.id)
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar este laboratorio." });

    await prisma.quantumLab.delete({ where: { id: lid } });
    res.json({ message: "Laboratorio eliminado correctamente." });
  } catch (error) {
    res.status(400).json({
      message: "Error al eliminar el laboratorio.",
      error: error.message,
    });
  }
};

module.exports = {
  createLab,
  getLabsByModule,
  getLabById,
  updateLab,
  deleteLab,
  runSimulation,
  saveStudentLab,
};
