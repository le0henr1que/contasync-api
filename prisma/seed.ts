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
  console.log('🌱 Starting database seed...\n');

  // Clear existing plans (only if table exists)
  try {
    console.log('🗑️  Clearing existing plans...');
    await prisma.plan.deleteMany({});
  } catch (error) {
    console.log('ℹ️  No existing plans to clear (fresh database)');
  }

  console.log('📦 Creating plans...\n');

  // ==========================================
  // INDIVIDUAL PLANS
  // ==========================================

  const freeTrial = await prisma.plan.create({
    data: {
      name: 'Free Trial',
      slug: 'individual-free-trial',
      description: 'Experimente gratuitamente por 14 dias',
      tenantType: TenantType.INDIVIDUAL,
      priceMonthly: 0,
      priceYearly: 0,
      isActive: true,
      sortOrder: 1,
      featuresJson: {
        payments: true,
        expenses: true,
        documents: true,
        reports: true,
        support: 'email',
        trialDays: 14,
      },
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

  const starterIndividual = await prisma.plan.create({
    data: {
      name: 'Starter',
      slug: 'individual-starter',
      description: 'Ideal para freelancers e MEIs',
      tenantType: TenantType.INDIVIDUAL,
      priceMonthly: 29.9,
      priceYearly: 299, // ~20% discount
      isActive: true,
      sortOrder: 2,
      featuresJson: {
        payments: true,
        expenses: true,
        documents: true,
        reports: true,
        support: 'email',
        customization: false,
      },
      limitsJson: {
        maxPayments: 50,
        maxExpenses: 50,
        maxDocuments: 20,
        storageGB: 0.5, // 500 MB
      },
      stripePriceIdMonthly: process.env.STARTER_INDIVIDUAL_MONTHLY || null,
      stripePriceIdYearly: process.env.STARTER_INDIVIDUAL_YEARLY || null,
      stripeProductId: null,
    },
  });

  const professionalIndividual = await prisma.plan.create({
    data: {
      name: 'Professional',
      slug: 'individual-professional',
      description: 'Para profissionais autônomos avançados',
      tenantType: TenantType.INDIVIDUAL,
      priceMonthly: 59.9,
      priceYearly: 599, // ~20% discount
      isActive: true,
      sortOrder: 3,
      featuresJson: {
        payments: true,
        expenses: true,
        documents: true,
        reports: true,
        advancedReports: true,
        support: 'priority',
        customization: true,
        apiAccess: false,
      },
      limitsJson: {
        maxPayments: -1, // unlimited
        maxExpenses: -1,
        maxDocuments: -1,
        storageGB: 2,
      },
      stripePriceIdMonthly: process.env.PROFESSIONAL_INDIVIDUAL_MONTHLY || null,
      stripePriceIdYearly: process.env.PROFESSIONAL_INDIVIDUAL_YEARLY || null,
      stripeProductId: null,
    },
  });

  const financialModule = await prisma.plan.create({
    data: {
      name: 'Módulo Financeiro',
      slug: 'financial-module',
      description: 'Gestão financeira pessoal completa e ilimitada',
      tenantType: TenantType.INDIVIDUAL,
      priceMonthly: 70,
      priceYearly: 700, // ~17% discount
      isActive: true,
      sortOrder: 4,
      featuresJson: {
        financialManagement: true,
        transactions: true,
        recurringTransactions: true,
        installments: true,
        savingsBox: true,
        investments: true,
        financialGoals: true,
        budgetDistribution: true,
        reports: true,
        advancedReports: true,
        analytics: true,
        support: 'priority',
        customization: true,
        apiAccess: false,
      },
      limitsJson: {
        maxTransactions: -1, // unlimited
        maxRecurring: -1,
        maxInstallments: -1,
        maxSavingsBoxes: -1,
        maxInvestments: -1,
        maxGoals: -1,
        storageGB: 5,
      },
      stripePriceIdMonthly: process.env.FINANCIAL_MODULE_MONTHLY || 'price_1Sl8m5EqSdUW1JZYEk8AX1qY',
      stripePriceIdYearly: process.env.FINANCIAL_MODULE_YEARLY || 'price_1Sl8o7EqSdUW1JZYazxZgCSN',
      stripeProductId: process.env.FINANCIAL_MODULE_PRODUCT_ID || 'prod_TiZW8vu0Mbx0iZ',
    },
  });

  // ==========================================
  // ACCOUNTANT FIRM PLANS
  // ==========================================

  const accountantTrial = await prisma.plan.create({
    data: {
      name: 'Accountant Trial',
      slug: 'firm-trial',
      description: 'Teste grátis para escritórios de contabilidade',
      tenantType: TenantType.ACCOUNTANT_FIRM,
      priceMonthly: 0,
      priceYearly: 0,
      isActive: true,
      sortOrder: 1,
      featuresJson: {
        clientManagement: true,
        multiUser: true,
        payments: true,
        expenses: true,
        documents: true,
        reports: true,
        support: 'email',
        trialDays: 14,
      },
      limitsJson: {
        maxClients: 5,
        maxUsers: 2,
        maxPayments: 20,
        maxExpenses: 20,
        maxDocuments: 10,
        storageGB: 0.2, // 200 MB
      },
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      stripeProductId: null,
    },
  });

  const starterFirm = await prisma.plan.create({
    data: {
      name: 'Starter Firm',
      slug: 'firm-starter',
      description: 'Para pequenos escritórios de contabilidade',
      tenantType: TenantType.ACCOUNTANT_FIRM,
      priceMonthly: 149.9,
      priceYearly: 1499, // ~20% discount
      isActive: true,
      sortOrder: 2,
      featuresJson: {
        clientManagement: true,
        multiUser: true,
        payments: true,
        expenses: true,
        documents: true,
        reports: true,
        support: 'email',
        customization: false,
        apiAccess: false,
      },
      limitsJson: {
        maxClients: 20,
        maxUsers: 5,
        maxPayments: 200,
        maxExpenses: 200,
        maxDocuments: 100,
        storageGB: 2,
      },
      stripePriceIdMonthly: process.env.STARTER_FIRM_MONTHLY || null,
      stripePriceIdYearly: process.env.STARTER_FIRM_YEARLY || null,
      stripeProductId: null,
    },
  });

  const professionalFirm = await prisma.plan.create({
    data: {
      name: 'Professional Firm',
      slug: 'firm-professional',
      description: 'Para escritórios em crescimento',
      tenantType: TenantType.ACCOUNTANT_FIRM,
      priceMonthly: 299.9,
      priceYearly: 2999, // ~20% discount
      isActive: true,
      sortOrder: 3,
      featuresJson: {
        clientManagement: true,
        multiUser: true,
        payments: true,
        expenses: true,
        documents: true,
        reports: true,
        advancedReports: true,
        support: 'priority',
        customization: true,
        apiAccess: false,
        whiteLabel: false,
      },
      limitsJson: {
        maxClients: 100,
        maxUsers: 15,
        maxPayments: -1, // unlimited
        maxExpenses: -1,
        maxDocuments: -1,
        storageGB: 10,
      },
      stripePriceIdMonthly: process.env.PROFESSIONAL_FIRM_MONTHLY || null,
      stripePriceIdYearly: process.env.PROFESSIONAL_FIRM_YEARLY || null,
      stripeProductId: null,
    },
  });

  const enterpriseFirm = await prisma.plan.create({
    data: {
      name: 'Enterprise Firm',
      slug: 'firm-enterprise',
      description: 'Para grandes escritórios de contabilidade',
      tenantType: TenantType.ACCOUNTANT_FIRM,
      priceMonthly: 599.9,
      priceYearly: 5999, // ~20% discount
      isActive: true,
      sortOrder: 4,
      featuresJson: {
        clientManagement: true,
        multiUser: true,
        payments: true,
        expenses: true,
        documents: true,
        reports: true,
        advancedReports: true,
        support: 'dedicated',
        customization: true,
        apiAccess: true,
        whiteLabel: true,
        sla: true,
      },
      limitsJson: {
        maxClients: -1, // unlimited
        maxUsers: -1,
        maxPayments: -1,
        maxExpenses: -1,
        maxDocuments: -1,
        storageGB: -1, // unlimited
      },
      stripePriceIdMonthly: process.env.ENTERPRISE_FIRM_MONTHLY || null,
      stripePriceIdYearly: process.env.ENTERPRISE_FIRM_YEARLY || null,
      stripeProductId: null,
    },
  });

  console.log('✅ Plans created successfully!\n');

  // Print summary
  console.log('📊 Summary:');
  console.log('━'.repeat(80));
  console.log('  INDIVIDUAL PLANS:');
  console.log(`    1. ${freeTrial.name} (${freeTrial.slug})`);
  console.log(`    2. ${starterIndividual.name} (${starterIndividual.slug}) - R$ ${starterIndividual.priceMonthly}/mês`);
  console.log(`    3. ${professionalIndividual.name} (${professionalIndividual.slug}) - R$ ${professionalIndividual.priceMonthly}/mês`);
  console.log(`    4. ${financialModule.name} (${financialModule.slug}) - R$ ${financialModule.priceMonthly}/mês 💰`);
  console.log('');
  console.log('  ACCOUNTANT FIRM PLANS:');
  console.log(`    5. ${accountantTrial.name} (${accountantTrial.slug})`);
  console.log(`    6. ${starterFirm.name} (${starterFirm.slug}) - R$ ${starterFirm.priceMonthly}/mês`);
  console.log(`    7. ${professionalFirm.name} (${professionalFirm.slug}) - R$ ${professionalFirm.priceMonthly}/mês`);
  console.log(`    8. ${enterpriseFirm.name} (${enterpriseFirm.slug}) - R$ ${enterpriseFirm.priceMonthly}/mês`);
  console.log('━'.repeat(80));
  console.log('\n✅ Database seeded successfully!');
  console.log('\n💡 Next step: Run Stripe setup script to configure Stripe Price IDs');
  console.log('   npm run stripe:setup\n');
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
