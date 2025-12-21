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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const payments_service_1 = require("./payments.service");
const query_payments_dto_1 = require("./dto/query-payments.dto");
const create_payment_dto_1 = require("./dto/create-payment.dto");
const update_payment_dto_1 = require("./dto/update-payment.dto");
const attach_document_dto_1 = require("./dto/attach-document.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const swagger_1 = require("@nestjs/swagger");
let PaymentsController = class PaymentsController {
    paymentsService;
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    async getMyPayments(queryDto, req) {
        const userId = req.user.id;
        const client = await this.paymentsService.getClientByUserId(userId);
        return this.paymentsService.findAllForClient(queryDto, client.id);
    }
    async getMyPayment(id, req) {
        const userId = req.user.id;
        const client = await this.paymentsService.getClientByUserId(userId);
        return this.paymentsService.findOneForClient(id, client.id);
    }
    async uploadMyReceipt(id, file, req) {
        if (!file) {
            throw new common_1.BadRequestException('Nenhum arquivo foi enviado');
        }
        const userId = req.user.id;
        const client = await this.paymentsService.getClientByUserId(userId);
        return this.paymentsService.uploadReceiptForClient(id, file, client.id);
    }
    async getStatistics(req) {
        const accountantId = req.user.accountant.id;
        return this.paymentsService.getStatistics(accountantId);
    }
    async findByClient(clientId, queryDto, req) {
        const accountantId = req.user.accountant.id;
        const queryWithClient = { ...queryDto, clientId };
        return this.paymentsService.findAll(queryWithClient, accountantId);
    }
    async findAll(queryDto, req) {
        const accountantId = req.user.accountant.id;
        return this.paymentsService.findAll(queryDto, accountantId);
    }
    async findOne(id, req) {
        const accountantId = req.user.accountant.id;
        return this.paymentsService.findOne(id, accountantId);
    }
    async create(createPaymentDto, req) {
        const accountantId = req.user.accountant.id;
        return this.paymentsService.create(createPaymentDto, accountantId);
    }
    async update(id, updatePaymentDto, req) {
        const accountantId = req.user.accountant.id;
        return this.paymentsService.update(id, updatePaymentDto, accountantId);
    }
    async uploadReceipt(id, file, req) {
        if (!file) {
            throw new common_1.BadRequestException('Nenhum arquivo foi enviado');
        }
        const accountantId = req.user.accountant.id;
        return this.paymentsService.uploadReceipt(id, file, accountantId);
    }
    async delete(id, req) {
        const accountantId = req.user.accountant.id;
        return this.paymentsService.delete(id, accountantId);
    }
    async getRecurringPayments(req) {
        const accountantId = req.user.accountant.id;
        return this.paymentsService.findRecurringPayments(accountantId);
    }
    async cancelRecurrence(id, req) {
        const accountantId = req.user.accountant.id;
        return this.paymentsService.cancelRecurrence(id, accountantId);
    }
    async attachDocument(id, attachDocumentDto, req) {
        const accountantId = req.user.accountant.id;
        const userId = req.user.id;
        return this.paymentsService.attachDocument(id, attachDocumentDto.documentId, userId, accountantId);
    }
    async detachDocument(id, documentId, req) {
        const accountantId = req.user.accountant.id;
        return this.paymentsService.detachDocument(id, documentId, accountantId);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Get)('me'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_payments_dto_1.QueryPaymentsDto, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getMyPayments", null);
__decorate([
    (0, common_1.Get)('me/:id'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getMyPayment", null);
__decorate([
    (0, common_1.Patch)('me/:id/receipt'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: {
            fileSize: 10 * 1024 * 1024,
        },
        fileFilter: (req, file, cb) => {
            const allowedMimes = [
                'application/pdf',
                'image/jpeg',
                'image/jpg',
                'image/png',
            ];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Tipo de arquivo inválido. Apenas PDF, JPG e PNG são permitidos.'), false);
            }
        },
    })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "uploadMyReceipt", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)('client/:clientId'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Param)('clientId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_payments_dto_1.QueryPaymentsDto, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "findByClient", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_payments_dto_1.QueryPaymentsDto, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_payment_dto_1.CreatePaymentDto, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_payment_dto_1.UpdatePaymentDto, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/receipt'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: {
            fileSize: 10 * 1024 * 1024,
        },
        fileFilter: (req, file, cb) => {
            const allowedMimes = [
                'application/pdf',
                'image/jpeg',
                'image/jpg',
                'image/png',
            ];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Tipo de arquivo inválido. Apenas PDF, JPG e PNG são permitidos.'), false);
            }
        },
    })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "uploadReceipt", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)('recurring/list'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getRecurringPayments", null);
__decorate([
    (0, common_1.Post)(':id/cancel-recurrence'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "cancelRecurrence", null);
__decorate([
    (0, common_1.Post)(':id/attach-document'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    (0, swagger_1.ApiOperation)({ summary: 'Attach a document to a payment' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Document attached successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Payment or document not found' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Document already attached' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, attach_document_dto_1.AttachDocumentDto, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "attachDocument", null);
__decorate([
    (0, common_1.Delete)(':id/detach-document/:documentId'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    (0, swagger_1.ApiOperation)({ summary: 'Detach a document from a payment' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Document detached successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Payment or attachment not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('documentId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "detachDocument", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, swagger_1.ApiTags)('payments'),
    (0, common_1.Controller)('payments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map