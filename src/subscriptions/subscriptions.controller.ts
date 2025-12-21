import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * GET /api/subscriptions/me
   *
   * Get current user's subscription details
   */
  @Get('me')
  @Roles(Role.ACCOUNTANT)
  async getMySubscription(@Request() req) {
    const accountantId = req.user.accountantId;
    return this.subscriptionsService.getSubscription(accountantId);
  }

  /**
   * GET /api/subscriptions/me/usage
   *
   * Get current usage against plan limits
   */
  @Get('me/usage')
  @Roles(Role.ACCOUNTANT)
  async getMyUsage(@Request() req) {
    const accountantId = req.user.accountantId;
    return this.subscriptionsService.getUsage(accountantId);
  }

  /**
   * POST /api/subscriptions/checkout
   *
   * Create a Stripe Checkout Session for subscription
   *
   * Only accountants can create subscriptions
   */
  @Post('checkout')
  @Roles(Role.ACCOUNTANT)
  async createCheckout(
    @Request() req,
    @Body() createCheckoutDto: CreateCheckoutDto,
  ): Promise<{ url: string }> {
    const accountantId = req.user.accountantId;
    return this.subscriptionsService.createCheckoutSession(accountantId, createCheckoutDto);
  }

  /**
   * POST /api/subscriptions/upgrade
   *
   * Upgrade to a higher-tier plan
   *
   * Only accountants can upgrade their subscription
   */
  @Post('upgrade')
  @Roles(Role.ACCOUNTANT)
  async upgradePlan(
    @Request() req,
    @Body() upgradePlanDto: UpgradePlanDto,
  ): Promise<{ message: string; subscription: any }> {
    const accountantId = req.user.accountantId;
    return this.subscriptionsService.upgradePlan(accountantId, upgradePlanDto);
  }

  /**
   * POST /api/subscriptions/downgrade
   *
   * Downgrade to a lower-tier plan
   *
   * The downgrade will take effect at the end of the current billing period
   * Only accountants can downgrade their subscription
   */
  @Post('downgrade')
  @Roles(Role.ACCOUNTANT)
  async downgradePlan(
    @Request() req,
    @Body() downgradePlanDto: UpgradePlanDto,
  ): Promise<{ message: string; effectiveDate: Date }> {
    const accountantId = req.user.accountantId;
    return this.subscriptionsService.downgradePlan(accountantId, downgradePlanDto);
  }

  /**
   * POST /api/subscriptions/cancel
   *
   * Cancel subscription
   *
   * Can cancel immediately or at the end of the billing period
   * Only accountants can cancel their subscription
   */
  @Post('cancel')
  @Roles(Role.ACCOUNTANT)
  async cancelSubscription(
    @Request() req,
    @Body() cancelDto: CancelSubscriptionDto,
  ): Promise<{ message: string; effectiveDate?: Date }> {
    const accountantId = req.user.accountantId;
    return this.subscriptionsService.cancelSubscription(accountantId, cancelDto);
  }

  /**
   * POST /api/subscriptions/portal
   *
   * Create a Stripe Customer Portal Session
   *
   * Allows customers to manage subscription, payment methods, and invoices
   */
  @Post('portal')
  @Roles(Role.ACCOUNTANT)
  async createPortal(
    @Request() req,
    @Body('returnUrl') returnUrl?: string,
  ): Promise<{ url: string }> {
    const accountantId = req.user.accountantId;
    return this.subscriptionsService.createPortalSession(accountantId, returnUrl);
  }
}
