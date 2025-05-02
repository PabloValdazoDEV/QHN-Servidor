const express = require("express");
const router = express.Router();
const prisma = require("../prisma/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { DateTime } = require("luxon");
const authMiddleware = require("../middelwares");

router.post("/register", authMiddleware, async (req, res) => {
  const { email, password, name, role } = req.body;
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{7,}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordClean = password.trim();
  const emailClean = email.trim();

  try {
    if (
      !passwordRegex.test(passwordClean) ||
      !emailRegex.test(emailClean) ||
      !password ||
      !email
    ) {
      return res.status(400).json({
        message: "El formato de la contraseñao del email no es valida",
      });
    }

    const hashedPassword = await bcrypt.hash(passwordClean, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });

    const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.json({ message: "User registered successfully", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user === null) {
      return res
        .status(401)
        .json({ message: "Ese correo no esta registrado." });
    }

    if(!user.verified){
      return res
      .status(401)
      .json({ message: "Este correo no esta validado por la organización" });
    }

    const ahora = DateTime.now().setZone("Europe/Madrid");

    const haceDiezMinutos = ahora.minus({ minutes: 10 }).toJSDate();

    const erroresLogin = await prisma.errorLogin.findMany({
      where: {
        user_id: user.id,
        date_try: {
          gte: haceDiezMinutos,
        },
      },
      orderBy: { date_try: "desc" },
    });

    if (erroresLogin.length >= 3) {
      return res.status(401).json({
        message:
          "Ha superado el número máximo de intentos. Intentelo más tarde.",
      });
    }

    if (!user || !(await bcrypt.compare(password.trim(), user.password))) {
      await prisma.errorLogin.create({
        data: {
          user_id: user.id,
          date_try: DateTime.now().setZone("Europe/Madrid").toJSDate(),
        },
      });
      if (erroresLogin.length >= 2) {
        return res.status(401).json({
          message:
            "Ha superado el número máximo de intentos. Intentelo más tarde.",
        });
      }
      return res.status(401).json({
        message:
          "Credenciales invalidas, tienes " +
          (erroresLogin.length == "null" ? 2 : 2 - erroresLogin.length) +
          " intentos.",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );

    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/logout", authMiddleware, (req, res) => {
  res.json({ message: "Logout successful. Remove token on client side." });
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.user.id,
      },
      select: {
        email: true,
        role: true,
        name: true,
        id: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ loggedIn: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving user" });
  }
});

module.exports = router;
