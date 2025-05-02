const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');
const prisma = new PrismaClient();

async function main() {
  // Crear un usuario del modelo User (necesario para los eventos)
  const user = await prisma.user.create({
    data: {
      email: faker.internet.email(),
      name: faker.person.fullName(),
      password: faker.internet.password(),
      role: 'COLLABORATOR',
    },
  });

  // Crear usuarios "normales" (modelo Usuario)
  const usuarios = [];
  for (let i = 0; i < 20; i++) {
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
        discapacidad: faker.helpers.arrayElement([
          'Visual',
          'Auditiva',
          'Motora',
          'Intelectual',
          'Ninguna',
        ]),
        interes: faker.helpers.arrayElement([
          'Cultura',
          'Tecnología',
          'Deportes',
          'Viajes',
        ]),
        ubicacion: faker.location.city(),
      },
    });
    usuarios.push(usuario);
  }

  // Función para generar slug
  const generateSlug = (ubicacion, categoria, nombre) => {
    const normalize = (str) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase();

    return `${normalize(ubicacion)}/${normalize(categoria)}/${normalize(nombre)}`;
  };

  // Crear eventos
  const eventos = [];
  for (let i = 0; i < 100; i++) {
    const nombre = faker.lorem.words(4);
    const ubicacion = faker.helpers.arrayElement([
      'Madrid',
      'Malaga',
      'Valencia',
      'Barcelona',
      'Sevilla',
      'Zaragoza',
      'Otro',
    ]);
    const categoria = faker.helpers.arrayElement([
      'Ocio',
      'Viajes',
      'Shopping',
      'Educación',
      'Salud',
      'Estilo de vida',
    ]);
    const slug = generateSlug(ubicacion, categoria, nombre);

    const evento = await prisma.evento.create({
      data: {
        slug,
        id_user: user.id,
        nombre_evento: nombre,
        image: faker.image.url(),
        ubicacion,
        fecha: faker.date.future(),
        categoria,
        discapacidad: faker.helpers.arrayElement([
          'Visual',
          'Auditiva',
          'Motora',
          'Ninguna',
        ]),
        integrantes: faker.number.int({ min: 1, max: 5 }),
        edades: JSON.stringify([faker.number.int({ min: 5, max: 60 })]),
        modalidades: faker.helpers.arrayElement([
          'Presencial',
          'Online',
          'Mixto',
        ]),
        precio: faker.number.int({ min: 0, max: 100 }),
        content: `<h1>${faker.lorem.words(3)}</h1><p>${faker.lorem.paragraph()}</p>`,
        verified: faker.datatype.boolean(),
      },
    });

    eventos.push(evento);
  }

  // Crear registros entre usuarios y eventos
  for (let i = 0; i < 10; i++) {
    const usuario = faker.helpers.arrayElement(usuarios);
    const evento = faker.helpers.arrayElement(eventos);
    await prisma.registro.create({
      data: {
        id_usuario: usuario.id,
        id_evento: evento.id,
        interaccion: faker.datatype.boolean(),
      },
    });
  }

  console.log('✅ Seed completado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
