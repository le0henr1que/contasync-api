import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Body,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TrialService } from './trial.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Controller('trial')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrialController {
  constructor(
    private readonly trialService: TrialService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get trial status for the authenticated accountant
   */
  @Get('status')
  @Roles('ACCOUNTANT')
  async getTrialStatus(@Request() req) {
    const accountant = await this.prisma.accountant.findUnique({
      where: { userId: req.user.sub },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!accountant) {
      throw new BadRequestException('Accountant not found');
    }

    const isTrialing = accountant.subscriptionStatus === SubscriptionStatus.TRIALING;
    const trialEnd = accountant.subscription?.trialEnd;

    let daysRemaining = null;
    let isExpired = false;

    if (isTrialing && trialEnd) {
      const now = new Date();
      const diffTime = trialEnd.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isExpired = daysRemaining < 0;
    }

    return {
      subscriptionStatus: accountant.subscriptionStatus,
      isTrialing,
      trialEnd,
      daysRemaining,
      isExpired,
      trialExtended: accountant.trialExtended || false,
      canExtend: isTrialing && !accountant.trialExtended && !isExpired,
      plan: accountant.subscription?.plan,
    };
  }

  /**
   * Extend trial period by additional days
   *
   * Rules:
   * - Only available for accountants in TRIALING status
   * - Can only extend once (trialExtended must be false)
   * - Trial must not be expired
   * - Extends by specified days (default 7 days)
   */
  @Post('extend')
  @Roles('ACCOUNTANT')
  async extendTrial(
    @Request() req,
    @Body() body: { days?: number; reason?: string },
  ) {
    const { days = 7, reason } = body;

    if (days < 1 || days > 30) {
      throw new BadRequestException('Extension days must be between 1 and 30');
    }

    const accountant = await this.prisma.accountant.findUnique({
      where: { userId: req.user.sub },
      include: {
        subscription: true,
        user: true,
      },
    });

    if (!accountant) {
      throw new BadRequestException('Accountant not found');
    }

    // Validate extension eligibility
    if (accountant.subscriptionStatus !== SubscriptionStatus.TRIALING) {
      throw new ForbiddenException('Trial extension is only available for trialing accounts');
    }

    if (accountant.trialExtended) {
      throw new ForbiddenException('Trial has already been extended once');
    }

    const trialEnd = accountant.subscription?.trialEnd;
    if (!trialEnd) {
      throw new BadRequestException('No active trial found');
    }

    const now = new Date();
    if (trialEnd < now) {
      throw new ForbiddenException('Cannot extend an expired trial');
    }

    // Calculate new trial end date
    const newTrialEnd = new Date(trialEnd);
    newTrialEnd.setDate(newTrialEnd.getDate() + days);

    // Update subscription and accountant
    await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { id: accountant.subscription!.id },
        data: {
          trialEnd: newTrialEnd,
        },
      }),
      this.prisma.accountant.update({
        where: { id: accountant.id },
        data: {
          trialExtended: true,
        },
      }),
    ]);

    // Log the extension for audit purposes
    console.log(`Trial extended for accountant ${accountant.id} (${accountant.user.email}):`, {
      originalTrialEnd: trialEnd,
      newTrialEnd,
      extensionDays: days,
      reason: reason || 'User requested',
    });

    return {
      success: true,
      message: `Trial extended by ${days} days`,
      originalTrialEnd: trialEnd,
      newTrialEnd,
      daysAdded: days,
    };
  }
}
