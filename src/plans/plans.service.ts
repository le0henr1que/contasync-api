import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantType } from '@prisma/client';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all active plans
   *
   * @param tenantType - Filter by tenant type (INDIVIDUAL or ACCOUNTANT_FIRM)
   * @returns List of active plans ordered by sortOrder (excludes trial plans)
   */
  async findAll(tenantType?: TenantType) {
    const where: any = {
      isActive: true,
      slug: {
        not: {
          contains: 'trial',
        },
      },
    };

    // Filter by tenantType if provided
    if (tenantType) {
      where.tenantType = tenantType;
    }

    const plans = await this.prisma.plan.findMany({
      where,
      orderBy: {
        sortOrder: 'asc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        tenantType: true,
        priceMonthly: true,
        priceYearly: true,
        stripePriceIdMonthly: true,
        stripePriceIdYearly: true,
        stripeProductId: true,
        limitsJson: true,
        featuresJson: true,
        sortOrder: true,
        isActive: true,
      },
    });

    // Transform featuresJson object to array of strings
    return plans.map((plan) => ({
      ...plan,
      featuresJson: this.transformFeaturesToArray(plan.featuresJson),
    }));
  }

  /**
   * Transform features object to array of readable strings
   */
  private transformFeaturesToArray(features: any): string[] {
    if (Array.isArray(features)) {
      return features;
    }

    if (!features || typeof features !== 'object') {
      return [];
    }

    const featureLabels: Record<string, string> = {
      clientManagement: 'Gestão de clientes',
      documentStorage: 'Armazenamento de documentos',
      paymentTracking: 'Rastreamento de pagamentos',
      expenseTracking: 'Rastreamento de despesas',
      reports: 'Relatórios financeiros',
      exportData: 'Exportação de dados',
      multiUser: 'Múltiplos usuários',
      bulkOperations: 'Operações em lote',
      advancedFilters: 'Filtros avançados',
      customReports: 'Relatórios personalizados',
      apiAccess: 'Acesso à API',
      prioritySupport: 'Suporte prioritário',
      dedicatedSupport: 'Suporte dedicado',
      whitelabel: 'White label',
      customIntegrations: 'Integrações personalizadas',
    };

    const result: string[] = [];

    // Handle maxUsers
    if (features.maxUsers) {
      if (features.maxUsers === -1) {
        result.push('Usuários ilimitados');
      } else {
        result.push(`Até ${features.maxUsers} usuários`);
      }
    }

    // Handle SLA
    if (features.sla) {
      result.push(`SLA ${features.sla}`);
    }

    // Add boolean features
    Object.entries(features).forEach(([key, value]) => {
      if (value === true && featureLabels[key]) {
        result.push(featureLabels[key]);
      }
    });

    return result;
  }

  /**
   * Find a single plan by ID
   *
   * @param id - Plan ID
   * @returns Plan details or null
   */
  async findOne(id: string) {
    return this.prisma.plan.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        tenantType: true,
        priceMonthly: true,
        priceYearly: true,
        stripePriceIdMonthly: true,
        stripePriceIdYearly: true,
        stripeProductId: true,
        limitsJson: true,
        featuresJson: true,
        sortOrder: true,
        isActive: true,
      },
    });
  }

  /**
   * Find a plan by slug
   *
   * @param slug - Plan slug
   * @returns Plan details or null
   */
  async findBySlug(slug: string) {
    return this.prisma.plan.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        tenantType: true,
        priceMonthly: true,
        priceYearly: true,
        stripePriceIdMonthly: true,
        stripePriceIdYearly: true,
        stripeProductId: true,
        limitsJson: true,
        featuresJson: true,
        sortOrder: true,
        isActive: true,
      },
    });
  }
}
