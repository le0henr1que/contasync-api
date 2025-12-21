import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

export const RESOURCE_TYPE_KEY = 'resourceType';

export enum ResourceType {
  PAYMENT = 'payment',
  EXPENSE = 'expense',
  DOCUMENT = 'document',
}

@Injectable()
export class PlanLimitsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resourceType = this.reflector.get<ResourceType>(
      RESOURCE_TYPE_KEY,
      context.getHandler(),
    );

    if (!resourceType) {
      return true; // No resource type specified, skip guard
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'CLIENT') {
      return true; // Only check limits for clients
    }

    // Get client data
    const client = await this.prisma.client.findUnique({
      where: { userId: user.id },
      include: {
        accountant: {
          include: {
            subscription: {
              include: {
                plan: true,
              },
            },
          },
        },
      },
    });

    if (!client || !client.accountant) {
      return true; // No accountant, skip check
    }

    const subscription = client.accountant.subscription;
    if (!subscription || !subscription.plan) {
      return true; // No subscription/plan, skip check
    }

    // Get plan limits
    const limitsJson = subscription.plan.limitsJson as any;
    if (!limitsJson) {
      return true; // No limits defined
    }

    // Check based on resource type
    switch (resourceType) {
      case ResourceType.PAYMENT:
        return this.checkPaymentLimit(client.id, limitsJson.maxPayments);
      case ResourceType.EXPENSE:
        return this.checkExpenseLimit(client.id, limitsJson.maxExpenses);
      case ResourceType.DOCUMENT:
        return this.checkDocumentLimit(client.id, limitsJson.maxDocuments);
      default:
        return true;
    }
  }

  private async checkPaymentLimit(
    clientId: string,
    maxPayments: number,
  ): Promise<boolean> {
    if (!maxPayments) return true;

    const count = await this.prisma.payment.count({
      where: { clientId },
    });

    if (count >= maxPayments) {
      throw new ForbiddenException(
        'Limite de pagamentos atingido. Contate seu contador para fazer upgrade do plano.',
      );
    }

    return true;
  }

  private async checkExpenseLimit(
    clientId: string,
    maxExpenses: number,
  ): Promise<boolean> {
    if (!maxExpenses) return true;

    const count = await this.prisma.expense.count({
      where: { clientId },
    });

    if (count >= maxExpenses) {
      throw new ForbiddenException(
        'Limite de despesas atingido. Contate seu contador para fazer upgrade do plano.',
      );
    }

    return true;
  }

  private async checkDocumentLimit(
    clientId: string,
    maxDocuments: number,
  ): Promise<boolean> {
    if (!maxDocuments) return true;

    const count = await this.prisma.document.count({
      where: { clientId, deletedAt: null },
    });

    if (count >= maxDocuments) {
      throw new ForbiddenException(
        'Limite de documentos atingido. Contate seu contador para fazer upgrade do plano.',
      );
    }

    return true;
  }
}
