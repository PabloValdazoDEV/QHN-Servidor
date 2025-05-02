const express = require("express");
const router = express.Router();
const prisma = require("../prisma/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middelwares/authMiddleware");
const adminMiddleware = require("../middelwares/adminMiddleware");

// Ruta de registro sin middleware de autenticación
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, role, entity, confirmPassword } = req.body;
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{7,}$/;
    const passwordClean = password ? password.trim() : '';

    // Validación básica
    if (!email || !name) {
      return res.status(400).json({ message: "Email y nombre son requeridos" });
    }

    // Validación para usuarios que requieren contraseña (ADMIN y COLLABORATOR)
    if (role === 'ADMIN' || role === 'COLLABORATOR') {
      if (!password || !confirmPassword || !entity) {
        return res.status(400).json({ message: "Todos los campos son requeridos para este tipo de usuario" });
      }

      if (!regex.test(passwordClean)) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 7 caracteres, una mayúscula, un número y un carácter especial" });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Las contraseñas no coinciden" });
      }
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "El email ya está registrado" });
    }

    const userData = {
      email,
      name,
      role: role || 'NEWSLETTER_USER',
      entity: role === 'ADMIN' || role === 'COLLABORATOR' ? entity : null,
      isActive: true
    };

    // Solo agregar password si es necesario
    if (role === 'ADMIN' || role === 'COLLABORATOR') {
      const hashedPassword = await bcrypt.hash(passwordClean, 10);
      userData.password = hashedPassword;
    }

    const user = await prisma.user.create({
      data: userData
    });

    // Solo generar token si es un usuario con contraseña
    if (role === 'ADMIN' || role === 'COLLABORATOR') {
      const token = jwt.sign({ id: user.id, email, role }, process.env.JWT_SECRET || 'tu_secreto_jwt_muy_seguro', {
        expiresIn: "1h",
      });
      res.json({ message: "Usuario registrado exitosamente", token });
    } else {
      res.json({ message: "Usuario registrado exitosamente" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password.trim(), user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h"
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
        id: req.user.id
      },
      select:{
        email: true,
        role: true,
        name: true, 
        id: true
      }
    })

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
        role: 'NEWSLETTER_USER',
        isActive: true
      }
    });

    res.json({ message: "Suscripción a newsletter exitosa" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.put("/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { email, name, role, entity, isActive } = req.body;

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
        isActive: isActive !== undefined ? isActive : existingUser.isActive
      }
    });

    res.json({ message: "Usuario actualizado exitosamente", user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Endpoint para obtener todos los usuarios (solo admin)
router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        entity: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Crear un evento/noticia (colaborador o admin)
router.post("/events", authMiddleware, async (req, res) => {
  try {
    const { title, entity, info, category, ageRange, city, images, comments } = req.body;
    if (!title || !entity || !info || !category || !ageRange || !city || !images || images.length === 0) {
      return res.status(400).json({ message: "Todos los campos obligatorios deben ser completados y al menos una imagen." });
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
      }
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
    if (req.user.role === 'ADMIN') {
      events = await prisma.event.findMany();
    } else {
      events = await prisma.event.findMany({ where: { createdBy: req.user.id } });
    }
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;

