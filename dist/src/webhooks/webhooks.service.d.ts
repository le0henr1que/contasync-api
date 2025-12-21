import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
export declare class WebhooksService {
    private readonly stripe;
    private readonly configService;
    private readonly prisma;
    private readonly emailService;
    private readonly logger;
    private readonly webhookSecret;
    constructor(stripe: Stripe, configService: ConfigService, prisma: PrismaService, emailService: EmailService);
    constructEvent(rawBody: Buffer, signature: string): Stripe.Event;
    handleWebhook(event: Stripe.Event): Promise<void>;
    private handleCheckoutCompleted;
    private handlePublicCheckout;
    private handleAuthenticatedCheckout;
    private handleSubscriptionCreated;
    private handleSubscriptionUpdated;
    private handleSubscriptionDeleted;
    private handleInvoicePaid;
    private handleInvoicePaymentFailed;
    private handleCustomerUpdated;
    private handlePaymentMethodAttached;
}
