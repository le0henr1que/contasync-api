"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let TenantGuard = class TenantGuard {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException('Authentication required');
        }
        const resourceTenantId = request.params.tenantId || request.params.clientId || request.query.tenantId || request.query.clientId;
        if (!resourceTenantId) {
            return true;
        }
        const userTenantId = user.accountantId || user.clientId;
        if (!userTenantId) {
            throw new common_1.ForbiddenException('Tenant context not found');
        }
        if (resourceTenantId === userTenantId) {
            return true;
        }
        if (user.role === 'ACCOUNTANT') {
            const client = await this.prisma.client.findFirst({
                where: {
                    id: resourceTenantId,
                    accountantId: userTenantId,
                },
            });
            if (client) {
                return true;
            }
        }
        throw new common_1.ForbiddenException('Tenant access denied');
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantGuard);
//# sourceMappingURL=tenant.guard.js.map