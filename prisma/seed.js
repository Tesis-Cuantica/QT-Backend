// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  // === 1. Crear ADMIN ===
  const adminPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@quantumtec.com" },
    update: {},
    create: {
      name: "Administrador QuantumTec",
      email: "admin@quantumtec.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Usuario ADMIN creado o verificado:", admin.email);

  // === 2. Crear PROFESSOR ===
  const professorPassword = await bcrypt.hash("prof123", 12);
  const professor = await prisma.user.upsert({
    where: { email: "profesor@quantumtec.com" },
    update: {},
    create: {
      name: "Dr. Ana Cuántica",
      email: "profesor@quantumtec.com",
      password: professorPassword,
      role: "PROFESSOR",
    },
  });

  // === 3. Crear ESTUDIANTE ===
  const studentPassword = await bcrypt.hash("est123", 12);
  const student = await prisma.user.upsert({
    where: { email: "estudiante@quantumtec.com" },
    update: {},
    create: {
      name: "Carlos Estudiante",
      email: "estudiante@quantumtec.com",
      password: studentPassword,
      role: "STUDENT",
    },
  });

  // === 4. Crear CURSO ===
  const course = await prisma.course.create({
    data: {
      title: "Fundamentos de Computación Cuántica",
      description:
        "Curso introductorio a qubits, puertas cuánticas y algoritmos básicos.",
      level: "BASIC",
      status: "ACTIVE",
      professor: { connect: { id: professor.id } },
    },
  });

  // === 5. Crear MÓDULOS ===
  const module1 = await prisma.module.create({
    data: {
      title: "Qubits y Superposición",
      courseId: course.id,
      order: 1,
    },
  });

  const module2 = await prisma.module.create({
    data: {
      title: "Entrelazamiento Cuántico",
      courseId: course.id,
      order: 2,
    },
  });

  // === 6. Crear LECCIONES ===
  await prisma.lesson.createMany({
    data: [
      {
        title: "Introducción a los Qubits",
        content: "Un qubit es la unidad básica de información cuántica...",
        type: "text",
        moduleId: module1.id,
        order: 1,
      },
      {
        title: "Puerta Hadamard",
        content: "La puerta H crea superposición...",
        type: "video",
        moduleId: module1.id,
        order: 2,
      },
      {
        title: "El estado de Bell",
        content: "Dos qubits entrelazados...",
        type: "text",
        moduleId: module2.id,
        order: 1,
      },
    ],
  });

  // === 7. Crear LABORATORIOS ===
  await prisma.quantumLab.createMany({
    data: [
      {
        title: "Crear superposición con H",
        description: "Aplica la puerta H al qubit 0 y observa el resultado.",
        circuitJSON: JSON.stringify({
          qubits: 1,
          gates: [{ type: "H", qubit: 0 }],
        }),
        correctResult: JSON.stringify({
          statevector: [0.7071, 0.7071],
          probabilities: { 0: 0.5, 1: 0.5 },
        }),
        moduleId: module1.id,
        authorId: professor.id,
      },
      {
        title: "Generar estado de Bell",
        description: "Crea un par de qubits entrelazados.",
        circuitJSON: JSON.stringify({
          qubits: 2,
          gates: [
            { type: "H", qubit: 0 },
            { type: "CNOT", control: 0, target: 1 },
          ],
        }),
        correctResult: JSON.stringify({
          statevector: [0.7071, 0, 0, 0.7071],
          probabilities: { "00": 0.5, 11: 0.5 },
        }),
        moduleId: module2.id,
        authorId: professor.id,
      },
    ],
  });

  // === 8. Crear EXAMEN ===
  const exam = await prisma.exam.create({
    data: {
      title: "Examen Módulo 1",
      description: "Evalúa tus conocimientos sobre qubits y superposición.",
      timeLimit: 30,
      maxAttempts: 2,
      passingScore: 70.0,
      published: true,
      moduleId: module1.id,
      authorId: professor.id,
    },
  });

  // === 9. Crear PREGUNTAS ===
  await prisma.question.createMany({
    data: [
      {
        examId: exam.id,
        type: "MULTIPLE_CHOICE",
        text: "¿Cuál es la puerta que crea superposición?",
        options: JSON.stringify(["H", "X", "CNOT"]),
        correct: JSON.stringify(["H"]),
        points: 2.0,
        order: 1,
      },
      {
        examId: exam.id,
        type: "SHORT_ANSWER",
        text: "Escribe el símbolo del estado |+>",
        correct: JSON.stringify("|+>"),
        points: 1.5,
        order: 2,
      },
      {
        examId: exam.id,
        type: "ESSAY",
        text: "Explica con tus palabras qué es un qubit.",
        correct: JSON.stringify(""),
        points: 3.0,
        order: 3,
      },
      {
        examId: exam.id,
        type: "QUANTUM_SIMULATION",
        text: "Construye un circuito que genere |+> en el qubit 0.",
        correct: JSON.stringify({
          qubits: 1,
          gates: [{ type: "H", qubit: 0 }],
        }),
        points: 3.5,
        order: 4,
      },
    ],
  });

  // === 10. Inscribir ESTUDIANTE ===
  await prisma.enrollment.create({
    data: {
      studentId: student.id,
      courseId: course.id,
      progress: 50.0,
    },
  });

  // === 11. Crear INTENTO DE EXAMEN ===
  await prisma.examAttempt.create({
    data: {
      studentId: student.id,
      examId: exam.id,
      answers: JSON.stringify({
        1: ["H"],
        2: "|+>",
        3: "Un qubit es como un bit pero puede estar en 0 y 1 al mismo tiempo.",
        4: { qubits: 1, gates: [{ type: "H", qubit: 0 }] },
      }),
      status: "SUBMITTED",
    },
  });

  console.log("\n✅ Seed de contenido académico completado.");
  console.log("   🧑‍🏫 Profesor: profesor@quantumtec.com / prof123");
  console.log("   🎓 Estudiante: estudiante@quantumtec.com / est123");
  console.log("   👑 Admin: admin@quantumtec.com / admin123");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
