export declare class TenantContext {
    private static storage;
    static setTenantId(tenantId: string): void;
    static getTenantId(): string | null;
    static run<T>(tenantId: string, callback: () => T): T;
    static hasContext(): boolean;
    static requireTenantId(): string;
}
