// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: auth.js
// ═══════════════════════════════════════════════════════════════════════════════
const jwt = require("jsonwebtoken");
const prisma = require("../models");

const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Acceso denegado. Token requerido." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado." });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token inválido o expirado." });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "No tienes permisos para esta acción." });
    }
    next();
  };
};

module.exports = { protect, authorize };
