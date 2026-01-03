import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from '../stripe/stripe.module';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { FolderType } from '@prisma/client';

/**
 * WebhooksService - Handles Stripe webhook events
 *
 * Processes all Stripe webhook events and updates database accordingly.
 * All handlers are idempotent to handle webhook retries safely.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly webhookSecret: string;

  // Default folders to create for new clients
  private readonly DEFAULT_FOLDERS = [
    {
      name: 'Notas Fiscais',
      type: FolderType.NOTAS_FISCAIS,
      icon: '🧾',
      color: '#3b82f6',
      description: 'Notas fiscais de entrada e saída',
      isDefault: true,
      sortOrder: 1,
    },
    {
      name: 'Contratos',
      type: FolderType.CONTRATOS,
      icon: '📄',
      color: '#8b5cf6',
      description: 'Contratos e acordos',
      isDefault: true,
      sortOrder: 2,
    },
    {
      name: 'Declarações',
      type: FolderType.DECLARACOES,
      icon: '📋',
      color: '#10b981',
      description: 'Declarações fiscais e contábeis',
      isDefault: true,
      sortOrder: 3,
    },
    {
      name: 'Comprovantes',
      type: FolderType.COMPROVANTES,
      icon: '🧾',
      color: '#f59e0b',
      description: 'Comprovantes de pagamento',
      isDefault: true,
      sortOrder: 4,
    },
    {
      name: 'Balancetes',
      type: FolderType.BALANCETES,
      icon: '📊',
      color: '#06b6d4',
      description: 'Balancetes e demonstrativos contábeis',
      isDefault: true,
      sortOrder: 5,
    },
    {
      name: 'Outros',
      type: FolderType.OUTROS,
      icon: '📁',
      color: '#64748b',
      description: 'Outros documentos diversos',
      isDefault: true,
      sortOrder: 6,
    },
  ];

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    if (!this.webhookSecret) {
      this.logger.warn('⚠️  STRIPE_WEBHOOK_SECRET not configured - webhook signature verification disabled');
    }
  }

  /**
   * Construct and verify Stripe webhook event
   */
  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (error) {
      this.logger.error(`❌ Webhook signature verification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook event
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    this.logger.log(`📨 Received webhook: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.updated':
          await this.handleCustomerUpdated(event.data.object as Stripe.Customer);
          break;

        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
          break;

        default:
          this.logger.log(`ℹ️  Unhandled event type: ${event.type}`);
      }

      this.logger.log(`✅ Successfully processed webhook: ${event.type}`);
    } catch (error) {
      this.logger.error(`❌ Error processing webhook ${event.type}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handler: checkout.session.completed
   * Fired when checkout is successfully completed
   *
   * Supports two flows:
   * 1. Public checkout (flow=public_checkout): Creates User + Accountant + Subscription
   * 2. Authenticated checkout (accountantId exists): Updates existing accountant subscription
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    this.logger.log(`Processing checkout.session.completed: ${session.id}`);

    const flow = session.metadata?.flow;
    const stripeSubscriptionId = session.subscription as string;

    if (!stripeSubscriptionId) {
      this.logger.error(`❌ No subscription ID in checkout session: ${session.id}`);
      return;
    }

    // Check for idempotency - prevent duplicate processing
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
    });

    if (existingSubscription) {
      this.logger.log(`⚠️  Subscription ${stripeSubscriptionId} already exists, skipping creation`);
      return;
    }

    // Retrieve full subscription details from Stripe
    const stripeSubscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);

    if (flow === 'public_checkout') {
      // PUBLIC CHECKOUT FLOW: Create new accountant account from metadata
      await this.handlePublicCheckout(session, stripeSubscription);
    } else if (flow === 'public_client_checkout') {
      // PUBLIC CLIENT CHECKOUT FLOW: Create new individual client account from metadata
      await this.handlePublicClientCheckout(session, stripeSubscription);
    } else {
      // AUTHENTICATED CHECKOUT FLOW: Update existing account
      await this.handleAuthenticatedCheckout(session, stripeSubscription);
    }
  }

  /**
   * Handle public checkout: Create User + Accountant + Subscription from metadata
   */
  private async handlePublicCheckout(
    session: Stripe.Checkout.Session,
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
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

    // Validate required metadata
    if (!email || !name || !passwordHash || !cpfCnpj || !companyName || !crc || !planId) {
      this.logger.error(`❌ Missing required metadata in public checkout session: ${session.id}`);
      return;
    }

    // Check if user already exists (additional safety check)
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      this.logger.error(`❌ User already exists with email: ${email}`);
      return;
    }

    // Fetch plan details for email
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      this.logger.error(`❌ Plan not found: ${planId}`);
      return;
    }

    // Create User + Accountant + Subscription in a transaction
    await this.prisma.$transaction(async (tx) => {
      // 1. Create User
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

      // 2. Create Accountant
      const subscriptionStatus = stripeSubscription.status === 'trialing' ? 'TRIALING' : 'ACTIVE';

      const accountant = await tx.accountant.create({
        data: {
          userId: user.id,
          companyName,
          cnpj: cpfCnpj,
          crc,
          phone: phone || null,
          stripeCustomerId: stripeSubscription.customer as string,
          stripeSubscriptionId: stripeSubscription.id,
          subscriptionStatus,
          onboardingCompleted: false,
        },
      });

      this.logger.log(`✅ Accountant created: ${accountant.id}`);

      // 3. Create Subscription
      await tx.subscription.create({
        data: {
          accountantId: accountant.id,
          planId,
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId: stripeSubscription.customer as string,
          status: subscriptionStatus as any,
          currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
          trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
        },
      });

      this.logger.log(`✅ Subscription created for accountant: ${accountant.id}`);
    });

    this.logger.log(`🎉 Public checkout completed successfully for ${email}`);

    // Send welcome email
    try {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
      await this.emailService.sendWelcomeNewAccount(email, {
        name,
        companyName,
        planName: plan.name,
        loginUrl: `${frontendUrl}/login`,
      });
      this.logger.log(`📧 Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send welcome email to ${email}: ${error.message}`);
      // Don't throw - email failure shouldn't fail the webhook
    }
  }

  /**
   * Handle public client checkout: Create User + Client + Subscription from metadata
   */
  private async handlePublicClientCheckout(
    session: Stripe.Checkout.Session,
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
    this.logger.log(`🆕 Processing PUBLIC CLIENT checkout for session: ${session.id}`);

    const metadata = session.metadata;
    const email = metadata?.email;
    const name = metadata?.name;
    const passwordHash = metadata?.passwordHash;
    const cpf = metadata?.cpf;
    const planId = metadata?.planId;

    // Validate required metadata
    if (!email || !name || !passwordHash || !cpf || !planId) {
      this.logger.error(`❌ Missing required metadata in public client checkout session: ${session.id}`);
      return;
    }

    // Check if user already exists (additional safety check)
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      this.logger.error(`❌ User already exists with email: ${email}`);
      return;
    }

    // Fetch plan details for email
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      this.logger.error(`❌ Plan not found: ${planId}`);
      return;
    }

    // Create User + Client + Subscription in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: 'CLIENT',
          isActive: true,
        },
      });

      this.logger.log(`✅ User created: ${user.id} (${user.email})`);

      // 2. Create Client
      const subscriptionStatus = stripeSubscription.status === 'trialing' ? 'TRIALING' : 'ACTIVE';

      const client = await tx.client.create({
        data: {
          userId: user.id,
          cpfCnpj: cpf,
          financialModuleEnabled: true, // Enable financial module for paid clients
          expenseModuleEnabled: false, // No expense module (that's for accountant-managed clients)
          stripeCustomerId: stripeSubscription.customer as string,
        },
      });

      this.logger.log(`✅ Client created: ${client.id}`);

      // 3. Create Subscription
      await tx.subscription.create({
        data: {
          clientId: client.id,
          planId,
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId: stripeSubscription.customer as string,
          status: subscriptionStatus as any,
          currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
          trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
        },
      });

      this.logger.log(`✅ Subscription created for client: ${client.id}`);

      return { client };
    });

    // 4. Create default document folders
    try {
      await this.prisma.documentFolder.createMany({
        data: this.DEFAULT_FOLDERS.map(folder => ({
          ...folder,
          clientId: result.client.id,
        })),
      });
      this.logger.log(`📁 Default folders created for client: ${result.client.id}`);
    } catch (error) {
      this.logger.error(`❌ Failed to create default folders for client ${result.client.id}: ${error.message}`);
      // Don't throw - folder creation failure shouldn't fail the webhook
    }

    this.logger.log(`🎉 Public client checkout completed successfully for ${email}`);

    // Send welcome email
    try {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
      await this.emailService.sendWelcomeNewAccount(email, {
        name,
        companyName: 'Cliente Individual', // Placeholder for individual clients
        planName: plan.name,
        loginUrl: `${frontendUrl}/login`,
      });
      this.logger.log(`📧 Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send welcome email to ${email}: ${error.message}`);
      // Don't throw - email failure shouldn't fail the webhook
    }
  }

  /**
   * Handle authenticated checkout: Update existing accountant with new subscription
   */
  private async handleAuthenticatedCheckout(
    session: Stripe.Checkout.Session,
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
    this.logger.log(`🔄 Processing AUTHENTICATED checkout for session: ${session.id}`);

    const accountantId = session.metadata?.accountantId;
    const planId = session.metadata?.planId;

    if (!accountantId || !planId) {
      this.logger.error(`❌ Missing accountantId or planId in authenticated checkout: ${session.id}`);
      return;
    }

    // Get accountant details
    const accountant = await this.prisma.accountant.findUnique({
      where: { id: accountantId },
      include: { user: true },
    });

    if (!accountant) {
      this.logger.error(`❌ Accountant not found: ${accountantId}`);
      return;
    }

    // Validate and extract date fields
    const currentPeriodStart = (stripeSubscription as any).current_period_start;
    const currentPeriodEnd = (stripeSubscription as any).current_period_end;

    if (!currentPeriodStart || !currentPeriodEnd) {
      this.logger.error(`❌ Missing period dates in subscription: ${stripeSubscription.id}`);
      return;
    }

    // Check if accountant already has a subscription
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { accountantId },
    });

    const subscriptionData = {
      planId,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: stripeSubscription.customer as string,
      status: stripeSubscription.status.toUpperCase() as any,
      currentPeriodStart: new Date(currentPeriodStart * 1000),
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
      trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
    };

    if (existingSubscription) {
      // Update existing subscription
      await this.prisma.subscription.update({
        where: { accountantId },
        data: subscriptionData,
      });
      this.logger.log(`✅ Subscription updated for accountant ${accountantId}`);
    } else {
      // Create new subscription
      await this.prisma.subscription.create({
        data: {
          accountantId,
          ...subscriptionData,
        },
      });
      this.logger.log(`✅ Subscription created for accountant ${accountantId}`);
    }

    // Update accountant's subscription status
    const subscriptionStatus = stripeSubscription.status === 'trialing' ? 'TRIALING' : 'ACTIVE';

    await this.prisma.accountant.update({
      where: { id: accountantId },
      data: { subscriptionStatus },
    });

    this.logger.log(`✅ Subscription processed successfully for accountant ${accountantId}`);
  }

  /**
   * Handler: customer.subscription.created
   * Fired when a subscription is created
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Processing customer.subscription.created: ${subscription.id}`);

    // Extract metadata
    const accountantId = subscription.metadata?.accountantId;
    const planId = subscription.metadata?.planId;

    if (!accountantId || !planId) {
      this.logger.error(`❌ Missing metadata in subscription: ${subscription.id}`);
      return;
    }

    // Validate and extract date fields
    const currentPeriodStart = (subscription as any).current_period_start;
    const currentPeriodEnd = (subscription as any).current_period_end;

    if (!currentPeriodStart || !currentPeriodEnd) {
      this.logger.error(`❌ Missing period dates in subscription: ${subscription.id}`);
      return;
    }

    // Check if subscription already exists by stripeSubscriptionId (idempotency)
    const existingByStripeId = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (existingByStripeId) {
      this.logger.log(`⚠️ Subscription ${subscription.id} already exists, skipping creation`);
      return;
    }

    // Check if accountant already has a subscription (for plan upgrades/downgrades)
    const existingByAccountantId = await this.prisma.subscription.findUnique({
      where: { accountantId },
    });

    const subscriptionData = {
      planId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      status: subscription.status.toUpperCase() as any,
      currentPeriodStart: new Date(currentPeriodStart * 1000),
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    };

    if (existingByAccountantId) {
      // Update existing subscription (this is a plan upgrade/downgrade)
      await this.prisma.subscription.update({
        where: { accountantId },
        data: subscriptionData,
      });
      this.logger.log(`✅ Subscription updated for accountant ${accountantId} (plan change)`);
    } else {
      // Create new subscription
      await this.prisma.subscription.create({
        data: {
          accountantId,
          ...subscriptionData,
        },
      });
      this.logger.log(`✅ Subscription ${subscription.id} created for accountant ${accountantId}`);
    }

    // Update accountant's subscription status to ACTIVE or TRIALING
    const subscriptionStatus = subscription.status === 'trialing' ? 'TRIALING' : 'ACTIVE';

    await this.prisma.accountant.update({
      where: { id: accountantId },
      data: { subscriptionStatus },
    });

    this.logger.log(`✅ Subscription ${subscription.id} processed successfully for accountant ${accountantId}`);
  }

  /**
   * Handler: customer.subscription.updated
   * Fired when subscription changes (upgrade, downgrade, renewal, cancellation scheduled)
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Processing customer.subscription.updated: ${subscription.id}`);

    // Find existing subscription
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existingSubscription) {
      this.logger.warn(`⚠️ Subscription ${subscription.id} not found in database, creating new one`);

      // Extract metadata and create subscription
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
          stripeCustomerId: subscription.customer as string,
          status: subscription.status.toUpperCase() as any,
          currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        },
      });

      this.logger.log(`✅ Created subscription ${subscription.id} from update event`);
      return;
    }

    // Update subscription in database
    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status.toUpperCase() as any,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      },
    });

    // Update accountant's subscription status
    const subscriptionStatus =
      subscription.status === 'trialing' ? 'TRIALING' :
      subscription.status === 'active' ? 'ACTIVE' :
      subscription.status === 'past_due' ? 'PAST_DUE' :
      subscription.status === 'canceled' || subscription.status === 'unpaid' ? 'CANCELED' : 'ACTIVE';

    await this.prisma.accountant.update({
      where: { id: existingSubscription.accountantId },
      data: { subscriptionStatus },
    });

    this.logger.log(`✅ Subscription ${subscription.id} updated successfully`);
  }

  /**
   * Handler: customer.subscription.deleted
   * Fired when subscription is canceled/expires
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Processing customer.subscription.deleted: ${subscription.id}`);

    // Find existing subscription
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existingSubscription) {
      this.logger.warn(`⚠️ Subscription ${subscription.id} not found in database`);
      return;
    }

    // Update subscription status to CANCELED
    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : new Date(),
      },
    });

    // Update accountant's subscription status to SUSPENDED
    await this.prisma.accountant.update({
      where: { id: existingSubscription.accountantId },
      data: { subscriptionStatus: 'CANCELED' },
    });

    this.logger.log(`✅ Subscription ${subscription.id} canceled successfully`);

    // TODO: Send cancellation confirmation email via EmailService
  }

  /**
   * Handler: invoice.paid
   * Fired when invoice payment succeeds
   */
  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Processing invoice.paid: ${invoice.id}`);

    const invoiceSubscription = (invoice as any).subscription;
    if (!invoiceSubscription) {
      this.logger.log(`ℹ️  Invoice ${invoice.id} has no subscription, skipping`);
      return;
    }

    // Find subscription in database
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: invoiceSubscription as string },
    });

    if (!subscription) {
      this.logger.warn(`⚠️ Subscription ${invoiceSubscription} not found for invoice ${invoice.id}`);
      return;
    }

    // Check if invoice already exists (idempotency)
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

    // Create invoice record
    const period = invoice.lines?.data[0]?.period;
    await this.prisma.invoice.create({
      data: {
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        invoiceNumber: invoice.number || `INV-${invoice.id}`,
        amount: invoice.amount_paid / 100, // Convert cents to dollars
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

    // Update subscription period if needed
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

    // TODO: Send receipt email via EmailService
  }

  /**
   * Handler: invoice.payment_failed
   * Fired when invoice payment fails
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Processing invoice.payment_failed: ${invoice.id}`);

    const invoiceSubscription = (invoice as any).subscription;
    if (!invoiceSubscription) {
      this.logger.log(`ℹ️  Invoice ${invoice.id} has no subscription, skipping`);
      return;
    }

    // Find subscription in database
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: invoiceSubscription as string },
    });

    if (!subscription) {
      this.logger.warn(`⚠️ Subscription ${invoiceSubscription} not found for invoice ${invoice.id}`);
      return;
    }

    // Check if invoice already exists
    const existingInvoice = await this.prisma.invoice.findUnique({
      where: { stripeInvoiceId: invoice.id },
    });

    if (existingInvoice) {
      // Update existing invoice to FAILED
      await this.prisma.invoice.update({
        where: { stripeInvoiceId: invoice.id },
        data: { status: 'UNCOLLECTIBLE' },
      });

      this.logger.log(`✅ Updated invoice ${invoice.id} status to UNCOLLECTIBLE`);
    } else {
      // Create invoice record as UNCOLLECTIBLE
      const period = invoice.lines?.data[0]?.period;
      await this.prisma.invoice.create({
        data: {
          subscriptionId: subscription.id,
          stripeInvoiceId: invoice.id,
          invoiceNumber: invoice.number || `INV-${invoice.id}`,
          amount: invoice.amount_due / 100, // Convert cents to dollars
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

    // Update accountant subscription status to PAST_DUE
    await this.prisma.accountant.update({
      where: { id: subscription.accountantId },
      data: { subscriptionStatus: 'PAST_DUE' },
    });

    this.logger.log(`⚠️ Payment failed for invoice ${invoice.id}`);

    // TODO: Send payment failure notification email via EmailService
  }

  /**
   * Handler: customer.updated
   * Fired when customer details change
   */
  private async handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
    this.logger.log(`Processing customer.updated: ${customer.id}`);

    // Find accountant by Stripe customer ID
    const accountant = await this.prisma.accountant.findUnique({
      where: { stripeCustomerId: customer.id },
    });

    if (!accountant) {
      this.logger.warn(`⚠️ Accountant not found for Stripe customer: ${customer.id}`);
      return;
    }

    // Update accountant's company name if customer name changed
    const updateData: any = {};

    if (customer.name && customer.name !== accountant.companyName) {
      updateData.companyName = customer.name;
    }

    // Update CNPJ if tax ID changed
    if (customer.tax_ids && customer.tax_ids.data.length > 0) {
      const taxId = customer.tax_ids.data[0];
      if (taxId.type === 'br_cnpj' && taxId.value !== accountant.cnpj) {
        updateData.cnpj = taxId.value;
      }
    }

    // Only update if there are changes
    if (Object.keys(updateData).length > 0) {
      await this.prisma.accountant.update({
        where: { id: accountant.id },
        data: updateData,
      });

      this.logger.log(`✅ Accountant ${accountant.id} synced with Stripe customer ${customer.id}`);
    } else {
      this.logger.log(`ℹ️  No changes to sync for customer ${customer.id}`);
    }
  }

  /**
   * Handler: payment_method.attached
   * Fired when payment method is attached to customer
   */
  private async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    this.logger.log(`Processing payment_method.attached: ${paymentMethod.id}`);

    if (!paymentMethod.customer) {
      this.logger.log(`ℹ️  Payment method ${paymentMethod.id} has no customer, skipping`);
      return;
    }

    // Find accountant by Stripe customer ID
    const accountant = await this.prisma.accountant.findUnique({
      where: { stripeCustomerId: paymentMethod.customer as string },
    });

    if (!accountant) {
      this.logger.warn(`⚠️ Accountant not found for Stripe customer: ${paymentMethod.customer}`);
      return;
    }

    // Log payment method details
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

    // Note: Payment method details are managed by Stripe
    // No need to store in our database as we can retrieve them from Stripe
  }
}
