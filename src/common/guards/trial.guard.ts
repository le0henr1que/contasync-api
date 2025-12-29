import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

/**
 * Metadata key to skip trial check for specific routes
 */
export const SKIP_TRIAL_CHECK = 'skipTrialCheck';

/**
 * Guard to block access when trial is expired
 *
 * Usage:
 * - Add @UseGuards(TrialGuard) to controller or route
 * - Use @SkipTrialCheck() decorator to skip check on specific routes (e.g., billing endpoints)
 *
 * This guard will:
 * - Allow all requests from non-ACCOUNTANT users (clients pass through)
 * - Allow ACCOUNTANT users with ACTIVE or CANCELED status
 * - Block ACCOUNTANT users with expired TRIALING status
 * - Allow access to routes marked with @SkipTrialCheck()
 */
@Injectable()
export class TrialGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked to skip trial check
    const skipTrialCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRIAL_CHECK,
      [context.getHandler(), context.getClass()],
    );

    if (skipTrialCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user or not an accountant, allow access
    if (!user || user.role !== 'ACCOUNTANT') {
      return true;
    }

    // Fetch accountant with subscription details
    const accountant = await this.prisma.accountant.findUnique({
      where: { userId: user.sub },
      include: {
        subscription: true,
      },
    });

    if (!accountant) {
      return true; // Should not happen, but allow to avoid blocking legitimate requests
    }

    // Check if trial is expired
    const isTrialing = accountant.subscriptionStatus === SubscriptionStatus.TRIALING;
    const trialEnd = accountant.subscription?.trialEnd;

    if (isTrialing && trialEnd) {
      const now = new Date();
      const isExpired = trialEnd < now;

      if (isExpired) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'Seu período de trial expirou. Por favor, assine um plano para continuar usando o ContaSync.',
          error: 'TRIAL_EXPIRED',
          trialEndDate: trialEnd.toISOString(),
          subscriptionStatus: accountant.subscriptionStatus,
        });
      }
    }

    // Check if subscription is canceled (and not trialing)
    if (accountant.subscriptionStatus === SubscriptionStatus.CANCELED && !isTrialing) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Sua assinatura foi cancelada. Por favor, assine um plano para continuar usando o ContaSync.',
        error: 'SUBSCRIPTION_CANCELED',
        subscriptionStatus: accountant.subscriptionStatus,
      });
    }

    return true;
  }
}
