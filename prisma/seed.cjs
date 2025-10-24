// prisma/seed.cjs
const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  // 1) Usuario y Organización
  const user = await prisma.user.upsert({
    where: { email: 'demo@unipost.app' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@unipost.app',
    },
  });

  const org = await prisma.organization.upsert({
    where: { name: 'Demo Org' },
    update: {},
    create: {
      name: 'Demo Org',
      plan: 'free',
    },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: { role: 'OWNER' },
    create: {
      userId: user.id,
      organizationId: org.id,
      role: 'OWNER',
    },
  });

  // 2) Post + variantes
  const post = await prisma.post.create({
    data: {
      organizationId: org.id,
      authorId: user.id,
      title: 'Post de prueba inicial',
      body: 'Este es el primer post creado desde el seed.',
      status: 'SCHEDULED',
      variants: {
        create: [
          { network: 'INSTAGRAM', text: 'Posteando desde UniPost 🌟', status: 'QUEUED' },
          { network: 'FACEBOOK', text: 'UniPost te simplifica la vida 📱', status: 'QUEUED' },
        ],
      },
    },
  });

  // 3) Schedule (programación simulada)
  await prisma.schedule.create({
    data: {
      postId: post.id,
      runAt: new Date(Date.now() + 3600000), // una hora más tarde
      timezone: 'America/Santiago',
    },
  });

  console.log('✅ Seed ejecutado correctamente');
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
