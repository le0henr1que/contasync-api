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
var WebhooksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
const stripe_module_1 = require("../stripe/stripe.module");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
let WebhooksService = WebhooksService_1 = class WebhooksService {
    stripe;
    configService;
    prisma;
    emailService;
    logger = new common_1.Logger(WebhooksService_1.name);
    webhookSecret;
    constructor(stripe, configService, prisma, emailService) {
        this.stripe = stripe;
        this.configService = configService;
        this.prisma = prisma;
        this.emailService = emailService;
        this.webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET') || '';
        if (!this.webhookSecret) {
            this.logger.warn('⚠️  STRIPE_WEBHOOK_SECRET not configured - webhook signature verification disabled');
        }
    }
    constructEvent(rawBody, signature) {
        try {
            return this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
        }
        catch (error) {
            this.logger.error(`❌ Webhook signature verification failed: ${error.message}`);
            throw error;
        }
    }
    async handleWebhook(event) {
        this.logger.log(`📨 Received webhook: ${event.type} (${event.id})`);
        try {
            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutCompleted(event.data.object);
                    break;
                case 'customer.subscription.created':
                    await this.handleSubscriptionCreated(event.data.object);
                    break;
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;
                case 'invoice.paid':
                    await this.handleInvoicePaid(event.data.object);
                    break;
                case 'invoice.payment_failed':
                    await this.handleInvoicePaymentFailed(event.data.object);
                    break;
                case 'customer.updated':
                    await this.handleCustomerUpdated(event.data.object);
                    break;
                case 'payment_method.attached':
                    await this.handlePaymentMethodAttached(event.data.object);
                    break;
                default:
                    this.logger.log(`ℹ️  Unhandled event type: ${event.type}`);
            }
            this.logger.log(`✅ Successfully processed webhook: ${event.type}`);
        }
        catch (error) {
            this.logger.error(`❌ Error processing webhook ${event.type}: ${error.message}`);
            throw error;
        }
    }
    async handleCheckoutCompleted(session) {
        this.logger.log(`Processing checkout.session.completed: ${session.id}`);
        const flow = session.metadata?.flow;
        const stripeSubscriptionId = session.subscription;
        if (!stripeSubscriptionId) {
            this.logger.error(`❌ No subscription ID in checkout session: ${session.id}`);
            return;
        }
        const existingSubscription = await this.prisma.subscription.findUnique({
            where: { stripeSubscriptionId },
        });
        if (existingSubscription) {
            this.logger.log(`⚠️  Subscription ${stripeSubscriptionId} already exists, skipping creation`);
            return;
        }
        const stripeSubscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
        if (flow === 'public_checkout') {
            await this.handlePublicCheckout(session, stripeSubscription);
        }
        else {
            await this.handleAuthenticatedCheckout(session, stripeSubscription);
        }
    }
    async handlePublicCheckout(session, stripeSubscription) {
        this.logger.log(`🆕 Processing PUBLIC checkout for session: ${session.id}`);
        const metadata = session.metadata;
        const email = metadata?.email;
        const name = metadata?.name;
        const passwordHash = metadata?.passwordHash;
        const cpfCnpj = metadata?.cpfCnpj;
        const companyName = metadata?.companyName;
        const crc = metadata?.crc;
        const phone = metadata?.phone;
        const planId = metadata?.planId;
        if (!email || !name || !passwordHash || !cpfCnpj || !companyName || !crc || !planId) {
            this.logger.error(`❌ Missing required metadata in public checkout session: ${session.id}`);
            return;
        }
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            this.logger.error(`❌ User already exists with email: ${email}`);
            return;
        }
        const plan = await this.prisma.plan.findUnique({
            where: { id: planId },
        });
        if (!plan) {
            this.logger.error(`❌ Plan not found: ${planId}`);
            return;
        }
        await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    name,
                    passwordHash,
                    role: 'ACCOUNTANT',
                    isActive: true,
                },
            });
            this.logger.log(`✅ User created: ${user.id} (${user.email})`);
            const subscriptionStatus = stripeSubscription.status === 'trialing' ? 'TRIALING' : 'ACTIVE';
            const accountant = await tx.accountant.create({
                data: {
                    userId: user.id,
                    companyName,
                    cnpj: cpfCnpj,
                    crc,
                    phone: phone || null,
                    stripeCustomerId: stripeSubscription.customer,
                    stripeSubscriptionId: stripeSubscription.id,
                    subscriptionStatus,
                    onboardingCompleted: false,
                },
            });
            this.logger.log(`✅ Accountant created: ${accountant.id}`);
            await tx.subscription.create({
                data: {
                    accountantId: accountant.id,
                    planId,
                    stripeSubscriptionId: stripeSubscription.id,
                    stripeCustomerId: stripeSubscription.customer,
                    status: subscriptionStatus,
                    currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
                    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
                    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
                    canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
                    trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
                },
            });
            this.logger.log(`✅ Subscription created for accountant: ${accountant.id}`);
        });
        this.logger.log(`🎉 Public checkout completed successfully for ${email}`);
        try {
            const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3001');
            await this.emailService.sendWelcomeNewAccount(email, {
                name,
                companyName,
                planName: plan.name,
                loginUrl: `${frontendUrl}/login`,
            });
            this.logger.log(`📧 Welcome email sent to ${email}`);
        }
        catch (error) {
            this.logger.error(`❌ Failed to send welcome email to ${email}: ${error.message}`);
        }
    }
    async handleAuthenticatedCheckout(session, stripeSubscription) {
        this.logger.log(`🔄 Processing AUTHENTICATED checkout for session: ${session.id}`);
        const accountantId = session.metadata?.accountantId;
        const planId = session.metadata?.planId;
        if (!accountantId || !planId) {
            this.logger.error(`❌ Missing accountantId or planId in authenticated checkout: ${session.id}`);
            return;
        }
        const accountant = await this.prisma.accountant.findUnique({
            where: { id: accountantId },
            include: { user: true },
        });
        if (!accountant) {
            this.logger.error(`❌ Accountant not found: ${accountantId}`);
            return;
        }
        const currentPeriodStart = stripeSubscription.current_period_start;
        const currentPeriodEnd = stripeSubscription.current_period_end;
        if (!currentPeriodStart || !currentPeriodEnd) {
            this.logger.error(`❌ Missing period dates in subscription: ${stripeSubscription.id}`);
            return;
        }
        const existingSubscription = await this.prisma.subscription.findUnique({
            where: { accountantId },
        });
        const subscriptionData = {
            planId,
            stripeSubscriptionId: stripeSubscription.id,
            stripeCustomerId: stripeSubscription.customer,
            status: stripeSubscription.status.toUpperCase(),
            currentPeriodStart: new Date(currentPeriodStart * 1000),
            currentPeriodEnd: new Date(currentPeriodEnd * 1000),
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
            trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
        };
        if (existingSubscription) {
            await this.prisma.subscription.update({
                where: { accountantId },
                data: subscriptionData,
            });
            this.logger.log(`✅ Subscription updated for accountant ${accountantId}`);
        }
        else {
            await this.prisma.subscription.create({
                data: {
                    accountantId,
                    ...subscriptionData,
                },
            });
            this.logger.log(`✅ Subscription created for accountant ${accountantId}`);
        }
        const subscriptionStatus = stripeSubscription.status === 'trialing' ? 'TRIALING' : 'ACTIVE';
        await this.prisma.accountant.update({
            where: { id: accountantId },
            data: { subscriptionStatus },
        });
        this.logger.log(`✅ Subscription processed successfully for accountant ${accountantId}`);
    }
    async handleSubscriptionCreated(subscription) {
        this.logger.log(`Processing customer.subscription.created: ${subscription.id}`);
        const accountantId = subscription.metadata?.accountantId;
        const planId = subscription.metadata?.planId;
        if (!accountantId || !planId) {
            this.logger.error(`❌ Missing metadata in subscription: ${subscription.id}`);
            return;
        }
        const currentPeriodStart = subscription.current_period_start;
        const currentPeriodEnd = subscription.current_period_end;
        if (!currentPeriodStart || !currentPeriodEnd) {
            this.logger.error(`❌ Missing period dates in subscription: ${subscription.id}`);
            return;
        }
        const existingByStripeId = await this.prisma.subscription.findUnique({
            where: { stripeSubscriptionId: subscription.id },
        });
        if (existingByStripeId) {
            this.logger.log(`⚠️ Subscription ${subscription.id} already exists, skipping creation`);
            return;
        }
        const existingByAccountantId = await this.prisma.subscription.findUnique({
            where: { accountantId },
        });
        const subscriptionData = {
            planId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer,
            status: subscription.status.toUpperCase(),
            currentPeriodStart: new Date(currentPeriodStart * 1000),
            currentPeriodEnd: new Date(currentPeriodEnd * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        };
        if (existingByAccountantId) {
            await this.prisma.subscription.update({
                where: { accountantId },
                data: subscriptionData,
            });
            this.logger.log(`✅ Subscription updated for accountant ${accountantId} (plan change)`);
        }
        else {
            await this.prisma.subscription.create({
                data: {
                    accountantId,
                    ...subscriptionData,
                },
            });
            this.logger.log(`✅ Subscription ${subscription.id} created for accountant ${accountantId}`);
        }
        const subscriptionStatus = subscription.status === 'trialing' ? 'TRIALING' : 'ACTIVE';
        await this.prisma.accountant.update({
            where: { id: accountantId },
            data: { subscriptionStatus },
        });
        this.logger.log(`✅ Subscription ${subscription.id} processed successfully for accountant ${accountantId}`);
    }
    async handleSubscriptionUpdated(subscription) {
        this.logger.log(`Processing customer.subscription.updated: ${subscription.id}`);
        const existingSubscription = await this.prisma.subscription.findUnique({
            where: { stripeSubscriptionId: subscription.id },
        });
        if (!existingSubscription) {
            this.logger.warn(`⚠️ Subscription ${subscription.id} not found in database, creating new one`);
            const accountantId = subscription.metadata?.accountantId;
            const planId = subscription.metadata?.planId;
            if (!accountantId || !planId) {
                this.logger.error(`❌ Missing metadata in subscription: ${subscription.id}`);
                return;
            }
            await this.prisma.subscription.create({
                data: {
                    accountantId,
                    planId,
                    stripeSubscriptionId: subscription.id,
                    stripeCustomerId: subscription.customer,
                    status: subscription.status.toUpperCase(),
                    currentPeriodStart: new Date(subscription.current_period_start * 1000),
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
                    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
                },
            });
            this.logger.log(`✅ Created subscription ${subscription.id} from update event`);
            return;
        }
        await this.prisma.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: {
                status: subscription.status.toUpperCase(),
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
                trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
            },
        });
        const subscriptionStatus = subscription.status === 'trialing' ? 'TRIALING' :
            subscription.status === 'active' ? 'ACTIVE' :
                subscription.status === 'past_due' ? 'PAST_DUE' :
                    subscription.status === 'canceled' || subscription.status === 'unpaid' ? 'CANCELED' : 'ACTIVE';
        await this.prisma.accountant.update({
            where: { id: existingSubscription.accountantId },
            data: { subscriptionStatus },
        });
        this.logger.log(`✅ Subscription ${subscription.id} updated successfully`);
    }
    async handleSubscriptionDeleted(subscription) {
        this.logger.log(`Processing customer.subscription.deleted: ${subscription.id}`);
        const existingSubscription = await this.prisma.subscription.findUnique({
            where: { stripeSubscriptionId: subscription.id },
        });
        if (!existingSubscription) {
            this.logger.warn(`⚠️ Subscription ${subscription.id} not found in database`);
            return;
        }
        await this.prisma.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: {
                status: 'CANCELED',
                canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : new Date(),
            },
        });
        await this.prisma.accountant.update({
            where: { id: existingSubscription.accountantId },
            data: { subscriptionStatus: 'CANCELED' },
        });
        this.logger.log(`✅ Subscription ${subscription.id} canceled successfully`);
    }
    async handleInvoicePaid(invoice) {
        this.logger.log(`Processing invoice.paid: ${invoice.id}`);
        const invoiceSubscription = invoice.subscription;
        if (!invoiceSubscription) {
            this.logger.log(`ℹ️  Invoice ${invoice.id} has no subscription, skipping`);
            return;
        }
        const subscription = await this.prisma.subscription.findUnique({
            where: { stripeSubscriptionId: invoiceSubscription },
        });
        if (!subscription) {
            this.logger.warn(`⚠️ Subscription ${invoiceSubscription} not found for invoice ${invoice.id}`);
            return;
        }
        const existingInvoice = await this.prisma.invoice.findUnique({
            where: { stripeInvoiceId: invoice.id },
        });
        if (existingInvoice) {
            this.logger.log(`⚠️ Invoice ${invoice.id} already exists, updating status`);
            await this.prisma.invoice.update({
                where: { stripeInvoiceId: invoice.id },
                data: {
                    status: 'PAID',
                    paidAt: invoice.status_transitions?.paid_at
                        ? new Date(invoice.status_transitions.paid_at * 1000)
                        : new Date(),
                },
            });
            return;
        }
        const period = invoice.lines?.data[0]?.period;
        await this.prisma.invoice.create({
            data: {
                subscriptionId: subscription.id,
                stripeInvoiceId: invoice.id,
                invoiceNumber: invoice.number || `INV-${invoice.id}`,
                amount: invoice.amount_paid / 100,
                currency: invoice.currency.toUpperCase(),
                status: 'PAID',
                periodStart: period ? new Date(period.start * 1000) : new Date(),
                periodEnd: period ? new Date(period.end * 1000) : new Date(),
                paidAt: invoice.status_transitions?.paid_at
                    ? new Date(invoice.status_transitions.paid_at * 1000)
                    : new Date(),
                hostedInvoiceUrl: invoice.hosted_invoice_url || null,
                invoicePdfUrl: invoice.invoice_pdf || null,
            },
        });
        if (invoice.lines?.data[0]?.period) {
            const period = invoice.lines.data[0].period;
            await this.prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                    currentPeriodStart: new Date(period.start * 1000),
                    currentPeriodEnd: new Date(period.end * 1000),
                },
            });
        }
        this.logger.log(`✅ Invoice ${invoice.id} processed successfully`);
    }
    async handleInvoicePaymentFailed(invoice) {
        this.logger.log(`Processing invoice.payment_failed: ${invoice.id}`);
        const invoiceSubscription = invoice.subscription;
        if (!invoiceSubscription) {
            this.logger.log(`ℹ️  Invoice ${invoice.id} has no subscription, skipping`);
            return;
        }
        const subscription = await this.prisma.subscription.findUnique({
            where: { stripeSubscriptionId: invoiceSubscription },
        });
        if (!subscription) {
            this.logger.warn(`⚠️ Subscription ${invoiceSubscription} not found for invoice ${invoice.id}`);
            return;
        }
        const existingInvoice = await this.prisma.invoice.findUnique({
            where: { stripeInvoiceId: invoice.id },
        });
        if (existingInvoice) {
            await this.prisma.invoice.update({
                where: { stripeInvoiceId: invoice.id },
                data: { status: 'UNCOLLECTIBLE' },
            });
            this.logger.log(`✅ Updated invoice ${invoice.id} status to UNCOLLECTIBLE`);
        }
        else {
            const period = invoice.lines?.data[0]?.period;
            await this.prisma.invoice.create({
                data: {
                    subscriptionId: subscription.id,
                    stripeInvoiceId: invoice.id,
                    invoiceNumber: invoice.number || `INV-${invoice.id}`,
                    amount: invoice.amount_due / 100,
                    currency: invoice.currency.toUpperCase(),
                    status: 'UNCOLLECTIBLE',
                    periodStart: period ? new Date(period.start * 1000) : new Date(),
                    periodEnd: period ? new Date(period.end * 1000) : new Date(),
                    hostedInvoiceUrl: invoice.hosted_invoice_url || null,
                    invoicePdfUrl: invoice.invoice_pdf || null,
                },
            });
            this.logger.log(`✅ Created invoice ${invoice.id} with UNCOLLECTIBLE status`);
        }
        await this.prisma.accountant.update({
            where: { id: subscription.accountantId },
            data: { subscriptionStatus: 'PAST_DUE' },
        });
        this.logger.log(`⚠️ Payment failed for invoice ${invoice.id}`);
    }
    async handleCustomerUpdated(customer) {
        this.logger.log(`Processing customer.updated: ${customer.id}`);
        const accountant = await this.prisma.accountant.findUnique({
            where: { stripeCustomerId: customer.id },
        });
        if (!accountant) {
            this.logger.warn(`⚠️ Accountant not found for Stripe customer: ${customer.id}`);
            return;
        }
        const updateData = {};
        if (customer.name && customer.name !== accountant.companyName) {
            updateData.companyName = customer.name;
        }
        if (customer.tax_ids && customer.tax_ids.data.length > 0) {
            const taxId = customer.tax_ids.data[0];
            if (taxId.type === 'br_cnpj' && taxId.value !== accountant.cnpj) {
                updateData.cnpj = taxId.value;
            }
        }
        if (Object.keys(updateData).length > 0) {
            await this.prisma.accountant.update({
                where: { id: accountant.id },
                data: updateData,
            });
            this.logger.log(`✅ Accountant ${accountant.id} synced with Stripe customer ${customer.id}`);
        }
        else {
            this.logger.log(`ℹ️  No changes to sync for customer ${customer.id}`);
        }
    }
    async handlePaymentMethodAttached(paymentMethod) {
        this.logger.log(`Processing payment_method.attached: ${paymentMethod.id}`);
        if (!paymentMethod.customer) {
            this.logger.log(`ℹ️  Payment method ${paymentMethod.id} has no customer, skipping`);
            return;
        }
        const accountant = await this.prisma.accountant.findUnique({
            where: { stripeCustomerId: paymentMethod.customer },
        });
        if (!accountant) {
            this.logger.warn(`⚠️ Accountant not found for Stripe customer: ${paymentMethod.customer}`);
            return;
        }
        const paymentMethodInfo = {
            id: paymentMethod.id,
            type: paymentMethod.type,
            card: paymentMethod.card ? {
                brand: paymentMethod.card.brand,
                last4: paymentMethod.card.last4,
                exp_month: paymentMethod.card.exp_month,
                exp_year: paymentMethod.card.exp_year,
            } : null,
        };
        this.logger.log(`✅ Payment method attached to accountant ${accountant.id}: ${JSON.stringify(paymentMethodInfo)}`);
    }
};
exports.WebhooksService = WebhooksService;
exports.WebhooksService = WebhooksService = WebhooksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(stripe_module_1.STRIPE_CLIENT)),
    __metadata("design:paramtypes", [stripe_1.default,
        config_1.ConfigService,
        prisma_service_1.PrismaService,
        email_service_1.EmailService])
], WebhooksService);
//# sourceMappingURL=webhooks.service.js.map