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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SubscriptionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
const stripe_module_1 = require("../stripe/stripe.module");
const prisma_service_1 = require("../prisma/prisma.service");
let SubscriptionsService = SubscriptionsService_1 = class SubscriptionsService {
    stripe;
    prisma;
    configService;
    logger = new common_1.Logger(SubscriptionsService_1.name);
    appUrl;
    constructor(stripe, prisma, configService) {
        this.stripe = stripe;
        this.prisma = prisma;
        this.configService = configService;
        this.appUrl = this.configService.get('APP_URL') || 'http://localhost:3001';
    }
    async createCheckoutSession(accountantId, createCheckoutDto) {
        const { planId, successUrl, cancelUrl } = createCheckoutDto;
        const interval = createCheckoutDto.interval || 'MONTHLY';
        const plan = await this.prisma.plan.findUnique({
            where: { id: planId },
        });
        if (!plan) {
            throw new common_1.NotFoundException(`Plan with ID ${planId} not found`);
        }
        if (!plan.isActive) {
            throw new common_1.BadRequestException(`Plan ${plan.name} is not active`);
        }
        const priceId = interval === 'MONTHLY' ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly;
        if (!priceId) {
            throw new common_1.BadRequestException(`Stripe não configurado para este plano. ` +
                `O plano "${plan.name}" ainda não tem preços configurados no Stripe. ` +
                `Por favor, configure os price IDs no Stripe Dashboard primeiro ou use o sistema em modo trial.`);
        }
        const customer = await this.getOrCreateCustomer(accountantId);
        this.logger.log(`Creating checkout session for accountant ${accountantId}, plan ${plan.name}, interval ${interval}`);
        const session = await this.stripe.checkout.sessions.create({
            customer: customer.id,
            mode: 'subscription',
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl || `${this.appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${this.appUrl}/billing/cancel`,
            metadata: {
                accountantId,
                planId: plan.id,
                planSlug: plan.slug,
                interval,
            },
            subscription_data: {
                metadata: {
                    accountantId,
                    planId: plan.id,
                    planSlug: plan.slug,
                },
                trial_period_days: plan.slug.includes('trial') ? 14 : undefined,
            },
            allow_promotion_codes: true,
            tax_id_collection: {
                enabled: true,
            },
            billing_address_collection: 'required',
            customer_update: {
                address: 'auto',
                name: 'auto',
            },
        });
        this.logger.log(`Checkout session created: ${session.id}`);
        return { url: session.url };
    }
    async getOrCreateCustomer(accountantId) {
        const accountant = await this.prisma.accountant.findUnique({
            where: { id: accountantId },
            include: { user: true },
        });
        if (!accountant) {
            throw new common_1.NotFoundException(`Accountant with ID ${accountantId} not found`);
        }
        if (accountant.stripeCustomerId) {
            try {
                const customer = await this.stripe.customers.retrieve(accountant.stripeCustomerId);
                if (customer.deleted) {
                    this.logger.warn(`Stripe customer ${accountant.stripeCustomerId} was deleted, creating new one`);
                }
                else {
                    this.logger.log(`Using existing Stripe customer: ${customer.id}`);
                    return customer;
                }
            }
            catch (error) {
                this.logger.warn(`Failed to retrieve Stripe customer ${accountant.stripeCustomerId}: ${error.message}`);
            }
        }
        this.logger.log(`Creating new Stripe customer for accountant ${accountantId}`);
        const customer = await this.stripe.customers.create({
            email: accountant.user.email,
            name: accountant.companyName || accountant.user.name,
            metadata: {
                accountantId: accountant.id,
                userId: accountant.userId,
            },
            tax_id_data: accountant.cnpj ? [
                {
                    type: 'br_cnpj',
                    value: this.sanitizeCNPJ(accountant.cnpj),
                },
            ] : undefined,
        });
        await this.prisma.accountant.update({
            where: { id: accountantId },
            data: { stripeCustomerId: customer.id },
        });
        this.logger.log(`Created Stripe customer: ${customer.id}`);
        return customer;
    }
    async upgradePlan(accountantId, upgradePlanDto) {
        const { newPlanId, interval } = upgradePlanDto;
        const accountant = await this.prisma.accountant.findUnique({
            where: { id: accountantId },
            include: {
                subscription: true,
            },
        });
        if (!accountant) {
            throw new common_1.NotFoundException(`Accountant with ID ${accountantId} not found`);
        }
        if (!accountant.stripeSubscriptionId) {
            throw new common_1.BadRequestException('No active subscription found. Please subscribe to a plan first.');
        }
        const newPlan = await this.prisma.plan.findUnique({
            where: { id: newPlanId },
        });
        if (!newPlan) {
            throw new common_1.NotFoundException(`Plan with ID ${newPlanId} not found`);
        }
        if (!newPlan.isActive) {
            throw new common_1.BadRequestException(`Plan ${newPlan.name} is not active`);
        }
        if (newPlan.tenantType !== 'ACCOUNTANT_FIRM') {
            throw new common_1.BadRequestException('Can only upgrade to accountant firm plans');
        }
        const currentSubscription = await this.stripe.subscriptions.retrieve(accountant.stripeSubscriptionId);
        if (!currentSubscription || currentSubscription.status === 'canceled') {
            throw new common_1.BadRequestException('Current subscription is not active');
        }
        const billingInterval = interval || (currentSubscription.items.data[0].price.recurring?.interval === 'month' ? 'MONTHLY' : 'YEARLY');
        const newPriceId = billingInterval === 'MONTHLY' ? newPlan.stripePriceIdMonthly : newPlan.stripePriceIdYearly;
        if (!newPriceId) {
            throw new common_1.BadRequestException(`Price not configured for ${billingInterval} interval on plan ${newPlan.name}`);
        }
        if (accountant.subscription) {
            const currentPlan = await this.prisma.plan.findUnique({
                where: { id: accountant.subscription.planId },
            });
            if (currentPlan && newPlan.sortOrder <= currentPlan.sortOrder) {
                throw new common_1.BadRequestException('You can only upgrade to a higher-tier plan. Use downgrade for lower-tier plans.');
            }
        }
        this.logger.log(`Upgrading accountant ${accountantId} from subscription ${currentSubscription.id} to plan ${newPlan.name}`);
        const updatedSubscription = await this.stripe.subscriptions.update(currentSubscription.id, {
            items: [
                {
                    id: currentSubscription.items.data[0].id,
                    price: newPriceId,
                },
            ],
            proration_behavior: 'always_invoice',
            metadata: {
                accountantId,
                planId: newPlan.id,
                planSlug: newPlan.slug,
            },
        });
        await this.prisma.subscription.update({
            where: { stripeSubscriptionId: currentSubscription.id },
            data: {
                planId: newPlan.id,
                updatedAt: new Date(),
            },
        });
        await this.prisma.accountant.update({
            where: { id: accountantId },
            data: {
                subscriptionPlan: newPlan.slug,
            },
        });
        this.logger.log(`Successfully upgraded subscription ${updatedSubscription.id} to plan ${newPlan.name}`);
        return {
            message: `Successfully upgraded to ${newPlan.name}`,
            subscription: {
                id: updatedSubscription.id,
                planName: newPlan.name,
                planSlug: newPlan.slug,
                status: updatedSubscription.status,
                currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
            },
        };
    }
    async downgradePlan(accountantId, downgradePlanDto) {
        const { newPlanId, interval } = downgradePlanDto;
        const accountant = await this.prisma.accountant.findUnique({
            where: { id: accountantId },
            include: {
                subscription: true,
            },
        });
        if (!accountant) {
            throw new common_1.NotFoundException(`Accountant with ID ${accountantId} not found`);
        }
        if (!accountant.stripeSubscriptionId) {
            throw new common_1.BadRequestException('No active subscription found. Please subscribe to a plan first.');
        }
        const newPlan = await this.prisma.plan.findUnique({
            where: { id: newPlanId },
        });
        if (!newPlan) {
            throw new common_1.NotFoundException(`Plan with ID ${newPlanId} not found`);
        }
        if (!newPlan.isActive) {
            throw new common_1.BadRequestException(`Plan ${newPlan.name} is not active`);
        }
        if (newPlan.tenantType !== 'ACCOUNTANT_FIRM') {
            throw new common_1.BadRequestException('Can only downgrade to accountant firm plans');
        }
        const currentSubscription = await this.stripe.subscriptions.retrieve(accountant.stripeSubscriptionId);
        if (!currentSubscription || currentSubscription.status === 'canceled') {
            throw new common_1.BadRequestException('Current subscription is not active');
        }
        const billingInterval = interval || (currentSubscription.items.data[0].price.recurring?.interval === 'month' ? 'MONTHLY' : 'YEARLY');
        const newPriceId = billingInterval === 'MONTHLY' ? newPlan.stripePriceIdMonthly : newPlan.stripePriceIdYearly;
        if (!newPriceId) {
            throw new common_1.BadRequestException(`Price not configured for ${billingInterval} interval on plan ${newPlan.name}`);
        }
        if (accountant.subscription) {
            const currentPlan = await this.prisma.plan.findUnique({
                where: { id: accountant.subscription.planId },
            });
            if (currentPlan && newPlan.sortOrder >= currentPlan.sortOrder) {
                throw new common_1.BadRequestException('You can only downgrade to a lower-tier plan. Use upgrade for higher-tier plans.');
            }
        }
        this.logger.log(`Scheduling downgrade for accountant ${accountantId} from subscription ${currentSubscription.id} to plan ${newPlan.name}`);
        const updatedSubscription = await this.stripe.subscriptions.update(currentSubscription.id, {
            items: [
                {
                    id: currentSubscription.items.data[0].id,
                    price: newPriceId,
                },
            ],
            proration_behavior: 'none',
            billing_cycle_anchor: 'unchanged',
            metadata: {
                accountantId,
                planId: newPlan.id,
                planSlug: newPlan.slug,
                scheduledDowngrade: 'true',
            },
        });
        await this.prisma.subscription.update({
            where: { stripeSubscriptionId: currentSubscription.id },
            data: {
                updatedAt: new Date(),
            },
        });
        const effectiveDate = new Date(updatedSubscription.current_period_end * 1000);
        this.logger.log(`Scheduled downgrade to ${newPlan.name} for ${effectiveDate.toISOString()}`);
        return {
            message: `Downgrade to ${newPlan.name} scheduled. Will take effect on ${effectiveDate.toLocaleDateString()}`,
            effectiveDate,
        };
    }
    async cancelSubscription(accountantId, cancelDto) {
        const { immediate = false, reason } = cancelDto;
        const accountant = await this.prisma.accountant.findUnique({
            where: { id: accountantId },
            include: {
                subscription: true,
            },
        });
        if (!accountant) {
            throw new common_1.NotFoundException(`Accountant with ID ${accountantId} not found`);
        }
        if (!accountant.stripeSubscriptionId) {
            throw new common_1.BadRequestException('No active subscription found.');
        }
        const currentSubscription = await this.stripe.subscriptions.retrieve(accountant.stripeSubscriptionId);
        if (!currentSubscription || currentSubscription.status === 'canceled') {
            throw new common_1.BadRequestException('Subscription is already canceled');
        }
        this.logger.log(`Canceling subscription ${currentSubscription.id} for accountant ${accountantId}. Immediate: ${immediate}, Reason: ${reason || 'Not provided'}`);
        let canceledSubscription;
        let effectiveDate;
        if (immediate) {
            canceledSubscription = await this.stripe.subscriptions.cancel(currentSubscription.id, {
                invoice_now: false,
                prorate: false,
            });
            effectiveDate = new Date();
            await this.prisma.subscription.update({
                where: { stripeSubscriptionId: currentSubscription.id },
                data: {
                    status: 'CANCELED',
                    canceledAt: effectiveDate,
                    updatedAt: new Date(),
                },
            });
            await this.prisma.accountant.update({
                where: { id: accountantId },
                data: {
                    subscriptionStatus: 'CANCELED',
                },
            });
            this.logger.log(`Subscription ${currentSubscription.id} canceled immediately`);
            return {
                message: 'Subscription canceled immediately. You will lose access to premium features now.',
                effectiveDate,
            };
        }
        else {
            canceledSubscription = await this.stripe.subscriptions.update(currentSubscription.id, {
                cancel_at_period_end: true,
                cancellation_details: {
                    comment: reason,
                },
            });
            effectiveDate = new Date(canceledSubscription.current_period_end * 1000);
            await this.prisma.subscription.update({
                where: { stripeSubscriptionId: currentSubscription.id },
                data: {
                    cancelAtPeriodEnd: true,
                    updatedAt: new Date(),
                },
            });
            this.logger.log(`Subscription ${currentSubscription.id} scheduled for cancellation at ${effectiveDate.toISOString()}`);
            return {
                message: `Subscription will be canceled on ${effectiveDate.toLocaleDateString()}. You will continue to have access until then.`,
                effectiveDate,
            };
        }
    }
    async createPortalSession(accountantId, returnUrl) {
        const accountant = await this.prisma.accountant.findUnique({
            where: { id: accountantId },
        });
        if (!accountant) {
            throw new common_1.NotFoundException(`Accountant with ID ${accountantId} not found`);
        }
        if (!accountant.stripeCustomerId) {
            throw new common_1.BadRequestException('No Stripe customer found. Please subscribe to a plan first.');
        }
        const session = await this.stripe.billingPortal.sessions.create({
            customer: accountant.stripeCustomerId,
            return_url: returnUrl || `${this.appUrl}/billing`,
        });
        return { url: session.url };
    }
    async getSubscription(accountantId) {
        const accountant = await this.prisma.accountant.findUnique({
            where: { id: accountantId },
            include: {
                subscription: {
                    include: {
                        plan: true,
                    },
                },
            },
        });
        if (!accountant) {
            throw new common_1.NotFoundException('Accountant not found');
        }
        if (!accountant.subscription) {
            throw new common_1.NotFoundException('No active subscription found');
        }
        const plan = accountant.subscription.plan;
        const priceField = accountant.subscription.interval === 'YEARLY' ? 'priceYearly' : 'priceMonthly';
        const price = plan[priceField];
        return {
            id: accountant.subscription.id,
            planId: plan.id,
            slug: plan.slug,
            name: plan.name,
            price: typeof price === 'string' ? parseFloat(price) * 100 : price,
            interval: accountant.subscription.interval,
            status: accountant.subscription.status,
            currentPeriodEnd: accountant.subscription.currentPeriodEnd,
            cancelAtPeriodEnd: accountant.subscription.cancelAtPeriodEnd,
            trialEnd: accountant.subscription.trialEnd,
            features: this.transformFeaturesToArray(plan.featuresJson),
        };
    }
    async getUsage(accountantId) {
        const accountant = await this.prisma.accountant.findUnique({
            where: { id: accountantId },
            include: {
                subscription: {
                    include: {
                        plan: true,
                    },
                },
                clients: true,
            },
        });
        if (!accountant) {
            throw new common_1.NotFoundException('Accountant not found');
        }
        if (!accountant.subscription?.plan) {
            throw new common_1.NotFoundException('No active subscription found');
        }
        const limits = accountant.subscription.plan.limitsJson;
        const documentCount = await this.prisma.document.count({
            where: {
                client: {
                    accountantId: accountantId,
                },
            },
        });
        const paymentCount = await this.prisma.payment.count({
            where: {
                client: {
                    accountantId: accountantId,
                },
            },
        });
        const expenseCount = await this.prisma.expense.count({
            where: {
                client: {
                    accountantId: accountantId,
                },
            },
        });
        const documents = await this.prisma.document.findMany({
            where: {
                client: {
                    accountantId: accountantId,
                },
            },
            select: {
                fileSize: true,
            },
        });
        const totalStorageBytes = documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
        const totalStorageGB = totalStorageBytes / (1024 * 1024 * 1024);
        return {
            limits: {
                maxClients: limits.maxClients || 0,
                maxDocuments: limits.maxDocuments || 0,
                maxPayments: limits.maxPayments || 0,
                storageGB: limits.storageGB || 0,
            },
            usage: {
                clientsCount: accountant.clients.length,
                documentsCount: documentCount,
                paymentsCount: paymentCount,
                storageUsedGB: parseFloat(totalStorageGB.toFixed(2)),
            },
            percentages: {
                clients: limits.maxClients === -1 ? 0 : Math.round((accountant.clients.length / limits.maxClients) * 100),
                documents: limits.maxDocuments === -1 ? 0 : Math.round((documentCount / limits.maxDocuments) * 100),
                payments: limits.maxPayments === -1 ? 0 : Math.round((paymentCount / limits.maxPayments) * 100),
                storage: limits.storageGB === -1 ? 0 : Math.round((totalStorageGB / limits.storageGB) * 100),
            },
        };
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
    sanitizeCNPJ(cnpj) {
        return cnpj.replace(/\D/g, '');
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = SubscriptionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(stripe_module_1.STRIPE_CLIENT)),
    __metadata("design:paramtypes", [stripe_1.default,
        prisma_service_1.PrismaService,
        config_1.ConfigService])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map