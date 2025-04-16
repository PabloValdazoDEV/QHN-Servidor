const express = require("express");
const router = express.Router();
// const prisma = require("../prisma/prisma");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
//prueba Dixon Sequera
router.get("/",  (req, res) => {
  try {
    res.json({message: "Mensaje de prueba, Soy Pablo"})
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
