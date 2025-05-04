require("dotenv").config();
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No se proporcionó token de autenticación" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "No tienes permisos de administrador" });
  }
  next();
};

const collaboratorMiddleware = (req, res, next) => {
  if (req.user.role !== "ADMIN" && req.user.role !== "COLLABORATOR") {
    return res.status(403).json({ message: "No tienes permisos suficientes" });
  }
  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  collaboratorMiddleware
};
