import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let prismaService: PrismaService;

  const mockPrismaService = {
    client: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantGuard,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    guard = module.get<TenantGuard>(TenantGuard);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (user: any, params: any = {}, query: any = {}): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params,
          query,
        }),
      }),
    } as ExecutionContext;
  };

  describe('Authentication', () => {
    it('should throw ForbiddenException when no user is authenticated', async () => {
      const context = createMockContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('Authentication required'),
      );
    });

    it('should throw ForbiddenException when user has no tenantId', async () => {
      const context = createMockContext({ role: 'ACCOUNTANT' }, { tenantId: 'some-tenant' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('Tenant context not found'),
      );
    });
  });

  describe('Own Tenant Access', () => {
    it('should allow access when no resourceTenantId is specified', async () => {
      const user = {
        role: 'ACCOUNTANT',
        accountantId: 'accountant-123',
      };
      const context = createMockContext(user);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow accountant to access their own tenant', async () => {
      const user = {
        role: 'ACCOUNTANT',
        accountantId: 'accountant-123',
      };
      const context = createMockContext(user, { tenantId: 'accountant-123' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow client to access their own tenant', async () => {
      const user = {
        role: 'CLIENT',
        clientId: 'client-123',
      };
      const context = createMockContext(user, { tenantId: 'client-123' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Hierarchical Access (Accountant → Client)', () => {
    it('should allow accountant to access their client data', async () => {
      const user = {
        role: 'ACCOUNTANT',
        accountantId: 'accountant-123',
      };
      const context = createMockContext(user, { tenantId: 'client-456' });

      mockPrismaService.client.findFirst.mockResolvedValue({
        id: 'client-456',
        accountantId: 'accountant-123',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrismaService.client.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'client-456',
          accountantId: 'accountant-123',
        },
      });
    });

    it('should deny accountant access to non-child client', async () => {
      const user = {
        role: 'ACCOUNTANT',
        accountantId: 'accountant-123',
      };
      const context = createMockContext(user, { tenantId: 'client-999' });

      mockPrismaService.client.findFirst.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('Tenant access denied'),
      );

      expect(mockPrismaService.client.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'client-999',
          accountantId: 'accountant-123',
        },
      });
    });
  });

  describe('Cross-Tenant Access Prevention', () => {
    it('should deny client access to another client tenant', async () => {
      const user = {
        role: 'CLIENT',
        clientId: 'client-123',
      };
      const context = createMockContext(user, { tenantId: 'client-456' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('Tenant access denied'),
      );
    });

    it('should deny client access to accountant tenant', async () => {
      const user = {
        role: 'CLIENT',
        clientId: 'client-123',
      };
      const context = createMockContext(user, { tenantId: 'accountant-456' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('Tenant access denied'),
      );
    });
  });

  describe('Query Parameter Support', () => {
    it('should extract tenantId from query parameters', async () => {
      const user = {
        role: 'ACCOUNTANT',
        accountantId: 'accountant-123',
      };
      const context = createMockContext(user, {}, { tenantId: 'accountant-123' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should prioritize params over query parameters', async () => {
      const user = {
        role: 'ACCOUNTANT',
        accountantId: 'accountant-123',
      };
      const context = createMockContext(
        user,
        { tenantId: 'accountant-123' },
        { tenantId: 'different-tenant' },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
