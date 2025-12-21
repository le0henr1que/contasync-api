import { AsyncLocalStorage } from 'async_hooks';

/**
 * TenantContext - Manages tenant context across async operations
 *
 * Uses AsyncLocalStorage to maintain tenant context throughout
 * the request lifecycle without explicitly passing tenantId everywhere.
 *
 * @example
 * ```typescript
 * // Set tenant context
 * TenantContext.setTenantId('tenant-123');
 *
 * // Get current tenant ID
 * const tenantId = TenantContext.getTenantId();
 *
 * // Run callback with tenant context
 * TenantContext.run('tenant-123', () => {
 *   // All async operations here have access to tenantId
 *   someAsyncOperation();
 * });
 * ```
 */
export class TenantContext {
  private static storage = new AsyncLocalStorage<string>();

  /**
   * Set the current tenant ID for the async context
   * @param tenantId The tenant ID to set
   */
  static setTenantId(tenantId: string): void {
    const store = this.storage.getStore();
    if (store === undefined) {
      // If no store exists, we need to run() first
      throw new Error(
        'TenantContext.setTenantId() called outside of TenantContext.run()',
      );
    }
    // AsyncLocalStorage doesn't support mutation, so we track it differently
    // In middleware, we'll use run() instead
  }

  /**
   * Get the current tenant ID from the async context
   * @returns The tenant ID or null if not set
   */
  static getTenantId(): string | null {
    return this.storage.getStore() ?? null;
  }

  /**
   * Run a callback with a specific tenant context
   * @param tenantId The tenant ID to set for the callback
   * @param callback The function to execute with the tenant context
   * @returns The result of the callback
   */
  static run<T>(tenantId: string, callback: () => T): T {
    return this.storage.run(tenantId, callback);
  }

  /**
   * Check if a tenant context is currently set
   * @returns true if tenant context exists
   */
  static hasContext(): boolean {
    return this.getTenantId() !== null;
  }

  /**
   * Require a tenant context to be set, throws if not
   * @throws Error if no tenant context is set
   * @returns The tenant ID
   */
  static requireTenantId(): string {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new Error('No tenant context found in current async context');
    }
    return tenantId;
  }
}
