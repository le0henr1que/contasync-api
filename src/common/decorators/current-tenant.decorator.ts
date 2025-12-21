import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentTenant() - Extracts tenantId from JWT payload
 *
 * This decorator retrieves the current user's tenantId from the request.
 * For accountants, it returns accountantId.
 * For clients, it returns clientId.
 *
 * @example
 * ```typescript
 * @Get('expenses')
 * @UseGuards(JwtAuthGuard)
 * async getExpenses(@CurrentTenant() tenantId: string) {
 *   // Use tenantId directly
 *   return this.expensesService.findAll(tenantId);
 * }
 * ```
 */
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    // For accountants, return accountantId
    // For clients, return clientId
    return user.accountantId || user.clientId || null;
  },
);
