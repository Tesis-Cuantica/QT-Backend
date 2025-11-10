// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: adminController.js
// ═══════════════════════════════════════════════════════════════════════════════
const prisma = require("../models");
const bcrypt = require("bcrypt");

const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    res.json({
      data: users,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener usuarios.", error: error.message });
  }
};

const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!["ADMIN", "PROFESSOR", "STUDENT"].includes(role)) {
    return res.status(400).json({ message: "Rol inválido." });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "El correo ya está registrado." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    res.status(201).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al crear usuario.", error: error.message });
  }
};

const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const userId = Number(id);

  if (isNaN(userId)) {
    return res.status(400).json({ message: "ID inválido." });
  }

  if (!["ADMIN", "PROFESSOR", "STUDENT"].includes(role)) {
    return res.status(400).json({ message: "Rol inválido." });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    res.json(updated);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    res
      .status(400)
      .json({ message: "Error al actualizar el rol.", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  const userId = Number(id);

  if (isNaN(userId)) {
    return res.status(400).json({ message: "ID inválido." });
  }

  try {
    const hasCourses = await prisma.course.count({
      where: { professorId: userId },
    });
    const hasEnrollments = await prisma.enrollment.count({
      where: { studentId: userId },
    });

    if (hasCourses > 0 || hasEnrollments > 0) {
      return res.status(400).json({
        message: "No se puede eliminar: el usuario tiene datos asociados.",
      });
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: "Usuario eliminado correctamente." });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    res
      .status(400)
      .json({ message: "Error al eliminar el usuario.", error: error.message });
  }
};

const getAllCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        skip,
        take: limit,
        include: {
          professor: { select: { name: true, email: true } },
          _count: { select: { enrollments: true, modules: true } },
        },
      }),
      prisma.course.count(),
    ]);

    res.json({
      data: courses,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener cursos.", error: error.message });
  }
};

const getCourseById = async (req, res) => {
  const { id } = req.params;
  const courseId = Number(id);

  if (isNaN(courseId)) {
    return res.status(400).json({ message: "ID de curso inválido." });
  }

  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        professor: { select: { id: true, name: true, email: true } },
        modules: {
          orderBy: { order: "asc" },
          select: { id: true, title: true, order: true },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ message: "Curso no encontrado." });
    }

    res.json(course);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener el curso.", error: error.message });
  }
};

const createCourse = async (req, res) => {
  const {
    title,
    description,
    category,
    level,
    status,
    professorId,
    price,
    thumbnail,
  } = req.body;

  if (!["DRAFT", "ACTIVE", "CLOSED"].includes(status)) {
    return res.status(400).json({ message: "Estado inválido." });
  }

  try {
    const professor = await prisma.user.findUnique({
      where: { id: Number(professorId), role: "PROFESSOR" },
    });
    if (!professor) {
      return res.status(400).json({ message: "Profesor no válido." });
    }

    const course = await prisma.course.create({
      data: {
        title,
        description,
        category,
        level,
        status,
        price: price ? parseFloat(price) : null,
        thumbnail,
        professorId: professor.id,
      },
    });
    res.status(201).json(course);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al crear el curso.", error: error.message });
  }
};

const updateCourse = async (req, res) => {
  const { id } = req.params;
  const courseId = Number(id);
  const {
    title,
    description,
    category,
    level,
    status,
    professorId,
    price,
    thumbnail,
  } = req.body;

  if (isNaN(courseId)) {
    return res.status(400).json({ message: "ID de curso inválido." });
  }

  if (status && !["DRAFT", "ACTIVE", "CLOSED"].includes(status)) {
    return res.status(400).json({ message: "Estado inválido." });
  }

  try {
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (level !== undefined) data.level = level;
    if (status !== undefined) data.status = status;
    if (price !== undefined) data.price = price ? parseFloat(price) : null;
    if (thumbnail !== undefined) data.thumbnail = thumbnail;
    if (professorId !== undefined) {
      const professor = await prisma.user.findUnique({
        where: { id: Number(professorId), role: "PROFESSOR" },
      });
      if (!professor) {
        return res.status(400).json({ message: "Profesor no válido." });
      }
      data.professorId = professor.id;
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data,
    });
    res.json(updated);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Curso no encontrado." });
    }
    res
      .status(400)
      .json({ message: "Error al actualizar el curso.", error: error.message });
  }
};

const updateCourseStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const courseId = Number(id);

  if (isNaN(courseId)) {
    return res.status(400).json({ message: "ID de curso inválido." });
  }

  if (!["DRAFT", "ACTIVE", "CLOSED"].includes(status)) {
    return res.status(400).json({ message: "Estado inválido." });
  }

  try {
    const updated = await prisma.course.update({
      where: { id: courseId },
      data: { status },
    });
    res.json(updated);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Curso no encontrado." });
    }
    res
      .status(400)
      .json({ message: "Error al actualizar el curso.", error: error.message });
  }
};
const deleteCourse = async (req, res) => {
  const { id } = req.params;
  const courseId = Number(id);

  if (isNaN(courseId)) {
    return res.status(400).json({ message: "ID de curso inválido." });
  }

  try {
    await prisma.course.delete({ where: { id: courseId } });
    res.json({ message: "Curso eliminado correctamente." });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Curso no encontrado." });
    }
    res.status(400).json({
      message: "Error al eliminar el curso.",
      error: error.message,
    });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUserRole,
  deleteUser,
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  updateCourseStatus,
  deleteCourse,
};
