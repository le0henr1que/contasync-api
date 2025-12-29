import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class TrialService {
  private readonly logger = new Logger(TrialService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Runs every day at 9:00 AM to check trials expiring in 7 days
   */
  @Cron('0 9 * * *', {
    name: 'check-trials-expiring-7-days',
    timeZone: 'America/Sao_Paulo',
  })
  async checkTrialsExpiring7Days() {
    this.logger.log('Running cron: Check trials expiring in 7 days');

    try {
      // Calculate date range: 7 days from now
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setDate(now.getDate() + 7);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      // Find subscriptions expiring in 7 days
      const expiringSubscriptions = await this.prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.TRIALING,
          trialEnd: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          accountant: {
            include: {
              user: true,
              clients: true,
            },
          },
        },
      });

      this.logger.log(
        `Found ${expiringSubscriptions.length} trials expiring in 7 days`,
      );

      for (const subscription of expiringSubscriptions) {
        const accountant = subscription.accountant;
        const user = accountant.user;

        // Get usage stats
        const documentsCount = await this.prisma.document.count({
          where: { createdById: user.id },
        });

        const paymentsCount = await this.prisma.payment.count({
          where: {
            client: {
              accountantId: accountant.id,
            },
          },
        });

        await this.emailService.sendTrialExpiring7Days(user.email, {
          accountantName: user.name,
          companyName: accountant.companyName,
          trialEndDate: subscription.trialEnd?.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }) || '',
          daysRemaining: 7,
          usage: {
            clientsCount: accountant.clients.length,
            documentsCount,
            paymentsCount,
          },
          plansUrl: `${process.env.APP_URL || 'http://localhost:3001'}/pricing`,
        });

        this.logger.log(
          `Sent 7-day expiration email to ${user.email} (${accountant.companyName})`,
        );
      }
    } catch (error) {
      this.logger.error('Error checking trials expiring in 7 days:', error);
    }
  }

  /**
   * Runs every day at 9:00 AM to check trials expiring in 4 days
   */
  @Cron('0 9 * * *', {
    name: 'check-trials-expiring-4-days',
    timeZone: 'America/Sao_Paulo',
  })
  async checkTrialsExpiring4Days() {
    this.logger.log('Running cron: Check trials expiring in 4 days');

    try {
      // Calculate date range: 4 days from now
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setDate(now.getDate() + 4);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      // Find subscriptions expiring in 4 days
      const expiringSubscriptions = await this.prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.TRIALING,
          trialEnd: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          accountant: {
            include: {
              user: true,
              clients: true,
            },
          },
        },
      });

      this.logger.log(
        `Found ${expiringSubscriptions.length} trials expiring in 4 days`,
      );

      for (const subscription of expiringSubscriptions) {
        const accountant = subscription.accountant;
        const user = accountant.user;

        // Get usage stats
        const documentsCount = await this.prisma.document.count({
          where: { createdById: user.id },
        });

        const paymentsCount = await this.prisma.payment.count({
          where: {
            client: {
              accountantId: accountant.id,
            },
          },
        });

        await this.emailService.sendTrialExpiring4Days(user.email, {
          accountantName: user.name,
          companyName: accountant.companyName,
          trialEndDate: subscription.trialEnd?.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }) || '',
          daysRemaining: 4,
          usage: {
            clientsCount: accountant.clients.length,
            documentsCount,
            paymentsCount,
          },
          plansUrl: `${process.env.APP_URL || 'http://localhost:3001'}/pricing`,
        });

        this.logger.log(
          `Sent 4-day expiration email to ${user.email} (${accountant.companyName})`,
        );
      }
    } catch (error) {
      this.logger.error('Error checking trials expiring in 4 days:', error);
    }
  }

  /**
   * Runs every day at 9:00 AM to check trials expiring in 3 days
   */
  @Cron('0 9 * * *', {
    name: 'check-trials-expiring-3-days',
    timeZone: 'America/Sao_Paulo',
  })
  async checkTrialsExpiring3Days() {
    this.logger.log('Running cron: Check trials expiring in 3 days');

    try {
      // Calculate date range: 3 days from now
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setDate(now.getDate() + 3);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      // Find subscriptions expiring in 3 days
      const expiringSubscriptions = await this.prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.TRIALING,
          trialEnd: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          accountant: {
            include: {
              user: true,
              clients: true,
            },
          },
        },
      });

      this.logger.log(
        `Found ${expiringSubscriptions.length} trials expiring in 3 days`,
      );

      for (const subscription of expiringSubscriptions) {
        const accountant = subscription.accountant;
        const user = accountant.user;

        // Get usage stats
        const documentsCount = await this.prisma.document.count({
          where: { createdById: user.id },
        });

        const paymentsCount = await this.prisma.payment.count({
          where: {
            client: {
              accountantId: accountant.id,
            },
          },
        });

        await this.emailService.sendTrialExpiring3Days(user.email, {
          accountantName: user.name,
          companyName: accountant.companyName,
          trialEndDate: subscription.trialEnd?.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }) || '',
          daysRemaining: 3,
          usage: {
            clientsCount: accountant.clients.length,
            documentsCount,
            paymentsCount,
          },
          plansUrl: `${process.env.APP_URL || 'http://localhost:3001'}/pricing`,
        });

        this.logger.log(
          `Sent 3-day expiration email to ${user.email} (${accountant.companyName})`,
        );
      }
    } catch (error) {
      this.logger.error('Error checking trials expiring in 3 days:', error);
    }
  }

  /**
   * Runs every day at 9:00 AM to check trials expiring in 1 day
   */
  @Cron('0 9 * * *', {
    name: 'check-trials-expiring-1-day',
    timeZone: 'America/Sao_Paulo',
  })
  async checkTrialsExpiring1Day() {
    this.logger.log('Running cron: Check trials expiring in 1 day');

    try {
      // Calculate date range: tomorrow
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setDate(now.getDate() + 1);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      // Find subscriptions expiring tomorrow
      const expiringSubscriptions = await this.prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.TRIALING,
          trialEnd: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          accountant: {
            include: {
              user: true,
              clients: true,
            },
          },
        },
      });

      this.logger.log(
        `Found ${expiringSubscriptions.length} trials expiring in 1 day`,
      );

      for (const subscription of expiringSubscriptions) {
        const accountant = subscription.accountant;
        const user = accountant.user;

        // Get usage stats
        const documentsCount = await this.prisma.document.count({
          where: { createdById: user.id },
        });

        const paymentsCount = await this.prisma.payment.count({
          where: {
            client: {
              accountantId: accountant.id,
            },
          },
        });

        await this.emailService.sendTrialExpiring1Day(user.email, {
          accountantName: user.name,
          companyName: accountant.companyName,
          trialEndDate: subscription.trialEnd?.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }) || '',
          daysRemaining: 1,
          usage: {
            clientsCount: accountant.clients.length,
            documentsCount,
            paymentsCount,
          },
          plansUrl: `${process.env.APP_URL || 'http://localhost:3001'}/pricing`,
        });

        this.logger.log(
          `Sent 1-day expiration email to ${user.email} (${accountant.companyName})`,
        );
      }
    } catch (error) {
      this.logger.error('Error checking trials expiring in 1 day:', error);
    }
  }

  /**
   * Runs every day at 1:00 AM to expire trials
   */
  @Cron('0 1 * * *', {
    name: 'expire-trials',
    timeZone: 'America/Sao_Paulo',
  })
  async expireTrials() {
    this.logger.log('Running cron: Expire trials');

    try {
      const now = new Date();

      // Find expired trials
      const expiredSubscriptions = await this.prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.TRIALING,
          trialEnd: {
            lt: now,
          },
        },
        include: {
          accountant: {
            include: {
              user: true,
            },
          },
        },
      });

      this.logger.log(`Found ${expiredSubscriptions.length} expired trials`);

      for (const subscription of expiredSubscriptions) {
        const accountant = subscription.accountant;
        const user = accountant.user;

        // Update subscription status to CANCELED
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.CANCELED },
        });

        // Update accountant status
        await this.prisma.accountant.update({
          where: { id: accountant.id },
          data: { subscriptionStatus: SubscriptionStatus.CANCELED },
        });

        // Send trial expired email
        await this.emailService.sendTrialExpired(user.email, {
          accountantName: user.name,
          companyName: accountant.companyName,
          plansUrl: `${process.env.APP_URL || 'http://localhost:3001'}/pricing`,
        });

        this.logger.log(
          `Expired trial for ${user.email} (${accountant.companyName})`,
        );
      }
    } catch (error) {
      this.logger.error('Error expiring trials:', error);
    }
  }
}
