const prisma = require("../prisma/prisma");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { verify } = require("crypto");

const createEvento = async (req, res) => {
  try {
    const {
      nombre_evento,
      image,
      ubicacion,
      fecha,
      categoria,
      discapacidad,
      integrantes,
      edades,
      modalidades,
      precio,
      content,
      slug,
      id_user,
    } = req.body;

    const newEvento = await prisma.evento.create({
      data: {
        nombre_evento,
        image,
        ubicacion,
        fecha: fecha ? new Date(fecha) : null,
        categoria,
        discapacidad,
        integrantes: integrantes ? Number(integrantes) : null,
        edades,
        modalidades,
        precio,
        content,
        slug,
        id_user,
      },
    });

    res.status(200).json({ message: "Evento guardado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creando evento" });
  }
};

const getEventos = async (req, res) => {
  const { page = 1, evento } = req.query;
  const salto = 10 * (page - 1);

  const filter = evento
    ? {
        nombre_evento: {
          contains: evento,
          mode: "insensitive",
        },
      }
    : {};

  try {
    const [eventos, total] = await Promise.all([
      prisma.evento.findMany({
        where: filter,
        include: { user: true },
        orderBy: { createdAt: "desc" },
        skip: salto,
        take: 10,
      }),
      prisma.evento.count({ where: filter }),
    ]);

    res.json({ eventos, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo eventos" });
  }
};

const getEventosCollaborator = async (req, res) => {
  const { id } = req.params;
  const { page = 1, evento } = req.query;
  const salto = 10 * (page - 1);

  const filter = {
    AND: [
      evento
        ? {
            nombre_evento: {
              contains: evento,
              mode: "insensitive",
            },
          }
        : {},
      {
        id_user: id,
      },
    ],
  };

  try {
    const [eventos, total] = await Promise.all([
      prisma.evento.findMany({
        where: filter,
        include: { user: true },
        orderBy: { createdAt: "desc" },
        skip: salto,
        take: 10,
      }),
      prisma.evento.count({ where: filter }),
    ]);

    res.json({ eventos, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo eventos" });
  }
};

const uploadEventoImage = async (req, res) => {
  const file = req.file;
  if (!file)
    return res.status(400).json({ message: "No se subió ninguna imagen" });

  const uploadsDir = path.join(__dirname, "../public/uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `${Date.now()}-${file.originalname.split(".")[0]}.webp`;
  const outputPath = path.join(uploadsDir, filename);

  try {
    await sharp(file.buffer)
      .resize({ width: 1280, height: 720, fit: "inside" })
      .webp({ quality: 75 })
      .toFile(outputPath);

    const url = `${process.env.HOST_API}/uploads/${filename}`;
    res.json({ location: url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error procesando imagen" });
  }
};

const updateEvento = async (req, res) => {
  const { id } = req.params;
  const {
    nombre_evento,
    image,
    ubicacion,
    fecha,
    categoria,
    discapacidad,
    integrantes,
    edades,
    modalidades,
    precio,
    content,
    slug,
  } = req.body;

  try {
    const existing = await prisma.evento.findUnique({
      where: { id: Number(id) },
    });

    if (existing.image && existing.image !== image) {
      const imageUrlPath = new URL(existing.image).pathname;
      const filePath = path.join(__dirname, "../public", imageUrlPath);
      const finalPath = decodeURIComponent(filePath);

      if (fs.existsSync(finalPath)) {
        fs.unlinkSync(finalPath);
      }
    }

    const updated = await prisma.evento.update({
      where: { id: Number(id) },
      data: {
        nombre_evento,
        image,
        ubicacion,
        fecha: fecha ? new Date(fecha) : null,
        categoria,
        discapacidad,
        integrantes: integrantes ? Number(integrantes) : null,
        edades,
        modalidades,
        precio,
        content,
        slug,
      },
    });

    res.json({ message: "Evento actualizado", evento: updated });
  } catch (error) {
    console.error("❌ Error actualizando evento:", error);
    res.status(500).json({ message: "Error actualizando el evento" });
  }
};

const getEventoById = async (req, res) => {
  const { id } = req.params;

  try {
    const evento = await prisma.evento.findUnique({
      where: { id: Number(id) },
    });

    if (!evento) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    res.status(200).json(evento);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener el evento" });
  }
};

const getEventCity = async (req, res) => {
  const { city } = req.params;
  try {
    const data = await prisma.evento.findMany({
      where: {
        ubicacion: {
          contains: city,
          mode: "insensitive",
        },
        verified: true,
      },
    });
    if (!data.length) {
      return res.status(404).json({ message: "No hay eventos en la ciudad" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al obtener los eventos de la ciudad" });
  }
};
const getEventCityCategory = async (req, res) => {
  const { city, category } = req.params;
  const formarCategory =
    category === "educacion" ? "Educación" : category.replaceAll("-", " ");
  try {
    const data = await prisma.evento.findMany({
      where: {
        ubicacion: {
          contains: city,
          mode: "insensitive",
        },
        categoria: {
          contains: formarCategory,
          mode: "insensitive",
        },
        verified: true,
      },
    });
    if (!data.length) {
      return res
        .status(404)
        .json({ message: "No hay eventos con esa categoria en la ciudad" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error al obtener los eventos con esa categoria en la ciudad",
    });
  }
};
const getEventCategory = async (req, res) => {
  const { category } = req.params;
  const formarCategory =
    category === "educacion" ? "Educación" : category.replaceAll("-", " ");
  try {
    const data = await prisma.evento.findMany({
      where: {
        categoria: {
          contains: formarCategory,
          mode: "insensitive",
        },
        verified: true,
      },
    });
    if (!data.length) {
      return res
        .status(404)
        .json({ message: "No hay eventos con esa categoria" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al obtener los eventos con esa categoria" });
  }
};

const getEventSlug = async (req, res) => {
  const { city, category, slug } = req.params;
  const formarCategory =
  category === "educacion" ? "Educación" : category.replaceAll("-", " ");

  try {
    const data = await prisma.evento.findUnique({
      where: {
        slug: `${city}/${category}/${slug}`,
        verified: true,
      },
      include:{
        user: true
      }
    });

    const moreOption = await prisma.evento.findMany({
        where: {
          NOT: {
            id: data.id,
          },
          ubicacion: {
            contains: city,
            mode: "insensitive",
          },
          categoria: {
            contains: formarCategory,
            mode: "insensitive",
          },
          verified: true,
        },
        take: 3,
      });
    if (!data) {
      return res.status(404).json({ message: "No hay evento" });
    }

    res.status(200).json({ post: data, moreOptions: moreOption });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: `Error al obtener el evento con slug ${slug}` });
  }
};

const deleteEvent = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.evento.delete({
      where: {
        id: Number(id),
      },
    });

    res.status(200).json({ message: "Evento borrado" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: `Error al borrar el evento con la ID: ${id}` });
  }
};

const updateEventVerified = async (req, res) => {
  const { id } = req.params;
  const { verified } = req.body;
  try {
    await prisma.evento.update({
      where: {
        id: Number(id),
      },
      data: {
        verified,
      },
    });
    res.status(200).json({ message: "Evento Verificado" });
  } catch (error) {
    res
      .status(500)
      .json({ message: `Error al validar el evento con la ID: ${id}` });
  }
};

const getAllEventUserMore = async (req, res) => {
  const { id } = req.params;
  const { page = 1, evento } = req.query;
  const salto = 10 * (page - 1);

  const filter = {
    evento: {
      nombre_evento: {
        contains: evento,
        mode: "insensitive",
      },
      verified: true
    },
  };

  try {
    const [eventos, total] = await Promise.all([
      prisma.evento.findMany({
        where: filter,
        orderBy: { createdAt: "desc" },
        skip: salto,
        take: 10,
      }),
      prisma.evento.count({ where: filter }),
    ]);

    res.json({ eventos, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo eventos" });
  }
};

const getAllEventUser = async (req, res) => {
    try {
      const response = await prisma.evento.findMany({
        where: {
          verified: true
        },
        take: 9,
        orderBy: {
          createdAt: 'desc'
        }
      });
  
      res.json(response);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error obteniendo eventos" });
    }
  };

const getAllEventUserLast = async (req, res) => {
    try {
      const response = await prisma.evento.findMany({
        where: {
          verified: true
        },
        take: 24,
        orderBy: {
          createdAt: 'desc'
        }
      });
  
      res.json(response);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error obteniendo eventos" });
    }
  };
  

module.exports = {
  createEvento,
  getEventos,
  uploadEventoImage,
  updateEvento,
  getEventoById,
  getEventCity,
  getEventCityCategory,
  getEventCategory,
  getEventSlug,
  deleteEvent,
  updateEventVerified,
  getEventosCollaborator,
  getAllEventUserMore,
  getAllEventUser,
  getAllEventUserLast
};
