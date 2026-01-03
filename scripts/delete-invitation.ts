import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteInvitation() {
  console.log('🔍 Procurando convites pendentes para leonardoferreira.henrique1210@gmail.com...');

  const deleted = await prisma.invitation.deleteMany({
    where: {
      email: 'leonardoferreira.henrique1210@gmail.com',
      acceptedAt: null
    }
  });

  console.log('✅ Convites pendentes deletados:', deleted.count);
  await prisma.$disconnect();
}

deleteInvitation().catch(console.error);
