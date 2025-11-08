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

  try {
    let professorId = req.user.id;
    if (moduleId) {
      const module = await prisma.module.findUnique({
        where: { id: parseInt(moduleId) },
        include: { course: { select: { professorId: true } } },
      });
      if (!module)
        return res.status(404).json({ message: "Módulo no encontrado." });
      if (
        req.user.role !== "ADMIN" &&
        module.course.professorId !== req.user.id
      ) {
        return res.status(403).json({
          message: "No tienes permiso para crear laboratorios en este módulo.",
        });
      }
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
        ...(moduleId && { module: { connect: { id: parseInt(moduleId) } } }),
      },
      include: {
        author: { select: { id: true, name: true } },
        ...(moduleId && { module: { select: { id: true, title: true } } }),
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
  const { moduleId } = req.params;

  try {
    const module = await prisma.module.findUnique({
      where: { id: parseInt(moduleId) },
      include: { course: { include: { enrollments: true } } },
    });

    if (!module)
      return res.status(404).json({ message: "Módulo no encontrado." });

    if (req.user.role === "STUDENT") {
      const isEnrolled = module.course.enrollments.some(
        (e) => e.studentId === req.user.id
      );
      if (!isEnrolled && module.course.status !== "ACTIVE") {
        return res
          .status(403)
          .json({ message: "No tienes acceso a este laboratorio." });
      }
    }

    const labs = await prisma.quantumLab.findMany({
      where: { moduleId: parseInt(moduleId) },
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

  if (!circuitJSON) {
    return res.status(400).json({ message: "circuitJSON es requerido." });
  }

  try {
    const result = simulateCircuit(circuitJSON);
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const saveStudentLab = async (req, res) => {
  const { labId, circuitJSON } = req.body;
  const studentId = req.user.id;

  try {
    const result = simulateCircuit(circuitJSON);

    let passed = false;
    if (labId) {
      const lab = await prisma.quantumLab.findUnique({
        where: { id: parseInt(labId) },
      });
      if (lab && lab.correctResult) {
        passed = JSON.stringify(result) === lab.correctResult;
      } else {
        passed = true;
      }
    } else {
      passed = true;
    }

    const studentLab = await prisma.studentLab.upsert({
      where: {
        studentId_labId: { studentId, labId: labId ? parseInt(labId) : null },
      },
      update: { circuitJSON, result: JSON.stringify(result), passed },
      create: {
        studentId,
        labId: labId ? parseInt(labId) : null,
        circuitJSON,
        result: JSON.stringify(result),
        passed,
      },
    });

    res.status(201).json({ ...studentLab, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const getLabById = async (req, res) => {
  const { id } = req.params;

  try {
    const lab = await prisma.quantumLab.findUnique({
      where: { id: parseInt(id) },
      include: {
        module: {
          include: { course: { include: { enrollments: true } } },
        },
        author: { select: { name: true } },
      },
    });

    if (!lab)
      return res.status(404).json({ message: "Laboratorio no encontrado." });

    if (lab.module && req.user.role === "STUDENT") {
      const isEnrolled = lab.module.course.enrollments.some(
        (e) => e.studentId === req.user.id
      );
      if (!isEnrolled && lab.module.course.status !== "ACTIVE") {
        return res
          .status(403)
          .json({ message: "No tienes acceso a este laboratorio." });
      }
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
  const { id } = req.params;
  const { title, description, circuitJSON, correctResult, isTemplate } =
    req.body;

  try {
    const existing = await prisma.quantumLab.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existing)
      return res.status(404).json({ message: "Laboratorio no encontrado." });

    if (req.user.role !== "ADMIN" && existing.authorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para editar este laboratorio." });
    }

    const updated = await prisma.quantumLab.update({
      where: { id: parseInt(id) },
      data: { title, description, circuitJSON, correctResult, isTemplate },
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
  const { id } = req.params;

  try {
    const lab = await prisma.quantumLab.findUnique({
      where: { id: parseInt(id) },
    });
    if (!lab)
      return res.status(404).json({ message: "Laboratorio no encontrado." });

    if (req.user.role !== "ADMIN" && lab.authorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar este laboratorio." });
    }

    await prisma.quantumLab.delete({ where: { id: parseInt(id) } });
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
