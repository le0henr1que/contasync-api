import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateStripePrices() {
  console.log('🔄 Atualizando Stripe Price IDs nos planos...\n');

  try {
    // Update Starter (Individual)
    await prisma.plan.update({
      where: { slug: 'individual-starter' },
      data: {
        stripePriceIdMonthly: process.env.STARTER_INDIVIDUAL_MONTHLY,
        stripePriceIdYearly: process.env.STARTER_INDIVIDUAL_YEARLY,
      },
    });
    console.log('✅ Starter (Individual) atualizado');

    // Update Professional (Individual)
    await prisma.plan.update({
      where: { slug: 'individual-professional' },
      data: {
        stripePriceIdMonthly: process.env.PROFESSIONAL_INDIVIDUAL_MONTHLY,
        stripePriceIdYearly: process.env.PROFESSIONAL_INDIVIDUAL_YEARLY,
      },
    });
    console.log('✅ Professional (Individual) atualizado');

    // Update Starter Firm
    await prisma.plan.update({
      where: { slug: 'firm-starter' },
      data: {
        stripePriceIdMonthly: process.env.STARTER_FIRM_MONTHLY,
        stripePriceIdYearly: process.env.STARTER_FIRM_YEARLY,
      },
    });
    console.log('✅ Starter Firm atualizado');

    // Update Professional Firm
    await prisma.plan.update({
      where: { slug: 'firm-professional' },
      data: {
        stripePriceIdMonthly: process.env.PROFESSIONAL_FIRM_MONTHLY,
        stripePriceIdYearly: process.env.PROFESSIONAL_FIRM_YEARLY,
      },
    });
    console.log('✅ Professional Firm atualizado');

    // Update Enterprise Firm
    await prisma.plan.update({
      where: { slug: 'firm-enterprise' },
      data: {
        stripePriceIdMonthly: process.env.ENTERPRISE_FIRM_MONTHLY,
        stripePriceIdYearly: process.env.ENTERPRISE_FIRM_YEARLY,
      },
    });
    console.log('✅ Enterprise Firm atualizado');

    console.log('\n✅ Todos os planos foram atualizados com sucesso!');

    // Verificar os dados atualizados
    console.log('\n📋 Verificando os planos atualizados:\n');
    const plans = await prisma.plan.findMany({
      select: {
        name: true,
        slug: true,
        stripePriceIdMonthly: true,
        stripePriceIdYearly: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    plans.forEach((plan) => {
      console.log(`${plan.name} (${plan.slug})`);
      console.log(`  Monthly: ${plan.stripePriceIdMonthly || 'NULL'}`);
      console.log(`  Yearly:  ${plan.stripePriceIdYearly || 'NULL'}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar planos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateStripePrices()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
