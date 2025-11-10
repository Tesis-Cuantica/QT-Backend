const prisma = require("../models");

const completeCourse = async (req, res) => {
  const studentId = req.user.id;
  const { courseId } = req.params;

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: parseInt(studentId),
          courseId: parseInt(courseId),
        },
      },
    });

    if (!enrollment)
      return res
        .status(404)
        .json({ message: "No estás inscrito en este curso." });

    if (enrollment.completed && enrollment.progress === 100)
      return res.status(400).json({ message: "El curso ya está completado." });

    const updated = await prisma.enrollment.update({
      where: {
        studentId_courseId: {
          studentId: parseInt(studentId),
          courseId: parseInt(courseId),
        },
      },
      data: {
        completed: true,
        progress: 100,
        completedAt: new Date(),
      },
    });

    res.json({
      message: "Curso marcado como completado.",
      enrollment: updated,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al marcar el curso como completado.",
      error: error.message,
    });
  }
};

module.exports = { completeCourse };
