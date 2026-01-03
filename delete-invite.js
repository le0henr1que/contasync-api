const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🔍 Procurando convites pendentes para leonardoferreira.henrique1210@gmail.com...');

  const invites = await prisma.invitation.findMany({
    where: {
      email: 'leonardoferreira.henrique1210@gmail.com',
      acceptedAt: null
    }
  });

  console.log('📧 Convites encontrados:', invites.length);

  if (invites.length > 0) {
    const deleted = await prisma.invitation.deleteMany({
      where: {
        email: 'leonardoferreira.henrique1210@gmail.com',
        acceptedAt: null
      }
    });

    console.log('✅ Convites deletados:', deleted.count);
  } else {
    console.log('ℹ️  Nenhum convite pendente encontrado');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
