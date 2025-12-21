import 'dotenv/config';
import { PrismaClient, TenantType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding plans...');

  // ============================================
  // INDIVIDUAL PLANS (Para Clientes Finais)
  // ============================================

  const individualFreeTrial = await prisma.plan.upsert({
    where: { slug: 'individual-free-trial' },
    update: {
      stripePriceIdMonthly: process.env.FREE_TRIAL_MONTHLY || null,
    },
    create: {
      name: 'Trial Gratuito',
      slug: 'individual-free-trial',
      description: '14 dias de teste gratuito - Experimente todas as funcionalidades!',
      tenantType: TenantType.INDIVIDUAL,
      priceMonthly: 0,
      priceYearly: 0,
      stripePriceIdMonthly: process.env.FREE_TRIAL_MONTHLY || null,
      limitsJson: {
        maxPayments: 10,
        maxExpenses: 20,
        maxDocuments: 5,
        storageGB: 0.5,
      },
      featuresJson: {
        apiAccess: false,
        prioritySupport: false,
        multiUser: false,
        expenseTracking: true,
        documentStorage: true,
        paymentTracking: true,
        reports: false,
        exportData: false,
      },
      isActive: true,
      sortOrder: 1,
    },
  });
  console.log('✅ Created plan:', individualFreeTrial.name);

  const individualStarter = await prisma.plan.upsert({
    where: { slug: 'individual-starter' },
    update: {
      stripePriceIdMonthly: process.env.STARTER_INDIVIDUAL_MONTHLY || null,
      stripePriceIdYearly: process.env.STARTER_INDIVIDUAL_YEARLY || null,
    },
    create: {
      name: 'Starter',
      slug: 'individual-starter',
      description: 'Ideal para freelancers e pequenos negócios',
      tenantType: TenantType.INDIVIDUAL,
      priceMonthly: 29.9,
      priceYearly: 299.0, // ~10 meses (16% desconto)
      stripePriceIdMonthly: process.env.STARTER_INDIVIDUAL_MONTHLY || null,
      stripePriceIdYearly: process.env.STARTER_INDIVIDUAL_YEARLY || null,
      limitsJson: {
        maxPayments: 50,
        maxExpenses: 100,
        maxDocuments: 20,
        storageGB: 2,
      },
      featuresJson: {
        apiAccess: false,
        prioritySupport: false,
        multiUser: false,
        expenseTracking: true,
        documentStorage: true,
        paymentTracking: true,
        reports: true,
        exportData: true,
      },
      isActive: true,
      sortOrder: 2,
    },
  });
  console.log('✅ Created plan:', individualStarter.name);

  const individualProfessional = await prisma.plan.upsert({
    where: { slug: 'individual-professional' },
    update: {},
    create: {
      name: 'Professional',
      slug: 'individual-professional',
      description: 'Para profissionais que precisam de mais recursos',
      tenantType: TenantType.INDIVIDUAL,
      priceMonthly: 59.9,
      priceYearly: 599.0, // ~10 meses (16% desconto)
      limitsJson: {
        maxPayments: 200,
        maxExpenses: 500,
        maxDocuments: 100,
        storageGB: 10,
      },
      featuresJson: {
        apiAccess: true,
        prioritySupport: true,
        multiUser: false,
        expenseTracking: true,
        documentStorage: true,
        paymentTracking: true,
        reports: true,
        exportData: true,
        customReports: true,
        advancedFilters: true,
      },
      isActive: true,
      sortOrder: 3,
    },
  });
  console.log('✅ Created plan:', individualProfessional.name);

  // ============================================
  // ACCOUNTANT FIRM PLANS (Para Escritórios)
  // ============================================

  const firmFreeTrial = await prisma.plan.upsert({
    where: { slug: 'firm-free-trial' },
    update: {},
    create: {
      name: 'Trial Escritório',
      slug: 'firm-free-trial',
      description: '14 dias de teste gratuito para escritórios de contabilidade',
      tenantType: TenantType.ACCOUNTANT_FIRM,
      priceMonthly: 0,
      priceYearly: 0,
      limitsJson: {
        maxClients: 3,
        maxPayments: 30,
        maxExpenses: 50,
        maxDocuments: 15,
        storageGB: 1,
      },
      featuresJson: {
        apiAccess: false,
        prioritySupport: false,
        multiUser: false,
        clientManagement: true,
        expenseTracking: true,
        documentStorage: true,
        paymentTracking: true,
        reports: true,
        exportData: false,
      },
      isActive: true,
      sortOrder: 1,
    },
  });
  console.log('✅ Created plan:', firmFreeTrial.name);

  const firmStarter = await prisma.plan.upsert({
    where: { slug: 'firm-starter' },
    update: {},
    create: {
      name: 'Firm Starter',
      slug: 'firm-starter',
      description: 'Ideal para escritórios pequenos (até 10 clientes)',
      tenantType: TenantType.ACCOUNTANT_FIRM,
      priceMonthly: 99.9,
      priceYearly: 999.0, // ~10 meses (16% desconto)
      limitsJson: {
        maxClients: 10,
        maxPayments: 500,
        maxExpenses: 1000,
        maxDocuments: 200,
        storageGB: 10,
      },
      featuresJson: {
        apiAccess: false,
        prioritySupport: false,
        multiUser: true,
        maxUsers: 2,
        clientManagement: true,
        expenseTracking: true,
        documentStorage: true,
        paymentTracking: true,
        reports: true,
        exportData: true,
        bulkOperations: true,
      },
      isActive: true,
      sortOrder: 2,
    },
  });
  console.log('✅ Created plan:', firmStarter.name);

  const firmProfessional = await prisma.plan.upsert({
    where: { slug: 'firm-professional' },
    update: {},
    create: {
      name: 'Firm Professional',
      slug: 'firm-professional',
      description: 'Para escritórios médios (até 50 clientes)',
      tenantType: TenantType.ACCOUNTANT_FIRM,
      priceMonthly: 299.9,
      priceYearly: 2999.0, // ~10 meses (16% desconto)
      limitsJson: {
        maxClients: 50,
        maxPayments: 5000,
        maxExpenses: 10000,
        maxDocuments: 2000,
        storageGB: 50,
      },
      featuresJson: {
        apiAccess: true,
        prioritySupport: true,
        multiUser: true,
        maxUsers: 5,
        clientManagement: true,
        expenseTracking: true,
        documentStorage: true,
        paymentTracking: true,
        reports: true,
        exportData: true,
        bulkOperations: true,
        customReports: true,
        advancedFilters: true,
        whitelabel: false,
      },
      isActive: true,
      sortOrder: 3,
    },
  });
  console.log('✅ Created plan:', firmProfessional.name);

  const firmEnterprise = await prisma.plan.upsert({
    where: { slug: 'firm-enterprise' },
    update: {},
    create: {
      name: 'Firm Enterprise',
      slug: 'firm-enterprise',
      description: 'Para grandes escritórios (clientes ilimitados)',
      tenantType: TenantType.ACCOUNTANT_FIRM,
      priceMonthly: 699.9,
      priceYearly: 6999.0, // ~10 meses (16% desconto)
      limitsJson: {
        maxClients: -1, // Ilimitado
        maxPayments: -1, // Ilimitado
        maxExpenses: -1, // Ilimitado
        maxDocuments: -1, // Ilimitado
        storageGB: 200,
      },
      featuresJson: {
        apiAccess: true,
        prioritySupport: true,
        dedicatedSupport: true,
        multiUser: true,
        maxUsers: -1, // Ilimitado
        clientManagement: true,
        expenseTracking: true,
        documentStorage: true,
        paymentTracking: true,
        reports: true,
        exportData: true,
        bulkOperations: true,
        customReports: true,
        advancedFilters: true,
        whitelabel: true,
        customIntegrations: true,
        sla: '99.9%',
      },
      isActive: true,
      sortOrder: 4,
    },
  });
  console.log('✅ Created plan:', firmEnterprise.name);

  console.log('\n✅ All plans seeded successfully!');
  console.log('\n📊 Summary:');
  console.log('  - Individual Plans: 3 (Trial, Starter, Professional)');
  console.log('  - Firm Plans: 4 (Trial, Starter, Professional, Enterprise)');
  console.log('  - Total: 7 plans\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding plans:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
