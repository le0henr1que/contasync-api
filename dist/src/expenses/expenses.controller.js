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
exports.ExpensesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const expenses_service_1 = require("./expenses.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_tenant_decorator_1 = require("../common/decorators/current-tenant.decorator");
const client_1 = require("@prisma/client");
const query_expenses_dto_1 = require("./dto/query-expenses.dto");
const create_expense_dto_1 = require("./dto/create-expense.dto");
let ExpensesController = class ExpensesController {
    expensesService;
    constructor(expensesService) {
        this.expensesService = expensesService;
    }
    async exportMyExpensesToExcel(queryDto, req, res) {
        const userId = req.user.id;
        const client = await this.expensesService.getClientByUserId(userId);
        const data = await this.expensesService.findAllForClient(queryDto, client.id);
        const buffer = await this.expensesService.exportToExcel(data.expenses, req.user.name);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=despesas-${Date.now()}.xlsx`);
        res.send(buffer);
    }
    async exportMyExpensesToPDF(queryDto, req, res) {
        const userId = req.user.id;
        const client = await this.expensesService.getClientByUserId(userId);
        const data = await this.expensesService.findAllForClient(queryDto, client.id);
        const buffer = await this.expensesService.exportToPDF(data.expenses, req.user.name);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=despesas-${Date.now()}.pdf`);
        res.send(buffer);
    }
    async exportExpensesToExcel(queryDto, req, res) {
        const userId = req.user.id;
        const accountant = await this.expensesService.getAccountantByUserId(userId);
        const data = await this.expensesService.findAllForAccountant(queryDto, accountant.id);
        const buffer = await this.expensesService.exportToExcel(data.expenses);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=despesas-clientes-${Date.now()}.xlsx`);
        res.send(buffer);
    }
    async exportExpensesToPDF(queryDto, req, res) {
        const userId = req.user.id;
        const accountant = await this.expensesService.getAccountantByUserId(userId);
        const data = await this.expensesService.findAllForAccountant(queryDto, accountant.id);
        const buffer = await this.expensesService.exportToPDF(data.expenses);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=despesas-clientes-${Date.now()}.pdf`);
        res.send(buffer);
    }
    async getClientExpenses(clientId, queryDto, tenantId) {
        return this.expensesService.findAllForClient(queryDto, clientId);
    }
    async getMyExpenses(queryDto, req) {
        const userId = req.user.id;
        const client = await this.expensesService.getClientByUserId(userId);
        return this.expensesService.findAllForClient(queryDto, client.id);
    }
    async getMyExpense(id, req) {
        const userId = req.user.id;
        const client = await this.expensesService.getClientByUserId(userId);
        return this.expensesService.findOneForClient(id, client.id);
    }
    async createMyExpense(createExpenseDto, file, req) {
        const userId = req.user.id;
        const client = await this.expensesService.getClientByUserId(userId);
        return this.expensesService.createForClient(createExpenseDto, client.id, file);
    }
    async downloadReceipt(id, req, res) {
        const expense = await this.expensesService.findExpenseById(id);
        if (!expense || !expense.receiptPath) {
            throw new common_1.NotFoundException('Comprovante não encontrado');
        }
        const fs = require('fs');
        const path = require('path');
        if (!fs.existsSync(expense.receiptPath)) {
            throw new common_1.NotFoundException('Arquivo de comprovante não encontrado');
        }
        res.setHeader('Content-Type', expense.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment; filename=' + (expense.fileName || 'comprovante'));
        const fileStream = fs.createReadStream(expense.receiptPath);
        fileStream.pipe(res);
    }
    async getAllExpenses(queryDto, req) {
        const userId = req.user.id;
        const accountant = await this.expensesService.getAccountantByUserId(userId);
        return this.expensesService.findAllForAccountant(queryDto, accountant.id);
    }
    async getExpense(id, req) {
        const userId = req.user.id;
        const accountant = await this.expensesService.getAccountantByUserId(userId);
        return this.expensesService.findOneForAccountant(id, accountant.id);
    }
};
exports.ExpensesController = ExpensesController;
__decorate([
    (0, common_1.Get)('export/excel/me'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_expenses_dto_1.QueryExpensesDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "exportMyExpensesToExcel", null);
__decorate([
    (0, common_1.Get)('export/pdf/me'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_expenses_dto_1.QueryExpensesDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "exportMyExpensesToPDF", null);
__decorate([
    (0, common_1.Get)('export/excel'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_expenses_dto_1.QueryExpensesDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "exportExpensesToExcel", null);
__decorate([
    (0, common_1.Get)('export/pdf'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_expenses_dto_1.QueryExpensesDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "exportExpensesToPDF", null);
__decorate([
    (0, common_1.Get)('client/:clientId'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard),
    __param(0, (0, common_1.Param)('clientId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_expenses_dto_1.QueryExpensesDto, String]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "getClientExpenses", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_expenses_dto_1.QueryExpensesDto, Object]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "getMyExpenses", null);
__decorate([
    (0, common_1.Get)('me/:id'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "getMyExpense", null);
__decorate([
    (0, common_1.Post)('me'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('receipt')),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_expense_dto_1.CreateExpenseDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "createMyExpense", null);
__decorate([
    (0, common_1.Get)(':id/receipt'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT, client_1.Role.CLIENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "downloadReceipt", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_expenses_dto_1.QueryExpensesDto, Object]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "getAllExpenses", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "getExpense", null);
exports.ExpensesController = ExpensesController = __decorate([
    (0, common_1.Controller)('expenses'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [expenses_service_1.ExpensesService])
], ExpensesController);
//# sourceMappingURL=expenses.controller.js.map