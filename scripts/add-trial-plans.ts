import { PrismaClient, TenantType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://contasync:contasync123@localhost:5432/contasync?schema=public';
const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Adicionando planos de Trial...\n');

  // Individual Free Trial
  const freeTrial = await prisma.plan.upsert({
    where: { slug: 'individual-free-trial' },
    update: {},
    create: {
      name: 'Free Trial',
      slug: 'individual-free-trial',
      description: 'Experimente gratuitamente por 14 dias',
      tenantType: TenantType.INDIVIDUAL,
      priceMonthly: 0,
      priceYearly: 0,
      isActive: true,
      sortOrder: 1,
      featuresJson: [
        'Relatórios financeiros',
      ],
      limitsJson: {
        maxPayments: 10,
        maxExpenses: 10,
        maxDocuments: 5,
        storageGB: 0.1, // 100 MB
      },
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      stripeProductId: null,
    },
  });
  console.log('✅ Individual Free Trial:', freeTrial.name);

  // Accountant Firm Trial
  const accountantTrial = await prisma.plan.upsert({
    where: { slug: 'firm-trial' },
    update: {},
    create: {
      name: 'Accountant Trial',
      slug: 'firm-trial',
      description: 'Teste grátis por 14 dias',
      tenantType: TenantType.ACCOUNTANT_FIRM,
      priceMonthly: 0,
      priceYearly: 0,
      isActive: true,
      sortOrder: 1,
      featuresJson: [
        'Relatórios financeiros',
        'Múltiplos usuários',
        'Gestão de clientes',
      ],
      limitsJson: {
        maxUsers: 2,
        maxClients: 5,
        maxPayments: 20,
        maxExpenses: 20,
        maxDocuments: 10,
        storageGB: 0.5,
      },
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      stripeProductId: null,
    },
  });
  console.log('✅ Accountant Firm Trial:', accountantTrial.name);

  console.log('\n✅ Planos de Trial criados com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
