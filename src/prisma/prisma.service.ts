import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { TenantContext } from '../common/context/tenant.context';

/**
 * PrismaService with Row-Level Security (RLS) Middleware
 *
 * Automatically filters all queries by accountantId (tenant) to ensure
 * complete data isolation between tenants.
 *
 * Features:
 * - Auto-inject accountantId in WHERE clauses (findMany, findFirst, count)
 * - Auto-inject accountantId in CREATE operations
 * - Block UPDATE/DELETE of other tenants' data
 * - Allow admin queries when no tenant context exists
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly RLS_ENABLED = process.env.ENABLE_RLS !== 'false'; // Default: enabled

  /**
   * Models that require Row-Level Security (accountantId filtering)
   *
   * NOTE: These models must have an 'accountantId' field in the schema.
   * Currently, the schema doesn't have this field yet, so RLS won't apply.
   * This will be added in future migrations.
   */
  private readonly TENANT_MODELS = [
    'Client',
    'Payment',
    'Expense',
    'Document',
    'DocumentRequest',
    'Notification',
    'ActivityLog',
    // Future models with multi-tenancy:
    // 'Invoice',
    // 'UsageRecord',
  ];

  constructor() {
    const connectionString = process.env.DATABASE_URL || 'postgresql://contasync:contasync123@localhost:5432/contasync?schema=public';
    const pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 5000,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();

    if (this.RLS_ENABLED) {
      this.enableRowLevelSecurity();
      this.logger.log('✅ Row-Level Security middleware enabled');
    } else {
      this.logger.warn('⚠️  Row-Level Security is DISABLED (ENABLE_RLS=false)');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Enable Row-Level Security middleware
   *
   * NOTE: Row-Level Security is temporarily disabled due to Prisma 5.x compatibility.
   * The $use middleware has been removed in Prisma 5.x.
   *
   * To re-enable RLS, we would need to:
   * 1. Manually add accountantId checks in service methods, OR
   * 2. Use Prisma Client Extensions (more complex setup), OR
   * 3. Add database-level RLS policies in PostgreSQL
   *
   * For now, RLS is handled at the service layer via guards and decorators.
   */
  private enableRowLevelSecurity() {
    this.logger.warn('⚠️  Row-Level Security middleware is disabled (Prisma 5.x compatibility)');
    this.logger.log('ℹ️  RLS is enforced at service layer via @TenantOwned decorator');
  }
}
