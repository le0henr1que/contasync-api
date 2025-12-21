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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const subscriptions_service_1 = require("./subscriptions.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const create_checkout_dto_1 = require("./dto/create-checkout.dto");
const upgrade_plan_dto_1 = require("./dto/upgrade-plan.dto");
const cancel_subscription_dto_1 = require("./dto/cancel-subscription.dto");
let SubscriptionsController = class SubscriptionsController {
    subscriptionsService;
    constructor(subscriptionsService) {
        this.subscriptionsService = subscriptionsService;
    }
    async getMySubscription(req) {
        const accountantId = req.user.accountantId;
        return this.subscriptionsService.getSubscription(accountantId);
    }
    async getMyUsage(req) {
        const accountantId = req.user.accountantId;
        return this.subscriptionsService.getUsage(accountantId);
    }
    async createCheckout(req, createCheckoutDto) {
        const accountantId = req.user.accountantId;
        return this.subscriptionsService.createCheckoutSession(accountantId, createCheckoutDto);
    }
    async upgradePlan(req, upgradePlanDto) {
        const accountantId = req.user.accountantId;
        return this.subscriptionsService.upgradePlan(accountantId, upgradePlanDto);
    }
    async downgradePlan(req, downgradePlanDto) {
        const accountantId = req.user.accountantId;
        return this.subscriptionsService.downgradePlan(accountantId, downgradePlanDto);
    }
    async cancelSubscription(req, cancelDto) {
        const accountantId = req.user.accountantId;
        return this.subscriptionsService.cancelSubscription(accountantId, cancelDto);
    }
    async createPortal(req, returnUrl) {
        const accountantId = req.user.accountantId;
        return this.subscriptionsService.createPortalSession(accountantId, returnUrl);
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Get)('me'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getMySubscription", null);
__decorate([
    (0, common_1.Get)('me/usage'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getMyUsage", null);
__decorate([
    (0, common_1.Post)('checkout'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_checkout_dto_1.CreateCheckoutDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "createCheckout", null);
__decorate([
    (0, common_1.Post)('upgrade'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upgrade_plan_dto_1.UpgradePlanDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "upgradePlan", null);
__decorate([
    (0, common_1.Post)('downgrade'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upgrade_plan_dto_1.UpgradePlanDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "downgradePlan", null);
__decorate([
    (0, common_1.Post)('cancel'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cancel_subscription_dto_1.CancelSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "cancelSubscription", null);
__decorate([
    (0, common_1.Post)('portal'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('returnUrl')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "createPortal", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, common_1.Controller)('subscriptions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [subscriptions_service_1.SubscriptionsService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map