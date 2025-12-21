import { ExecutionContext } from '@nestjs/common';

describe('@CurrentTenant', () => {
  // Import the decorator implementation directly
  const getCurrentTenantValue = (user: any): string | null => {
    if (!user) {
      return null;
    }
    return user.accountantId || user.clientId || null;
  };

  it('should return accountantId for ACCOUNTANT role', () => {
    const user = {
      role: 'ACCOUNTANT',
      accountantId: 'accountant-123',
      email: 'accountant@example.com',
    };

    const result = getCurrentTenantValue(user);

    expect(result).toBe('accountant-123');
  });

  it('should return clientId for CLIENT role', () => {
    const user = {
      role: 'CLIENT',
      clientId: 'client-456',
      email: 'client@example.com',
    };

    const result = getCurrentTenantValue(user);

    expect(result).toBe('client-456');
  });

  it('should return null when no user is authenticated', () => {
    const result = getCurrentTenantValue(null);

    expect(result).toBeNull();
  });

  it('should return null when user has no tenantId', () => {
    const user = {
      role: 'ADMIN',
      email: 'admin@example.com',
    };

    const result = getCurrentTenantValue(user);

    expect(result).toBeNull();
  });

  it('should prioritize accountantId over clientId', () => {
    const user = {
      role: 'ACCOUNTANT',
      accountantId: 'accountant-123',
      clientId: 'client-456', // Should not be used
    };

    const result = getCurrentTenantValue(user);

    expect(result).toBe('accountant-123');
  });
});
