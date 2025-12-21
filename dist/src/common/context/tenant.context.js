"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantContext = void 0;
const async_hooks_1 = require("async_hooks");
class TenantContext {
    static storage = new async_hooks_1.AsyncLocalStorage();
    static setTenantId(tenantId) {
        const store = this.storage.getStore();
        if (store === undefined) {
            throw new Error('TenantContext.setTenantId() called outside of TenantContext.run()');
        }
    }
    static getTenantId() {
        return this.storage.getStore() ?? null;
    }
    static run(tenantId, callback) {
        return this.storage.run(tenantId, callback);
    }
    static hasContext() {
        return this.getTenantId() !== null;
    }
    static requireTenantId() {
        const tenantId = this.getTenantId();
        if (!tenantId) {
            throw new Error('No tenant context found in current async context');
        }
        return tenantId;
    }
}
exports.TenantContext = TenantContext;
//# sourceMappingURL=tenant.context.js.map