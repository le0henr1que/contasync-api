"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlansService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PlansService = class PlansService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantType) {
        const where = {
            isActive: true,
            slug: {
                not: {
                    contains: 'trial',
                },
            },
        };
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
        return plans.map((plan) => ({
            ...plan,
            featuresJson: this.transformFeaturesToArray(plan.featuresJson),
        }));
    }
    transformFeaturesToArray(features) {
        if (Array.isArray(features)) {
            return features;
        }
        if (!features || typeof features !== 'object') {
            return [];
        }
        const featureLabels = {
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
        const result = [];
        if (features.maxUsers) {
            if (features.maxUsers === -1) {
                result.push('Usuários ilimitados');
            }
            else {
                result.push(`Até ${features.maxUsers} usuários`);
            }
        }
        if (features.sla) {
            result.push(`SLA ${features.sla}`);
        }
        Object.entries(features).forEach(([key, value]) => {
            if (value === true && featureLabels[key]) {
                result.push(featureLabels[key]);
            }
        });
        return result;
    }
    async findOne(id) {
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
    async findBySlug(slug) {
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
};
exports.PlansService = PlansService;
exports.PlansService = PlansService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PlansService);
//# sourceMappingURL=plans.service.js.map