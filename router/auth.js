const express = require("express");
const router = express.Router();
const prisma = require("../prisma/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { DateTime } = require("luxon");
const authMiddleware = require("../middelwares/authMiddleware");

router.post("/register", async (req, res) => {
  const { email, password, name, role, entity, confirmPassword } = req.body;
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

    if (!password || !confirmPassword || !entity) {
      return res.status(400).json({
        message: "Todos los campos son requeridos para este tipo de usuario",
      });
    }

    if (!passwordRegex.test(passwordClean)) {
      return res.status(400).json({
        message:
          "La contraseña debe tener al menos 7 caracteres, una mayúscula, un número y un carácter especial",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Las contraseñas no coinciden" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "El email ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(passwordClean, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: "COLLABORATOR",
        entity: entity,
        verified: false,
        password: hashedPassword,
      },
    });

    const token = jwt.sign(
      { id: user.id, email, role },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );

    res.json({ message: "User registered successfully", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
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

    if (!user.verified) {
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
    const user = await prisma.user.findUnique({
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

router.post("/newsletter", async (req, res) => {
  const { email, name } = req.body;

  try {
    if (!email || !name) {
      return res.status(400).json({ message: "Email y nombre son requeridos" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "El email ya está registrado" });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: "COLLABORATOR",
        verified: false,
      },
    });

    res.json({ message: "Suscripción a newsletter exitosa" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.put("/users/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { email, name, role, entity, verified } = req.body;

  try {
    // Verificar si el usuario existe
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Verificar si el email ya está en uso por otro usuario
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        return res.status(400).json({ message: "El email ya está en uso" });
      }
    }

    // Actualizar el usuario
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email: email || existingUser.email,
        name: name || existingUser.name,
        role: role || existingUser.role,
        entity: entity || existingUser.entity,
        verified: verified !== undefined ? verified : existingUser.verified,
      },
    });

    res.json({
      message: "Usuario actualizado exitosamente",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Endpoint para obtener todos los usuarios (solo admin)
router.get("/users", authMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({});
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Crear un evento/noticia (colaborador o admin)
router.post("/events", authMiddleware, async (req, res) => {
  try {
    const { title, entity, info, category, ageRange, city, images, comments } =
      req.body;
    if (
      !title ||
      !entity ||
      !info ||
      !category ||
      !ageRange ||
      !city ||
      !images ||
      images.length === 0
    ) {
      return res.status(400).json({
        message:
          "Todos los campos obligatorios deben ser completados y al menos una imagen.",
      });
    }
    const event = await prisma.event.create({
      data: {
        title,
        entity,
        info,
        category,
        ageRange,
        city,
        images,
        comments,
        createdBy: req.user.id,
      },
    });
    res.status(201).json({ message: "Evento creado exitosamente", event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Listar todos los eventos (admin puede ver todos, colaborador solo los suyos)
router.get("/events", authMiddleware, async (req, res) => {
  try {
    let events;

    if (req.user.role === "ADMIN") {
      // Admin ve todos los eventos
      events = await prisma.evento.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          registros: true,
        },
      });
    } else {
      // Colaborador ve solo los que ha creado
      events = await prisma.evento.findMany({
        where: { id_user: req.user.id },
        include: {
          registros: true,
        },
      });
    }

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.put("/users/password/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { newPassword, confirmPassword } = req.body;

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{7,}$/;

  try {
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "Todos los campos son requeridos",
      });
    }

    const passwordClean = newPassword.trim();

    if (!passwordRegex.test(passwordClean)) {
      return res.status(400).json({
        message:
          "La contraseña debe tener al menos 7 caracteres, una mayúscula, un número y un carácter especial",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Las contraseñas no coinciden" });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const hashedPassword = await bcrypt.hash(passwordClean, 10);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });
    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.put("/user/delete/:id", authMiddleware, async (req, res) => {

  console.log(req.body)
  const { id } = req.params;
  const { idNewUser } = req.body;

  if(id === idNewUser){
    return res.status(400).json({ message: "Es el mismo usuario." });
  }

  console.log(id, idNewUser )

  try {
    if (!idNewUser) {
      return res.status(400).json({ message: "Debes proporcionar el ID del nuevo usuario." });
    }

    const newUserExists = await prisma.user.findUnique({
      where: { id: idNewUser },
    });

    if (!newUserExists) {
      return res.status(404).json({ message: "El nuevo usuario no existe." });
    }

    const updateResult = await prisma.evento.updateMany({
      where: { id_user: id },
      data: { id_user: idNewUser },
    });

    console.log(`Eventos reasignados: ${updateResult.count}`);

    await prisma.user.delete({
      where: { id },
    });

    return res.json({ message: "Usuario eliminado y eventos reasignados con éxito." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error interno del servidor", error });
  }
});


module.exports = router;
