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
exports.PlanLimitsGuard = exports.ResourceType = exports.RESOURCE_TYPE_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const prisma_service_1 = require("../../prisma/prisma.service");
exports.RESOURCE_TYPE_KEY = 'resourceType';
var ResourceType;
(function (ResourceType) {
    ResourceType["PAYMENT"] = "payment";
    ResourceType["EXPENSE"] = "expense";
    ResourceType["DOCUMENT"] = "document";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
let PlanLimitsGuard = class PlanLimitsGuard {
    reflector;
    prisma;
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const resourceType = this.reflector.get(exports.RESOURCE_TYPE_KEY, context.getHandler());
        if (!resourceType) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user || user.role !== 'CLIENT') {
            return true;
        }
        const client = await this.prisma.client.findUnique({
            where: { userId: user.id },
            include: {
                accountant: {
                    include: {
                        subscription: {
                            include: {
                                plan: true,
                            },
                        },
                    },
                },
            },
        });
        if (!client || !client.accountant) {
            return true;
        }
        const subscription = client.accountant.subscription;
        if (!subscription || !subscription.plan) {
            return true;
        }
        const limitsJson = subscription.plan.limitsJson;
        if (!limitsJson) {
            return true;
        }
        switch (resourceType) {
            case ResourceType.PAYMENT:
                return this.checkPaymentLimit(client.id, limitsJson.maxPayments);
            case ResourceType.EXPENSE:
                return this.checkExpenseLimit(client.id, limitsJson.maxExpenses);
            case ResourceType.DOCUMENT:
                return this.checkDocumentLimit(client.id, limitsJson.maxDocuments);
            default:
                return true;
        }
    }
    async checkPaymentLimit(clientId, maxPayments) {
        if (!maxPayments)
            return true;
        const count = await this.prisma.payment.count({
            where: { clientId },
        });
        if (count >= maxPayments) {
            throw new common_1.ForbiddenException('Limite de pagamentos atingido. Contate seu contador para fazer upgrade do plano.');
        }
        return true;
    }
    async checkExpenseLimit(clientId, maxExpenses) {
        if (!maxExpenses)
            return true;
        const count = await this.prisma.expense.count({
            where: { clientId },
        });
        if (count >= maxExpenses) {
            throw new common_1.ForbiddenException('Limite de despesas atingido. Contate seu contador para fazer upgrade do plano.');
        }
        return true;
    }
    async checkDocumentLimit(clientId, maxDocuments) {
        if (!maxDocuments)
            return true;
        const count = await this.prisma.document.count({
            where: { clientId, deletedAt: null },
        });
        if (count >= maxDocuments) {
            throw new common_1.ForbiddenException('Limite de documentos atingido. Contate seu contador para fazer upgrade do plano.');
        }
        return true;
    }
};
exports.PlanLimitsGuard = PlanLimitsGuard;
exports.PlanLimitsGuard = PlanLimitsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService])
], PlanLimitsGuard);
//# sourceMappingURL=plan-limits.guard.js.map