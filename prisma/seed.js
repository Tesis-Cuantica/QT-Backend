// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
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
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
