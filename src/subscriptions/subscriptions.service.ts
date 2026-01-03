import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from '../stripe/stripe.module';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly appUrl: string;

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3001';
  }

  /**
   * Create Stripe Checkout Session
   *
   * This creates a checkout session for a user to subscribe to a plan.
   * The user will be redirected to Stripe's hosted checkout page.
   */
  async createCheckoutSession(
    accountantId: string,
    createCheckoutDto: CreateCheckoutDto,
  ): Promise<{ url: string }> {
    const { planId, successUrl, cancelUrl } = createCheckoutDto;
    // Default to MONTHLY if interval not provided
    const interval = createCheckoutDto.interval || 'MONTHLY';

    // 1. Fetch plan from database
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${planId} not found`);
    }

    if (!plan.isActive) {
      throw new BadRequestException(`Plan ${plan.name} is not active`);
    }

    // 2. Get the correct price ID based on interval
    const priceId = interval === 'MONTHLY' ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly;

    if (!priceId) {
      throw new BadRequestException(
        `Stripe não configurado para este plano. ` +
        `O plano "${plan.name}" ainda não tem preços configurados no Stripe. ` +
        `Por favor, configure os price IDs no Stripe Dashboard primeiro ou use o sistema em modo trial.`
      );
    }

    // 3. Get or create Stripe customer
    const customer = await this.getOrCreateCustomer(accountantId);

    this.logger.log(`Creating checkout session for accountant ${accountantId}, plan ${plan.name}, interval ${interval}`);

    // 4. Create Checkout Session
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

      // Metadata to track the subscription
      metadata: {
        accountantId,
        planId: plan.id,
        planSlug: plan.slug,
        interval,
      },

      // Subscription metadata (will be attached to the subscription)
      subscription_data: {
        metadata: {
          accountantId,
          planId: plan.id,
          planSlug: plan.slug,
        },
        trial_period_days: plan.slug.includes('trial') ? 14 : undefined,
      },

      // Allow promotion codes
      allow_promotion_codes: true,

      // Tax ID collection (CPF/CNPJ)
      tax_id_collection: {
        enabled: true,
      },

      // Billing address collection
      billing_address_collection: 'required',

      // Customer email (pre-filled)
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    });

    this.logger.log(`Checkout session created: ${session.id}`);

    return { url: session.url! };
  }

  /**
   * Create Stripe Checkout Session for Individual Client
   *
   * This creates a checkout session for an individual client to subscribe to a plan (e.g., financial module).
   */
  async createClientCheckoutSession(
    clientId: string,
    createCheckoutDto: CreateCheckoutDto,
  ): Promise<{ url: string }> {
    const { planId, successUrl, cancelUrl } = createCheckoutDto;
    const interval = createCheckoutDto.interval || 'MONTHLY';

    // 1. Fetch plan from database
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${planId} not found`);
    }

    if (!plan.isActive) {
      throw new BadRequestException(`Plan ${plan.name} is not active`);
    }

    // 2. Validate plan is for individual clients
    if (plan.tenantType !== 'INDIVIDUAL') {
      throw new BadRequestException('Only individual plans can be used for client subscriptions');
    }

    // 3. Get the correct price ID based on interval
    const priceId = interval === 'MONTHLY' ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly;

    if (!priceId) {
      throw new BadRequestException(
        `Stripe não configurado para este plano. ` +
        `O plano "${plan.name}" ainda não tem preços configurados no Stripe. ` +
        `Por favor, configure os price IDs no Stripe Dashboard primeiro ou use o sistema em modo trial.`
      );
    }

    // 4. Get or create Stripe customer for client
    const customer = await this.getOrCreateClientCustomer(clientId);

    this.logger.log(`Creating checkout session for client ${clientId}, plan ${plan.name}, interval ${interval}`);

    // 5. Create Checkout Session
    const session = await this.stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${this.appUrl}/client-portal/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${this.appUrl}/client-portal/settings`,

      metadata: {
        clientId,
        planId: plan.id,
        planSlug: plan.slug,
        interval,
        entityType: 'CLIENT',
      },

      subscription_data: {
        metadata: {
          clientId,
          planId: plan.id,
          planSlug: plan.slug,
          entityType: 'CLIENT',
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

    this.logger.log(`Checkout session created for client: ${session.id}`);

    return { url: session.url! };
  }

  /**
   * Get or create Stripe customer for accountant
   */
  private async getOrCreateCustomer(accountantId: string): Promise<Stripe.Customer> {
    // Get accountant from database
    const accountant = await this.prisma.accountant.findUnique({
      where: { id: accountantId },
      include: { user: true },
    });

    if (!accountant) {
      throw new NotFoundException(`Accountant with ID ${accountantId} not found`);
    }

    // Check if customer already exists in Stripe
    if (accountant.stripeCustomerId) {
      try {
        const customer = await this.stripe.customers.retrieve(accountant.stripeCustomerId);

        if (customer.deleted) {
          // Customer was deleted, create a new one
          this.logger.warn(`Stripe customer ${accountant.stripeCustomerId} was deleted, creating new one`);
        } else {
          this.logger.log(`Using existing Stripe customer: ${customer.id}`);
          return customer as Stripe.Customer;
        }
      } catch (error) {
        this.logger.warn(`Failed to retrieve Stripe customer ${accountant.stripeCustomerId}: ${error.message}`);
        // Continue to create new customer
      }
    }

    // Create new Stripe customer
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

    // Save customer ID to database
    await this.prisma.accountant.update({
      where: { id: accountantId },
      data: { stripeCustomerId: customer.id },
    });

    this.logger.log(`Created Stripe customer: ${customer.id}`);

    return customer;
  }

  /**
   * Get or create Stripe customer for individual client
   */
  private async getOrCreateClientCustomer(clientId: string): Promise<Stripe.Customer> {
    // Get client from database
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { user: true },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    // Check if customer already exists in Stripe
    if (client.stripeCustomerId) {
      try {
        const customer = await this.stripe.customers.retrieve(client.stripeCustomerId);

        if (customer.deleted) {
          this.logger.warn(`Stripe customer ${client.stripeCustomerId} was deleted, creating new one`);
        } else {
          this.logger.log(`Using existing Stripe customer: ${customer.id}`);
          return customer as Stripe.Customer;
        }
      } catch (error) {
        this.logger.warn(`Failed to retrieve Stripe customer ${client.stripeCustomerId}: ${error.message}`);
        // Continue to create new customer
      }
    }

    // Create new Stripe customer
    this.logger.log(`Creating new Stripe customer for client ${clientId}`);

    const customer = await this.stripe.customers.create({
      email: client.user.email,
      name: client.user.name,
      metadata: {
        clientId: client.id,
        userId: client.userId,
      },
      tax_id_data: client.cpfCnpj ? [
        {
          type: client.cpfCnpj.length > 11 ? 'br_cnpj' : 'br_cpf',
          value: this.sanitizeCPFCNPJ(client.cpfCnpj),
        },
      ] : undefined,
    });

    // Save customer ID to database
    await this.prisma.client.update({
      where: { id: clientId },
      data: { stripeCustomerId: customer.id },
    });

    this.logger.log(`Created Stripe customer: ${customer.id}`);

    return customer;
  }

  /**
   * Upgrade Plan
   *
   * Upgrades the accountant's subscription to a new plan.
   * The upgrade is immediate (pro-rated billing).
   */
  async upgradePlan(
    accountantId: string,
    upgradePlanDto: UpgradePlanDto,
  ): Promise<{ message: string; subscription: any }> {
    const { newPlanId, interval } = upgradePlanDto;

    // 1. Get accountant with current subscription
    const accountant = await this.prisma.accountant.findUnique({
      where: { id: accountantId },
      include: {
        subscription: true,
      },
    });

    if (!accountant) {
      throw new NotFoundException(`Accountant with ID ${accountantId} not found`);
    }

    if (!accountant.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription found. Please subscribe to a plan first.');
    }

    // 2. Get new plan from database
    const newPlan = await this.prisma.plan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan) {
      throw new NotFoundException(`Plan with ID ${newPlanId} not found`);
    }

    if (!newPlan.isActive) {
      throw new BadRequestException(`Plan ${newPlan.name} is not active`);
    }

    // 3. Check if it's the same tenant type
    if (newPlan.tenantType !== 'ACCOUNTANT_FIRM') {
      throw new BadRequestException('Can only upgrade to accountant firm plans');
    }

    // 4. Get current subscription from Stripe
    const currentSubscription = await this.stripe.subscriptions.retrieve(accountant.stripeSubscriptionId);

    if (!currentSubscription || currentSubscription.status === 'canceled') {
      throw new BadRequestException('Current subscription is not active');
    }

    // 5. Determine billing interval
    const billingInterval = interval || (currentSubscription.items.data[0].price.recurring?.interval === 'month' ? 'MONTHLY' : 'YEARLY');

    // 6. Get the correct price ID for the new plan
    const newPriceId = billingInterval === 'MONTHLY' ? newPlan.stripePriceIdMonthly : newPlan.stripePriceIdYearly;

    if (!newPriceId) {
      throw new BadRequestException(`Price not configured for ${billingInterval} interval on plan ${newPlan.name}`);
    }

    // 7. Check if it's actually an upgrade (comparing sortOrder)
    if (accountant.subscription) {
      const currentPlan = await this.prisma.plan.findUnique({
        where: { id: accountant.subscription.planId },
      });

      if (currentPlan && newPlan.sortOrder <= currentPlan.sortOrder) {
        throw new BadRequestException('You can only upgrade to a higher-tier plan. Use downgrade for lower-tier plans.');
      }
    }

    this.logger.log(`Upgrading accountant ${accountantId} from subscription ${currentSubscription.id} to plan ${newPlan.name}`);

    // 8. Update subscription in Stripe
    const updatedSubscription = await this.stripe.subscriptions.update(currentSubscription.id, {
      items: [
        {
          id: currentSubscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'always_invoice', // Pro-rate and invoice immediately
      metadata: {
        accountantId,
        planId: newPlan.id,
        planSlug: newPlan.slug,
      },
    });

    // 9. Update subscription in database
    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: currentSubscription.id },
      data: {
        planId: newPlan.id,
        updatedAt: new Date(),
      },
    });

    // 10. Update accountant's plan
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
        currentPeriodEnd: new Date((updatedSubscription as any).current_period_end * 1000),
      },
    };
  }

  /**
   * Downgrade Plan
   *
   * Downgrades the accountant's subscription to a lower-tier plan.
   * The downgrade takes effect at the end of the current billing period.
   */
  async downgradePlan(
    accountantId: string,
    downgradePlanDto: UpgradePlanDto, // Reusing the same DTO
  ): Promise<{ message: string; effectiveDate: Date }> {
    const { newPlanId, interval } = downgradePlanDto;

    // 1. Get accountant with current subscription
    const accountant = await this.prisma.accountant.findUnique({
      where: { id: accountantId },
      include: {
        subscription: true,
      },
    });

    if (!accountant) {
      throw new NotFoundException(`Accountant with ID ${accountantId} not found`);
    }

    if (!accountant.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription found. Please subscribe to a plan first.');
    }

    // 2. Get new plan from database
    const newPlan = await this.prisma.plan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan) {
      throw new NotFoundException(`Plan with ID ${newPlanId} not found`);
    }

    if (!newPlan.isActive) {
      throw new BadRequestException(`Plan ${newPlan.name} is not active`);
    }

    // 3. Check if it's the same tenant type
    if (newPlan.tenantType !== 'ACCOUNTANT_FIRM') {
      throw new BadRequestException('Can only downgrade to accountant firm plans');
    }

    // 4. Get current subscription from Stripe
    const currentSubscription = await this.stripe.subscriptions.retrieve(accountant.stripeSubscriptionId);

    if (!currentSubscription || currentSubscription.status === 'canceled') {
      throw new BadRequestException('Current subscription is not active');
    }

    // 5. Determine billing interval
    const billingInterval = interval || (currentSubscription.items.data[0].price.recurring?.interval === 'month' ? 'MONTHLY' : 'YEARLY');

    // 6. Get the correct price ID for the new plan
    const newPriceId = billingInterval === 'MONTHLY' ? newPlan.stripePriceIdMonthly : newPlan.stripePriceIdYearly;

    if (!newPriceId) {
      throw new BadRequestException(`Price not configured for ${billingInterval} interval on plan ${newPlan.name}`);
    }

    // 7. Check if it's actually a downgrade (comparing sortOrder)
    if (accountant.subscription) {
      const currentPlan = await this.prisma.plan.findUnique({
        where: { id: accountant.subscription.planId },
      });

      if (currentPlan && newPlan.sortOrder >= currentPlan.sortOrder) {
        throw new BadRequestException('You can only downgrade to a lower-tier plan. Use upgrade for higher-tier plans.');
      }
    }

    this.logger.log(`Scheduling downgrade for accountant ${accountantId} from subscription ${currentSubscription.id} to plan ${newPlan.name}`);

    // 8. Schedule subscription downgrade in Stripe (at end of billing period)
    const updatedSubscription = await this.stripe.subscriptions.update(currentSubscription.id, {
      items: [
        {
          id: currentSubscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'none', // No proration for downgrades
      billing_cycle_anchor: 'unchanged', // Keep the same billing cycle
      metadata: {
        accountantId,
        planId: newPlan.id,
        planSlug: newPlan.slug,
        scheduledDowngrade: 'true',
      },
    });

    // 9. Update subscription in database with scheduled plan change
    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: currentSubscription.id },
      data: {
        // Don't update planId yet, it will be updated by webhook when period ends
        updatedAt: new Date(),
      },
    });

    const effectiveDate = new Date((updatedSubscription as any).current_period_end * 1000);

    this.logger.log(`Scheduled downgrade to ${newPlan.name} for ${effectiveDate.toISOString()}`);

    return {
      message: `Downgrade to ${newPlan.name} scheduled. Will take effect on ${effectiveDate.toLocaleDateString()}`,
      effectiveDate,
    };
  }

  /**
   * Cancel Subscription
   *
   * Cancels the accountant's subscription.
   * Can cancel immediately or at the end of the billing period.
   */
  async cancelSubscription(
    accountantId: string,
    cancelDto: CancelSubscriptionDto,
  ): Promise<{ message: string; effectiveDate?: Date }> {
    const { immediate = false, reason } = cancelDto;

    // 1. Get accountant with current subscription
    const accountant = await this.prisma.accountant.findUnique({
      where: { id: accountantId },
      include: {
        subscription: true,
      },
    });

    if (!accountant) {
      throw new NotFoundException(`Accountant with ID ${accountantId} not found`);
    }

    if (!accountant.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription found.');
    }

    // 2. Get current subscription from Stripe
    const currentSubscription = await this.stripe.subscriptions.retrieve(accountant.stripeSubscriptionId);

    if (!currentSubscription || currentSubscription.status === 'canceled') {
      throw new BadRequestException('Subscription is already canceled');
    }

    this.logger.log(
      `Canceling subscription ${currentSubscription.id} for accountant ${accountantId}. Immediate: ${immediate}, Reason: ${reason || 'Not provided'}`,
    );

    let canceledSubscription: Stripe.Subscription;
    let effectiveDate: Date;

    if (immediate) {
      // 3a. Cancel immediately
      canceledSubscription = await this.stripe.subscriptions.cancel(currentSubscription.id, {
        invoice_now: false, // Don't invoice for unused time
        prorate: false, // Don't prorate
      });

      effectiveDate = new Date();

      // Update subscription status in database
      await this.prisma.subscription.update({
        where: { stripeSubscriptionId: currentSubscription.id },
        data: {
          status: 'CANCELED',
          canceledAt: effectiveDate,
          updatedAt: new Date(),
        },
      });

      // Update accountant status
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
    } else {
      // 3b. Cancel at period end
      canceledSubscription = await this.stripe.subscriptions.update(currentSubscription.id, {
        cancel_at_period_end: true,
        cancellation_details: {
          comment: reason,
        },
      });

      effectiveDate = new Date((canceledSubscription as any).current_period_end * 1000);

      // Update subscription with scheduled cancellation
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

  /**
   * Get Stripe Customer Portal Session for accountant
   *
   * This allows customers to manage their subscription, payment methods, and invoices.
   */
  async createPortalSession(accountantId: string, returnUrl?: string): Promise<{ url: string }> {
    const accountant = await this.prisma.accountant.findUnique({
      where: { id: accountantId },
    });

    if (!accountant) {
      throw new NotFoundException(`Accountant with ID ${accountantId} not found`);
    }

    if (!accountant.stripeCustomerId) {
      throw new BadRequestException('No Stripe customer found. Please subscribe to a plan first.');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: accountant.stripeCustomerId,
      return_url: returnUrl || `${this.appUrl}/billing`,
    });

    return { url: session.url };
  }

  /**
   * Get Stripe Customer Portal Session for client
   *
   * This allows clients to manage their subscription, payment methods, and invoices.
   */
  async createClientPortalSession(clientId: string, returnUrl?: string): Promise<{ url: string }> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    if (!client.stripeCustomerId) {
      throw new BadRequestException('No Stripe customer found. Please subscribe to a plan first.');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: client.stripeCustomerId,
      return_url: returnUrl || `${this.appUrl}/client-portal/settings`,
    });

    return { url: session.url };
  }

  /**
   * Get subscription details for accountant
   */
  async getSubscription(accountantId: string) {
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
      throw new NotFoundException('Accountant not found');
    }

    if (!accountant.subscription) {
      throw new NotFoundException('No active subscription found');
    }

    const plan = accountant.subscription.plan;
    const priceField = accountant.subscription.interval === 'YEARLY' ? 'priceYearly' : 'priceMonthly';
    const price = plan[priceField];

    return {
      id: accountant.subscription.id,
      planId: plan.id,
      slug: plan.slug,
      name: plan.name,
      price: typeof price === 'string' ? parseFloat(price) * 100 : price, // Convert to cents if string
      interval: accountant.subscription.interval,
      status: accountant.subscription.status,
      currentPeriodEnd: accountant.subscription.currentPeriodEnd,
      cancelAtPeriodEnd: accountant.subscription.cancelAtPeriodEnd,
      trialEnd: accountant.subscription.trialEnd,
      features: this.transformFeaturesToArray(plan.featuresJson),
    };
  }

  /**
   * Get subscription details for client
   */
  async getClientSubscription(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (!client.subscription) {
      throw new NotFoundException('No active subscription found');
    }

    return {
      id: client.subscription.id,
      interval: client.subscription.interval,
      status: client.subscription.status,
      currentPeriodStart: client.subscription.currentPeriodStart,
      currentPeriodEnd: client.subscription.currentPeriodEnd,
      cancelAtPeriodEnd: client.subscription.cancelAtPeriodEnd,
      trialEnd: client.subscription.trialEnd,
      plan: {
        id: client.subscription.plan.id,
        name: client.subscription.plan.name,
        slug: client.subscription.plan.slug,
        description: client.subscription.plan.description,
        priceMonthly: client.subscription.plan.priceMonthly,
        priceYearly: client.subscription.plan.priceYearly,
        limitsJson: client.subscription.plan.limitsJson,
        featuresJson: client.subscription.plan.featuresJson,
      },
    };
  }

  /**
   * Get current usage against plan limits for accountant
   */
  async getUsage(accountantId: string) {
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
      throw new NotFoundException('Accountant not found');
    }

    if (!accountant.subscription?.plan) {
      throw new NotFoundException('No active subscription found');
    }

    const limits = accountant.subscription.plan.limitsJson as any;

    // Count documents created by this accountant
    const documentCount = await this.prisma.document.count({
      where: {
        client: {
          accountantId: accountantId,
        },
      },
    });

    // Count payments
    const paymentCount = await this.prisma.payment.count({
      where: {
        client: {
          accountantId: accountantId,
        },
      },
    });

    // Count expenses
    const expenseCount = await this.prisma.expense.count({
      where: {
        client: {
          accountantId: accountantId,
        },
      },
    });

    // Get total storage (in bytes) - sum of all document file sizes
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
    const totalStorageGB = totalStorageBytes / (1024 * 1024 * 1024); // Convert to GB

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

  /**
   * Get current usage against plan limits for client
   */
  async getClientUsage(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (!client.subscription?.plan) {
      throw new NotFoundException('No active subscription found');
    }

    const limits = client.subscription.plan.limitsJson as any;

    // Count transactions for this client
    const transactionCount = await this.prisma.financialTransaction.count({
      where: {
        clientId: clientId,
      },
    });

    // Count recurring payments
    const recurringCount = await this.prisma.recurringPayment.count({
      where: {
        clientId: clientId,
      },
    });

    // Count installments
    const installmentCount = await this.prisma.installment.count({
      where: {
        clientId: clientId,
      },
    });

    // Count investments
    const investmentCount = await this.prisma.investment.count({
      where: {
        clientId: clientId,
      },
    });

    // Count financial goals
    const goalsCount = await this.prisma.financialGoal.count({
      where: {
        clientId: clientId,
      },
    });

    return {
      limits: {
        maxTransactions: limits.maxTransactions || 0,
        maxRecurring: limits.maxRecurring || 0,
        maxInstallments: limits.maxInstallments || 0,
        maxInvestments: limits.maxInvestments || 0,
        maxGoals: limits.maxGoals || 0,
        storageGB: limits.storageGB || 0,
      },
      usage: {
        transactionsCount: transactionCount,
        recurringCount: recurringCount,
        installmentsCount: installmentCount,
        investmentsCount: investmentCount,
        goalsCount: goalsCount,
      },
      percentages: {
        transactions: limits.maxTransactions === -1 ? 0 : Math.round((transactionCount / limits.maxTransactions) * 100),
        recurring: limits.maxRecurring === -1 ? 0 : Math.round((recurringCount / limits.maxRecurring) * 100),
        installments: limits.maxInstallments === -1 ? 0 : Math.round((installmentCount / limits.maxInstallments) * 100),
        investments: limits.maxInvestments === -1 ? 0 : Math.round((investmentCount / limits.maxInvestments) * 100),
        goals: limits.maxGoals === -1 ? 0 : Math.round((goalsCount / limits.maxGoals) * 100),
      },
    };
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
   * Sanitize CNPJ by removing all non-numeric characters
   * Stripe requires CNPJ to be numbers only (no dots, slashes, or dashes)
   */
  private sanitizeCNPJ(cnpj: string): string {
    return cnpj.replace(/\D/g, '');
  }

  /**
   * Sanitize CPF/CNPJ by removing all non-numeric characters
   * Stripe requires tax IDs to be numbers only (no dots, slashes, or dashes)
   */
  private sanitizeCPFCNPJ(cpfCnpj: string): string {
    return cpfCnpj.replace(/\D/g, '');
  }
}
