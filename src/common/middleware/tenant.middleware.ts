import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../context/tenant.context';

/**
 * TenantMiddleware - Extracts tenant ID from JWT and sets it in TenantContext
 *
 * This middleware runs for every request and:
 * 1. Extracts the tenantId from the JWT payload (req.user)
 * 2. Sets it in AsyncLocalStorage via TenantContext
 * 3. Makes tenantId available throughout the request lifecycle
 *
 * @example
 * Apply globally in AppModule:
 * ```typescript
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(TenantMiddleware).forRoutes('*');
 *   }
 * }
 * ```
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract tenantId from JWT payload (set by JwtAuthGuard)
    const user = (req as any).user;

    if (user?.accountantId) {
      // For ACCOUNTANT role: tenantId = accountantId
      const tenantId = user.accountantId;

      // Run the rest of the request with tenant context
      TenantContext.run(tenantId, () => {
        next();
      });
    } else if (user?.clientId) {
      // For CLIENT role: we need to fetch the accountant's tenantId
      // For now, we'll use clientId as tenantId (hierarchical tenant)
      const tenantId = user.clientId;

      TenantContext.run(tenantId, () => {
        next();
      });
    } else {
      // No user authenticated or no tenant info - continue without context
      // This is OK for public routes (signup, login, etc.)
      next();
    }
  }
}
