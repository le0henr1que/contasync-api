import { PrismaClient, PaymentStatus, PaymentType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://contasync:contasync123@localhost:5432/contasync?schema=public';
const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function updatePaymentStatuses() {
  console.log('🔄 Iniciando atualização de status de pagamentos...');

  // Find all CLIENT payments that are PENDING and don't have a paymentDate
  const paymentsToUpdate = await prisma.payment.findMany({
    where: {
      paymentType: PaymentType.CLIENT,
      status: PaymentStatus.PENDING,
      paymentDate: null,
    },
    include: {
      client: {
        select: {
          companyName: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  console.log(`📊 Encontrados ${paymentsToUpdate.length} pagamentos CLIENT com status PENDING`);

  if (paymentsToUpdate.length === 0) {
    console.log('✅ Nenhum pagamento precisa ser atualizado');
    return;
  }

  // Update each payment to AWAITING_INVOICE
  for (const payment of paymentsToUpdate) {
    console.log(`  📝 Atualizando pagamento: ${payment.title} - Cliente: ${payment.client?.companyName || payment.client?.user.name}`);

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.AWAITING_INVOICE,
      },
    });
  }

  console.log(`✅ ${paymentsToUpdate.length} pagamentos atualizados para AWAITING_INVOICE`);
}

updatePaymentStatuses()
  .catch((e) => {
    console.error('❌ Erro ao atualizar status:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
