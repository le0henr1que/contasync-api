import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL || 'postgresql://contasync:contasync123@localhost:5432/contasync?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding financial data...\n');

  try {
    // Get existing client (maria.silva@example.com)
    const existingUser = await prisma.user.findFirst({
      where: { email: 'maria.silva@example.com' },
      include: { client: true },
    });

    if (!existingUser || !existingUser.client) {
      console.log('❌ User or client not found. Please run the main seed first.');
      return;
    }

    const clientId = existingUser.client.id;
    console.log(`✅ Found client: ${clientId}`);

    // Check existing data
    const existingRecurring = await prisma.recurringPayment.count({ where: { clientId } });
    const existingInstallments = await prisma.installment.count({ where: { clientId } });

    console.log(`  Current recurring payments: ${existingRecurring}`);
    console.log(`  Current installments: ${existingInstallments}\n`);

    // Skip if already has data
    if (existingRecurring > 0 && existingInstallments > 0) {
      console.log('ℹ️  Data already exists. Skipping seed.');
      return;
    }

    // Add recurring payments
    if (existingRecurring === 0) {
      console.log('💰 Creating recurring payments...');

      const now = new Date();
      const recurringPayments = [
        {
          title: 'Aluguel',
          description: 'Aluguel mensal',
          amount: 1500,
          category: 'HOUSING',
          frequency: 'MONTHLY',
          dayOfMonth: 5,
          startDate: new Date(2024, 0, 1),
          nextDueDate: new Date(now.getFullYear(), now.getMonth(), 5),
        },
        {
          title: 'Internet',
          description: 'Internet fibra',
          amount: 99.90,
          category: 'UTILITIES',
          frequency: 'MONTHLY',
          dayOfMonth: 10,
          startDate: new Date(2024, 0, 1),
          nextDueDate: new Date(now.getFullYear(), now.getMonth(), 10),
        },
        {
          title: 'Academia',
          description: 'Mensalidade academia',
          amount: 89.90,
          category: 'HEALTH',
          frequency: 'MONTHLY',
          dayOfMonth: 15,
          startDate: new Date(2024, 0, 1),
          nextDueDate: new Date(now.getFullYear(), now.getMonth(), 15),
        },
        {
          title: 'Plano de Saúde',
          description: 'Plano individual',
          amount: 450,
          category: 'HEALTH',
          frequency: 'MONTHLY',
          dayOfMonth: 1,
          startDate: new Date(2024, 0, 1),
          nextDueDate: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      ];

      for (const payment of recurringPayments) {
        await prisma.recurringPayment.create({
          data: {
            ...payment,
            clientId,
            isActive: true,
          },
        });
        console.log(`  ✅ ${payment.title} - R$ ${payment.amount}`);
      }
    }

    // Add installments
    if (existingInstallments === 0) {
      console.log('\n📊 Creating installments...');

      // Notebook (12 parcelas)
      const notebook = await prisma.installment.create({
        data: {
          clientId,
          title: 'Notebook Dell',
          description: 'Notebook para trabalho',
          totalAmount: 3600,
          installmentCount: 12,
          installmentAmount: 300,
          category: 'EQUIPMENT',
          firstDueDate: new Date(2024, 11, 15),
          status: 'ACTIVE',
          paidCount: 0,
        },
      });

      for (let i = 1; i <= 12; i++) {
        await prisma.installmentPayment.create({
          data: {
            installmentId: notebook.id,
            installmentNumber: i,
            amount: 300,
            dueDate: new Date(2024, 11 + i - 1, 15),
            status: 'PENDING',
          },
        });
      }
      console.log(`  ✅ Notebook - 12x R$ 300`);

      // Curso (6 parcelas)
      const curso = await prisma.installment.create({
        data: {
          clientId,
          title: 'Curso Online',
          description: 'Curso de programação',
          totalAmount: 1200,
          installmentCount: 6,
          installmentAmount: 200,
          category: 'EDUCATION',
          firstDueDate: new Date(2025, 0, 10),
          status: 'ACTIVE',
          paidCount: 0,
        },
      });

      for (let i = 1; i <= 6; i++) {
        await prisma.installmentPayment.create({
          data: {
            installmentId: curso.id,
            installmentNumber: i,
            amount: 200,
            dueDate: new Date(2025, i - 1, 10),
            status: 'PENDING',
          },
        });
      }
      console.log(`  ✅ Curso - 6x R$ 200`);
    }

    console.log('\n✅ Financial data seeded successfully!\n');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
