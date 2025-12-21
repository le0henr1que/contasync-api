import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { TenantContext } from '../common/context/tenant.context';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await service.$disconnect();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Row-Level Security Middleware', () => {
    it('should log RLS enabled message on init', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      await service.onModuleInit();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Row-Level Security middleware enabled'),
      );
    });

    it('should warn when RLS is disabled via environment variable', async () => {
      process.env.ENABLE_RLS = 'false';

      const module: TestingModule = await Test.createTestingModule({
        providers: [PrismaService],
      }).compile();

      const disabledService = module.get<PrismaService>(PrismaService);
      const loggerSpy = jest.spyOn((disabledService as any).logger, 'warn');

      await disabledService.onModuleInit();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Row-Level Security is DISABLED'),
      );

      await disabledService.$disconnect();
      delete process.env.ENABLE_RLS;
    });
  });

  describe('Tenant Context Integration', () => {
    it('should use TenantContext to get accountantId', async () => {
      const accountantId = 'test-accountant-123';

      await TenantContext.run(accountantId, () => {
        const tenantId = TenantContext.getTenantId();
        expect(tenantId).toBe(accountantId);
      });
    });

    it('should handle missing tenant context gracefully', () => {
      const tenantId = TenantContext.getTenantId();
      expect(tenantId).toBeNull();
    });
  });
});
