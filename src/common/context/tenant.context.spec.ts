import { TenantContext } from './tenant.context';

describe('TenantContext', () => {
  describe('run', () => {
    it('should set and get tenant ID within context', () => {
      const tenantId = 'tenant-123';

      TenantContext.run(tenantId, () => {
        const retrieved = TenantContext.getTenantId();
        expect(retrieved).toBe(tenantId);
      });
    });

    it('should return null outside of context', () => {
      const tenantId = TenantContext.getTenantId();
      expect(tenantId).toBeNull();
    });

    it('should isolate contexts between concurrent async operations', async () => {
      const promises = [
        TenantContext.run('tenant-1', async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return TenantContext.getTenantId();
        }),
        TenantContext.run('tenant-2', async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return TenantContext.getTenantId();
        }),
        TenantContext.run('tenant-3', async () => {
          return TenantContext.getTenantId();
        }),
      ];

      const results = await Promise.all(promises);

      expect(results[0]).toBe('tenant-1');
      expect(results[1]).toBe('tenant-2');
      expect(results[2]).toBe('tenant-3');
    });

    it('should preserve context through nested async calls', () => {
      TenantContext.run('tenant-main', async () => {
        const level1 = TenantContext.getTenantId();
        expect(level1).toBe('tenant-main');

        await new Promise((resolve) => setTimeout(resolve, 1));

        const level2 = TenantContext.getTenantId();
        expect(level2).toBe('tenant-main');

        await asyncFunction();

        const level3 = TenantContext.getTenantId();
        expect(level3).toBe('tenant-main');
      });

      async function asyncFunction() {
        const id = TenantContext.getTenantId();
        expect(id).toBe('tenant-main');
        return id;
      }
    });
  });

  describe('hasContext', () => {
    it('should return true when context is set', () => {
      TenantContext.run('tenant-123', () => {
        expect(TenantContext.hasContext()).toBe(true);
      });
    });

    it('should return false when context is not set', () => {
      expect(TenantContext.hasContext()).toBe(false);
    });
  });

  describe('requireTenantId', () => {
    it('should return tenant ID when context is set', () => {
      TenantContext.run('tenant-123', () => {
        const tenantId = TenantContext.requireTenantId();
        expect(tenantId).toBe('tenant-123');
      });
    });

    it('should throw error when context is not set', () => {
      expect(() => {
        TenantContext.requireTenantId();
      }).toThrow('No tenant context found in current async context');
    });
  });

  describe('multiple tenants', () => {
    it('should handle switching between tenant contexts', () => {
      TenantContext.run('tenant-A', () => {
        expect(TenantContext.getTenantId()).toBe('tenant-A');

        TenantContext.run('tenant-B', () => {
          expect(TenantContext.getTenantId()).toBe('tenant-B');
        });

        // After inner context ends, outer context is restored
        expect(TenantContext.getTenantId()).toBe('tenant-A');
      });
    });
  });
});
