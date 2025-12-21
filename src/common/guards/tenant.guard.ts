import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * TenantGuard - Validates hierarchical tenant access
 *
 * This guard ensures that:
 * 1. Users can access their own tenant data
 * 2. Parent tenants (accountants) can access child tenants (clients) data
 * 3. Child tenants cannot access parent or sibling tenants
 *
 * @example
 * ```typescript
 * @Get('client/:tenantId/expenses')
 * @UseGuards(JwtAuthGuard, TenantGuard)
 * async getClientExpenses(@Param('tenantId') tenantId: string) {
 *   // TenantGuard has validated that user can access this tenant
 * }
 * ```
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user, deny access (should be caught by JwtAuthGuard first)
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Extract resource tenantId from params or query
    // Support both 'tenantId' and 'clientId' parameter names
    const resourceTenantId = request.params.tenantId || request.params.clientId || request.query.tenantId || request.query.clientId;

    // If no resourceTenantId in route, allow (using own tenant context)
    if (!resourceTenantId) {
      return true;
    }

    // Get user's tenantId (accountantId for accountants, clientId for clients)
    const userTenantId = user.accountantId || user.clientId;

    if (!userTenantId) {
      throw new ForbiddenException('Tenant context not found');
    }

    // If accessing own tenant, allow
    if (resourceTenantId === userTenantId) {
      return true;
    }

    // For accountants: check if resourceTenantId is a child client
    if (user.role === 'ACCOUNTANT') {
      const client = await this.prisma.client.findFirst({
        where: {
          id: resourceTenantId,
          accountantId: userTenantId,
        },
      });

      if (client) {
        return true; // Accountant can access their client's data
      }
    }

    // Access denied
    throw new ForbiddenException('Tenant access denied');
  }
}
