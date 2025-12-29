import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmjqeya9r000375xatjwxspoz';

  console.log('📊 Criando transações de teste...');

  // Criar transações do mês atual
  const now = new Date();

  // Receitas
  await prisma.financialTransaction.createMany({
    data: [
      {
        clientId,
        type: 'INCOME',
        category: 'SALARY',
        amount: 5000,
        description: 'Salário',
        date: new Date(now.getFullYear(), now.getMonth(), 5),
      },
      {
        clientId,
        type: 'INCOME',
        category: 'FREELANCE',
        amount: 1500,
        description: 'Projeto Freelance',
        date: new Date(now.getFullYear(), now.getMonth(), 15),
      },
    ],
  });

  // Despesas
  await prisma.financialTransaction.createMany({
    data: [
      {
        clientId,
        type: 'EXPENSE',
        category: 'FOOD',
        amount: 800,
        description: 'Supermercado',
        date: new Date(now.getFullYear(), now.getMonth(), 10),
      },
      {
        clientId,
        type: 'EXPENSE',
        category: 'HOUSING',
        amount: 1500,
        description: 'Aluguel',
        date: new Date(now.getFullYear(), now.getMonth(), 1),
      },
      {
        clientId,
        type: 'EXPENSE',
        category: 'TRANSPORT',
        amount: 300,
        description: 'Transporte',
        date: new Date(now.getFullYear(), now.getMonth(), 12),
      },
      {
        clientId,
        type: 'EXPENSE',
        category: 'ENTERTAINMENT',
        amount: 200,
        description: 'Cinema e Lazer',
        date: new Date(now.getFullYear(), now.getMonth(), 20),
      },
    ],
  });

  console.log('✅ Transações criadas com sucesso!');

  // Criar pagamentos recorrentes
  await prisma.recurringPayment.createMany({
    data: [
      {
        clientId,
        title: 'Netflix',
        amount: 45.90,
        frequency: 'MONTHLY',
        type: 'EXPENSE',
        category: 'SUBSCRIPTION',
        nextDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
        isActive: true,
      },
      {
        clientId,
        title: 'Academia',
        amount: 120,
        frequency: 'MONTHLY',
        type: 'EXPENSE',
        category: 'HEALTH',
        nextDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 10),
        isActive: true,
      },
    ],
  });

  console.log('✅ Pagamentos recorrentes criados!');

  // Criar meta financeira
  await prisma.financialGoal.create({
    data: {
      clientId,
      title: 'Viagem de Férias',
      targetAmount: 10000,
      currentAmount: 3000,
      targetDate: new Date(now.getFullYear(), 11, 31),
      status: 'ACTIVE',
    },
  });

  console.log('✅ Meta financeira criada!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
