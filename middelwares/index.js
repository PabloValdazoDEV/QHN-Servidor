require("dotenv").config();
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  const apiKey = req.header("x-api-key");

  if (apiKey && apiKey === process.env.API_KEY) {
    return next();
  }

  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      return next();
    } catch (err) {
      console.error("Error al verificar token:", err.message);
      return res.status(403).json({ message: "Invalid or expired token" });
    }
  }

  return res.status(401).json({ message: "Unauthorized: Provide a valid JWT or API Key" });
};

module.exports = authMiddleware;
