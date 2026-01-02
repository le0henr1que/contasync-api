import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL || 'postgresql://contasync:contasync123@localhost:5432/contasync?schema=public';
const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting financial data seed...\n');

  // Hash a default password
  const passwordHash = await bcrypt.hash('senha123', 10);

  // 1. Create or find a test user
  console.log('👤 Creating test user...');

  let user = await prisma.user.findUnique({
    where: { email: 'maria.silva@example.com' },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'maria.silva@example.com',
        passwordHash,
        name: 'Maria Silva',
        role: 'CLIENT',
        isActive: true,
      },
    });
    console.log(`✅ User created: ${user.email}`);
  } else {
    console.log(`ℹ️  User already exists: ${user.email}`);
  }

  // 2. Create or find client
  console.log('👥 Creating client...');

  let client = await prisma.client.findFirst({
    where: { userId: user.id },
  });

  if (!client) {
    // Check if CPF already exists
    const existingClient = await prisma.client.findFirst({
      where: { cpfCnpj: '12345678901' },
    });

    if (existingClient) {
      client = existingClient;
      console.log(`ℹ️  Client already exists with CPF: ${client.cpfCnpj}`);
    } else {
      client = await prisma.client.create({
        data: {
          userId: user.id,
          cpfCnpj: '12345678901',
          companyName: null,
          phone: '(11) 98765-4321',
          financialModuleEnabled: true,
          expenseModuleEnabled: false,
        },
      });
      console.log(`✅ Client created for user: ${user.email}`);
    }
  } else {
    console.log(`ℹ️  Client already exists for user: ${user.email}`);
  }

  // Ensure financial module is enabled
  await prisma.client.update({
    where: { id: client.id },
    data: { financialModuleEnabled: true },
  });

  // 3. Create recurring payments (only if they don't exist)
  console.log('\n💰 Creating recurring payments...');

  const existingRecurring = await prisma.recurringPayment.count({
    where: { clientId: client.id },
  });

  if (existingRecurring === 0) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const recurringPayments = [
      {
        clientId: client.id,
        title: 'Aluguel',
        description: 'Aluguel mensal do apartamento',
        amount: 1500,
        category: 'HOUSING',
        frequency: 'MONTHLY',
        dayOfMonth: 5,
        startDate: new Date(2024, 0, 1), // Started in January 2024
        isActive: true,
        nextDueDate: new Date(now.getFullYear(), now.getMonth(), 5),
      },
      {
        clientId: client.id,
        title: 'Internet',
        description: 'Internet fibra 300MB',
        amount: 99.90,
        category: 'UTILITIES',
        frequency: 'MONTHLY',
        dayOfMonth: 10,
        startDate: new Date(2024, 0, 1),
        isActive: true,
        nextDueDate: new Date(now.getFullYear(), now.getMonth(), 10),
      },
      {
        clientId: client.id,
        title: 'Academia',
        description: 'Mensalidade da academia',
        amount: 89.90,
        category: 'HEALTH',
        frequency: 'MONTHLY',
        dayOfMonth: 15,
        startDate: new Date(2024, 0, 1),
        isActive: true,
        nextDueDate: new Date(now.getFullYear(), now.getMonth(), 15),
      },
      {
        clientId: client.id,
        title: 'Netflix',
        description: 'Assinatura Netflix Premium',
        amount: 59.90,
        category: 'SUBSCRIPTION',
        frequency: 'MONTHLY',
        dayOfMonth: 20,
        startDate: new Date(2024, 0, 1),
        isActive: true,
        nextDueDate: new Date(now.getFullYear(), now.getMonth(), 20),
      },
      {
        clientId: client.id,
        title: 'Spotify',
        description: 'Assinatura Spotify Premium',
        amount: 21.90,
        category: 'SUBSCRIPTION',
        frequency: 'MONTHLY',
        dayOfMonth: 25,
        startDate: new Date(2024, 0, 1),
        isActive: true,
        nextDueDate: new Date(now.getFullYear(), now.getMonth(), 25),
      },
      {
        clientId: client.id,
        title: 'Plano de Saúde',
        description: 'Plano de saúde individual',
        amount: 450,
        category: 'HEALTH',
        frequency: 'MONTHLY',
        dayOfMonth: 1,
        startDate: new Date(2024, 0, 1),
        isActive: true,
        nextDueDate: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    ];

    for (const payment of recurringPayments) {
      await prisma.recurringPayment.create({ data: payment });
      console.log(`  ✅ Created: ${payment.title} - R$ ${payment.amount}`);
    }
  } else {
    console.log(`ℹ️  ${existingRecurring} recurring payments already exist. Skipping...`);
  }

  // 4. Create installments (only if they don't exist)
  console.log('\n📊 Creating installments...');

  const existingInstallments = await prisma.installment.count({
    where: { clientId: client.id },
  });

  if (existingInstallments === 0) {
    const now = new Date();

    // Installment 1: Notebook (12 parcelas)
    const installment1 = await prisma.installment.create({
      data: {
        clientId: client.id,
        title: 'Notebook Dell',
        description: 'Compra de notebook para trabalho',
        totalAmount: 3600,
        installmentCount: 12,
        installmentAmount: 300,
        category: 'EQUIPMENT',
        firstDueDate: new Date(2024, 11, 15), // December 15, 2024
        status: 'ACTIVE',
        paidCount: 0,
      },
    });

    // Create 12 installment payments
    for (let i = 1; i <= 12; i++) {
      const dueDate = new Date(2024, 11 + i - 1, 15); // Starting December 2024
      await prisma.installmentPayment.create({
        data: {
          installmentId: installment1.id,
          installmentNumber: i,
          amount: 300,
          dueDate,
          status: 'PENDING',
        },
      });
    }
    console.log(`  ✅ Created: Notebook Dell - 12x R$ 300.00`);

    // Installment 2: Curso Online (6 parcelas)
    const installment2 = await prisma.installment.create({
      data: {
        clientId: client.id,
        title: 'Curso de Programação',
        description: 'Curso online de desenvolvimento web',
        totalAmount: 1200,
        installmentCount: 6,
        installmentAmount: 200,
        category: 'EDUCATION',
        firstDueDate: new Date(2025, 0, 10), // January 10, 2025
        status: 'ACTIVE',
        paidCount: 0,
      },
    });

    // Create 6 installment payments
    for (let i = 1; i <= 6; i++) {
      const dueDate = new Date(2025, i - 1, 10); // Starting January 2025
      await prisma.installmentPayment.create({
        data: {
          installmentId: installment2.id,
          installmentNumber: i,
          amount: 200,
          dueDate,
          status: 'PENDING',
        },
      });
    }
    console.log(`  ✅ Created: Curso de Programação - 6x R$ 200.00`);

    // Installment 3: Móveis (10 parcelas)
    const installment3 = await prisma.installment.create({
      data: {
        clientId: client.id,
        title: 'Sofá',
        description: 'Sofá 3 lugares para sala',
        totalAmount: 2500,
        installmentCount: 10,
        installmentAmount: 250,
        category: 'FURNITURE',
        firstDueDate: new Date(2024, 10, 5), // November 5, 2024
        status: 'ACTIVE',
        paidCount: 0,
      },
    });

    // Create 10 installment payments
    for (let i = 1; i <= 10; i++) {
      const dueDate = new Date(2024, 10 + i - 1, 5); // Starting November 2024
      await prisma.installmentPayment.create({
        data: {
          installmentId: installment3.id,
          installmentNumber: i,
          amount: 250,
          dueDate,
          status: 'PENDING',
        },
      });
    }
    console.log(`  ✅ Created: Sofá - 10x R$ 250.00`);
  } else {
    console.log(`ℹ️  ${existingInstallments} installments already exist. Skipping...`);
  }

  // 5. Summary
  console.log('\n📊 Summary:');
  console.log('━'.repeat(80));

  const totalRecurring = await prisma.recurringPayment.count({
    where: { clientId: client.id, isActive: true },
  });

  const totalInstallments = await prisma.installment.count({
    where: { clientId: client.id, status: 'ACTIVE' },
  });

  console.log(`  User: ${user.email}`);
  console.log(`  Client ID: ${client.id}`);
  console.log(`  Recurring Payments: ${totalRecurring}`);
  console.log(`  Active Installments: ${totalInstallments}`);
  console.log('━'.repeat(80));
  console.log('\n✅ Financial data seeded successfully!');
  console.log('\n💡 Test credentials:');
  console.log('   Email: maria.silva@example.com');
  console.log('   Password: senha123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
