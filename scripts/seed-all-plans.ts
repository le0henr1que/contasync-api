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
  console.log('🌱 Populando banco de dados com planos...\n');

  // ==========================================
  // INDIVIDUAL PLANS
  // ==========================================
  console.log('📦 Criando planos individuais...\n');

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
      featuresJson: ['Relatórios financeiros'],
      limitsJson: {
        maxPayments: 10,
        maxExpenses: 10,
        maxDocuments: 5,
        storageGB: 0.1,
      },
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      stripeProductId: null,
    },
  });
  console.log('✅', freeTrial.name);

  const starterIndividual = await prisma.plan.upsert({
    where: { slug: 'individual-starter' },
    update: {},
    create: {
      name: 'Starter',
      slug: 'individual-starter',
      description: 'Ideal para freelancers e MEIs',
      tenantType: TenantType.INDIVIDUAL,
      priceMonthly: 29.9,
      priceYearly: 299,
      isActive: true,
      sortOrder: 2,
      featuresJson: ['Relatórios financeiros'],
      limitsJson: {
        maxPayments: 50,
        maxExpenses: 50,
        maxDocuments: 20,
        storageGB: 0.5,
      },
      stripePriceIdMonthly: process.env.STARTER_INDIVIDUAL_MONTHLY || 'price_1SgbY1EqSdUW1JZYvnrWtwYl',
      stripePriceIdYearly: process.env.STARTER_INDIVIDUAL_YEARLY || 'price_1SgbY2EqSdUW1JZYarmMgEbL',
      stripeProductId: null,
    },
  });
  console.log('✅', starterIndividual.name);

  const professionalIndividual = await prisma.plan.upsert({
    where: { slug: 'individual-professional' },
    update: {},
    create: {
      name: 'Professional',
      slug: 'individual-professional',
      description: 'Para profissionais autônomos avançados',
      tenantType: TenantType.INDIVIDUAL,
      priceMonthly: 59.9,
      priceYearly: 599,
      isActive: true,
      sortOrder: 3,
      featuresJson: ['Relatórios financeiros'],
      limitsJson: {
        maxPayments: -1,
        maxExpenses: -1,
        maxDocuments: -1,
        storageGB: 2,
      },
      stripePriceIdMonthly: process.env.PROFESSIONAL_INDIVIDUAL_MONTHLY || 'price_1SgbZnEqSdUW1JZYYUuJ6BgS',
      stripePriceIdYearly: process.env.PROFESSIONAL_INDIVIDUAL_YEARLY || 'price_1SgbZnEqSdUW1JZY4sYrarIH',
      stripeProductId: null,
    },
  });
  console.log('✅', professionalIndividual.name);

  // ==========================================
  // ACCOUNTANT FIRM PLANS
  // ==========================================
  console.log('\n📦 Criando planos para escritórios...\n');

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
  console.log('✅', accountantTrial.name);

  const starterFirm = await prisma.plan.upsert({
    where: { slug: 'firm-starter' },
    update: {},
    create: {
      name: 'Starter Firm',
      slug: 'firm-starter',
      description: 'Para pequenos escritórios de contabilidade',
      tenantType: TenantType.ACCOUNTANT_FIRM,
      priceMonthly: 149.9,
      priceYearly: 1499,
      isActive: true,
      sortOrder: 2,
      featuresJson: [
        'Relatórios financeiros',
        'Múltiplos usuários',
        'Gestão de clientes',
      ],
      limitsJson: {
        maxUsers: 5,
        maxClients: 20,
        maxPayments: 200,
        maxExpenses: 200,
        maxDocuments: 100,
        storageGB: 2,
      },
      stripePriceIdMonthly: process.env.STARTER_FIRM_MONTHLY || 'price_1SgbbxEqSdUW1JZYSn8lQ2Rk',
      stripePriceIdYearly: process.env.STARTER_FIRM_YEARLY || 'price_1SgbbxEqSdUW1JZYD92UWR3B',
      stripeProductId: null,
    },
  });
  console.log('✅', starterFirm.name);

  const professionalFirm = await prisma.plan.upsert({
    where: { slug: 'firm-professional' },
    update: {},
    create: {
      name: 'Professional Firm',
      slug: 'firm-professional',
      description: 'Para escritórios em crescimento',
      tenantType: TenantType.ACCOUNTANT_FIRM,
      priceMonthly: 299.9,
      priceYearly: 2999,
      isActive: true,
      sortOrder: 3,
      featuresJson: [
        'Relatórios financeiros',
        'Múltiplos usuários',
        'Gestão de clientes',
      ],
      limitsJson: {
        maxUsers: 15,
        maxClients: 100,
        maxPayments: -1,
        maxExpenses: -1,
        maxDocuments: -1,
        storageGB: 10,
      },
      stripePriceIdMonthly: process.env.PROFESSIONAL_FIRM_MONTHLY || 'price_1SgbjHEqSdUW1JZYBqsPN5xU',
      stripePriceIdYearly: process.env.PROFESSIONAL_FIRM_YEARLY || 'price_1SgbjHEqSdUW1JZYo5q2U2LP',
      stripeProductId: null,
    },
  });
  console.log('✅', professionalFirm.name);

  const enterpriseFirm = await prisma.plan.upsert({
    where: { slug: 'firm-enterprise' },
    update: {},
    create: {
      name: 'Enterprise Firm',
      slug: 'firm-enterprise',
      description: 'Para grandes escritórios de contabilidade',
      tenantType: TenantType.ACCOUNTANT_FIRM,
      priceMonthly: 599.9,
      priceYearly: 5999,
      isActive: true,
      sortOrder: 4,
      featuresJson: [
        'Relatórios financeiros',
        'Múltiplos usuários',
        'Gestão de clientes',
        'Acesso à API',
        'SLA true',
      ],
      limitsJson: {
        maxUsers: -1,
        maxClients: -1,
        maxPayments: -1,
        maxExpenses: -1,
        maxDocuments: -1,
        storageGB: -1,
      },
      stripePriceIdMonthly: process.env.ENTERPRISE_FIRM_MONTHLY || 'price_1SgbdbEqSdUW1JZYuczJwlXT',
      stripePriceIdYearly: process.env.ENTERPRISE_FIRM_YEARLY || 'price_1SgbdbEqSdUW1JZYZhNadeOj',
      stripeProductId: null,
    },
  });
  console.log('✅', enterpriseFirm.name);

  console.log('\n✅ Todos os planos foram criados com sucesso!');
  console.log(`\n📊 Total: 7 planos`);
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
