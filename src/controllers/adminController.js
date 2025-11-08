const prisma = require("../models");
const bcrypt = require("bcrypt");

const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    res.json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener usuarios.", error: error.message });
  }
};

const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!["ADMIN", "PROFESSOR", "STUDENT"].includes(role)) {
    return res.status(400).json({ message: "Rol inválido." });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { role },
    });
    res.json(updated);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al actualizar el rol.", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const hasCourses = await prisma.course.count({
      where: { professorId: parseInt(id) },
    });
    const hasEnrollments = await prisma.enrollment.count({
      where: { studentId: parseInt(id) },
    });

    if (hasCourses > 0 || hasEnrollments > 0) {
      return res
        .status(400)
        .json({
          message: "No se puede eliminar: el usuario tiene datos asociados.",
        });
    }

    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Usuario eliminado correctamente." });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al eliminar el usuario.", error: error.message });
  }
};

const getAllCourses = async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        professor: { select: { name: true, email: true } },
        _count: { select: { enrollments: true, modules: true } },
      },
    });
    res.json(courses);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener cursos.", error: error.message });
  }
};

const updateCourseStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["DRAFT", "ACTIVE", "CLOSED"].includes(status)) {
    return res.status(400).json({ message: "Estado inválido." });
  }

  try {
    const updated = await prisma.course.update({
      where: { id: parseInt(id) },
      data: { status },
    });
    res.json(updated);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error al actualizar el curso.", error: error.message });
  }
};

module.exports = {
  getUsers,
  updateUserRole,
  deleteUser,
  getAllCourses,
  updateCourseStatus,
};
