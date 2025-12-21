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
exports.ClientsController = void 0;
const common_1 = require("@nestjs/common");
const clients_service_1 = require("./clients.service");
const create_client_dto_1 = require("./dto/create-client.dto");
const update_client_dto_1 = require("./dto/update-client.dto");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const activity_log_service_1 = require("../activity-log/activity-log.service");
let ClientsController = class ClientsController {
    clientsService;
    activityLogService;
    constructor(clientsService, activityLogService) {
        this.clientsService = clientsService;
        this.activityLogService = activityLogService;
    }
    async getMyProfile(req) {
        const userId = req.user.id;
        return this.clientsService.findByUserId(userId);
    }
    async getMyStatistics(req) {
        const userId = req.user.id;
        const client = await this.clientsService.findByUserId(userId);
        return this.clientsService.getStatistics(client.id);
    }
    async getAccountantPlan(req) {
        const userId = req.user.id;
        const client = await this.clientsService.findByUserId(userId);
        return this.clientsService.getAccountantPlan(client.id);
    }
    async getMyUsage(req) {
        const userId = req.user.id;
        const client = await this.clientsService.findByUserId(userId);
        return this.clientsService.getClientUsage(client.id);
    }
    async updateMyProfile(updateProfileDto, req) {
        const userId = req.user.id;
        return this.clientsService.updateProfile(updateProfileDto, userId);
    }
    async create(createClientDto, req) {
        const accountantId = req.user.accountant.id;
        const userId = req.user.id;
        return this.clientsService.create(createClientDto, accountantId, userId);
    }
    async findAll(req) {
        const accountantId = req.user.accountant.id;
        return this.clientsService.findAll(accountantId);
    }
    async findOne(id, req) {
        const accountantId = req.user.accountant.id;
        return this.clientsService.findOne(id, accountantId);
    }
    async update(id, updateClientDto, req) {
        const accountantId = req.user.accountant.id;
        const userId = req.user.id;
        return this.clientsService.update(id, updateClientDto, accountantId, userId);
    }
    async remove(id, req) {
        const accountantId = req.user.accountant.id;
        const userId = req.user.id;
        return this.clientsService.remove(id, accountantId, userId);
    }
    async getClientActivities(id, page = '1', limit = '20', req) {
        const accountantId = req.user.accountant.id;
        await this.clientsService.findOne(id, accountantId);
        return this.activityLogService.getClientActivityLogs(id, parseInt(page, 10), parseInt(limit, 10));
    }
};
exports.ClientsController = ClientsController;
__decorate([
    (0, common_1.Get)('me'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Get)('me/statistics'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "getMyStatistics", null);
__decorate([
    (0, common_1.Get)('me/accountant-plan'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "getAccountantPlan", null);
__decorate([
    (0, common_1.Get)('me/usage'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "getMyUsage", null);
__decorate([
    (0, common_1.Patch)('me/profile'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_profile_dto_1.UpdateProfileDto, Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "updateMyProfile", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_client_dto_1.CreateClientDto, Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_client_dto_1.UpdateClientDto, Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/activities'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "getClientActivities", null);
exports.ClientsController = ClientsController = __decorate([
    (0, common_1.Controller)('clients'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [clients_service_1.ClientsService,
        activity_log_service_1.ActivityLogService])
], ClientsController);
//# sourceMappingURL=clients.controller.js.map