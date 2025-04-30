const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');
const prisma = new PrismaClient();

async function main() {
  // Crear usuarios "usuarios normales" (modelo Usuario)
  const usuarios = [];
  for (let i = 0; i < 5; i++) {
    const usuario = await prisma.usuario.create({
      data: {
        email: faker.internet.email(),
        nombre_usuario: faker.person.firstName(),
        edad_usuario: [faker.number.int({ min: 12, max: 60 })],
        edad_familiares: JSON.stringify([
          faker.number.int({ min: 5, max: 70 }),
          faker.number.int({ min: 5, max: 70 }),
        ]),
        integrantes: faker.number.int({ min: 1, max: 6 }),
        discapacidad: faker.helpers.arrayElement(["Visual", "Auditiva", "Motora", "Intelectual", "Ninguna"]),
        interes: faker.helpers.arrayElement(["Cultura", "Tecnología", "Deportes", "Viajes"]),
        ubicacion: faker.location.city()
      }
    });
    usuarios.push(usuario);
  }

  // Crear eventos
  const eventos = [];
  for (let i = 0; i < 5; i++) {
    const evento = await prisma.evento.create({
      data: {
        nombre_evento: faker.lorem.words(4),
        image: faker.image.url(),
        ubicacion: faker.location.city(),
        fecha: faker.date.future(),
        categoria: faker.helpers.arrayElement(["Educación", "Ocio", "Salud", "Arte"]),
        discapacidad: faker.helpers.arrayElement(["Visual", "Auditiva", "Motora", "Ninguna"]),
        integrantes: faker.number.int({ min: 1, max: 5 }),
        edades: JSON.stringify([faker.number.int({ min: 5, max: 60 })]),
        modalidades: faker.helpers.arrayElement(["Presencial", "Online", "Mixto"]),
        precio: faker.number.int({ min: 0, max: 100 }),
        content: `<h1>${faker.lorem.words(3)}</h1><p>${faker.lorem.paragraph()}</p>`,
      }
    });
    eventos.push(evento);
  }

  // Crear registros cruzando usuarios y eventos
  for (let i = 0; i < 10; i++) {
    const usuario = faker.helpers.arrayElement(usuarios);
    const evento = faker.helpers.arrayElement(eventos);
    await prisma.registro.create({
      data: {
        id_usuario: usuario.id,
        id_evento: evento.id,
        interaccion: faker.datatype.boolean(),
      }
    });
  }

  console.log("✅ Seed completado con éxito.");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
