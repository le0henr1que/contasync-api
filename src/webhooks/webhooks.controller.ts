import { Controller, Post, Headers, Req, HttpCode, HttpStatus } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

/**
 * WebhooksController - Handles Stripe webhook endpoint
 *
 * IMPORTANT: This endpoint requires raw body parsing to verify Stripe signatures.
 * The raw body parser is configured in main.ts.
 */
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * POST /api/webhooks/stripe
   * Receives and processes Stripe webhook events
   */
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody;

    if (!rawBody) {
      throw new Error('Raw body not available');
    }

    if (!signature) {
      throw new Error('No stripe-signature header found');
    }

    // Construct and verify event
    const event = this.webhooksService.constructEvent(rawBody, signature);

    // Process event
    await this.webhooksService.handleWebhook(event);

    return { received: true };
  }
}
