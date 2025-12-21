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
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const documents_service_1 = require("./documents.service");
const query_documents_dto_1 = require("./dto/query-documents.dto");
const upload_document_dto_1 = require("./dto/upload-document.dto");
const request_document_dto_1 = require("./dto/request-document.dto");
const upload_response_dto_1 = require("./dto/upload-response.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let DocumentsController = class DocumentsController {
    documentsService;
    constructor(documentsService) {
        this.documentsService = documentsService;
    }
    async getMyDocuments(queryDto, req) {
        const userId = req.user.id;
        const client = await this.documentsService.getClientByUserId(userId);
        return this.documentsService.findAllForClient(queryDto, client.id);
    }
    async getMyDocumentsGrouped(queryDto, req) {
        const userId = req.user.id;
        const client = await this.documentsService.getClientByUserId(userId);
        return this.documentsService.findAllByClientGrouped(client.id, queryDto);
    }
    async uploadClientDocument(file, uploadDto, req) {
        if (!file) {
            throw new common_1.BadRequestException('Nenhum arquivo foi enviado');
        }
        const userId = req.user.id;
        const client = await this.documentsService.getClientByUserId(userId);
        const accountantId = client.accountantId;
        uploadDto.clientId = client.id;
        return this.documentsService.upload(uploadDto, file, userId, accountantId);
    }
    async findAll(queryDto, req) {
        const accountantId = req.user.accountant.id;
        return this.documentsService.findAll(queryDto, accountantId);
    }
    async getClientDocumentsGrouped(clientId, queryDto, req) {
        const accountantId = req.user.accountant.id;
        return this.documentsService.findAllByClientGroupedForAccountant(clientId, accountantId, queryDto);
    }
    async upload(file, uploadDto, req) {
        if (!file) {
            throw new common_1.BadRequestException('Nenhum arquivo foi enviado');
        }
        const userId = req.user.id;
        const accountantId = req.user.accountant.id;
        return this.documentsService.upload(uploadDto, file, userId, accountantId);
    }
    async requestDocument(requestDto, req) {
        const accountantId = req.user.accountant.id;
        return this.documentsService.requestDocument(requestDto, accountantId);
    }
    async getMyDocument(id, req) {
        const userId = req.user.id;
        const client = await this.documentsService.getClientByUserId(userId);
        return this.documentsService.findOneForClient(id, client.id);
    }
    async downloadMyDocument(id, req, res) {
        const userId = req.user.id;
        const client = await this.documentsService.getClientByUserId(userId);
        const { filePath, fileName, mimeType } = await this.documentsService.getDocumentFileForClient(id, client.id);
        const file = (0, fs_1.createReadStream)(filePath);
        res.set({
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${fileName}"`,
        });
        return new common_1.StreamableFile(file);
    }
    async findOne(id, req) {
        const accountantId = req.user.accountant.id;
        return this.documentsService.findOne(id, accountantId);
    }
    async download(id, req, res) {
        const accountantId = req.user.accountant.id;
        const { filePath, fileName, mimeType } = await this.documentsService.getDocumentFile(id, accountantId);
        const file = (0, fs_1.createReadStream)(filePath);
        res.set({
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${fileName}"`,
        });
        return new common_1.StreamableFile(file);
    }
    async uploadResponse(file, uploadDto, req) {
        if (!file) {
            throw new common_1.BadRequestException('Nenhum arquivo foi enviado');
        }
        const userId = req.user.id;
        const clientId = req.user.client.id;
        return this.documentsService.uploadResponse(uploadDto, file, userId, clientId);
    }
    async delete(id, req) {
        const accountantId = req.user.accountant.id;
        return this.documentsService.delete(id, accountantId);
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Get)('me'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_documents_dto_1.QueryDocumentsDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getMyDocuments", null);
__decorate([
    (0, common_1.Get)('me/grouped'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get client documents grouped by folders (Google Drive style)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns folders with documents inside' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_documents_dto_1.QueryDocumentsDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getMyDocumentsGrouped", null);
__decorate([
    (0, common_1.Post)('me'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Client uploads a document' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
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
                cb(new common_1.BadRequestException('Tipo de arquivo não permitido. Use PDF, JPG ou PNG.'), false);
            }
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upload_document_dto_1.UploadDocumentDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "uploadClientDocument", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_documents_dto_1.QueryDocumentsDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('client/:clientId/grouped'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    (0, swagger_1.ApiOperation)({ summary: 'Get specific client documents grouped by folders (for accountant)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns folders with documents inside' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Client not found' }),
    __param(0, (0, common_1.Param)('clientId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_documents_dto_1.QueryDocumentsDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getClientDocumentsGrouped", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
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
                cb(new common_1.BadRequestException('Tipo de arquivo não permitido. Use PDF, JPG ou PNG.'), false);
            }
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upload_document_dto_1.UploadDocumentDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "upload", null);
__decorate([
    (0, common_1.Post)('request'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_document_dto_1.RequestDocumentDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "requestDocument", null);
__decorate([
    (0, common_1.Get)('me/:id'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getMyDocument", null);
__decorate([
    (0, common_1.Get)('me/:id/download'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "downloadMyDocument", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "download", null);
__decorate([
    (0, common_1.Post)('upload-response'),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
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
                cb(new common_1.BadRequestException('Tipo de arquivo não permitido. Use PDF, JPG ou PNG.'), false);
            }
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upload_response_dto_1.UploadResponseDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "uploadResponse", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "delete", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, swagger_1.ApiTags)('documents'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('documents'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map