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
exports.DocumentFoldersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const document_folders_service_1 = require("./document-folders.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let DocumentFoldersController = class DocumentFoldersController {
    documentFoldersService;
    constructor(documentFoldersService) {
        this.documentFoldersService = documentFoldersService;
    }
    async findAll(req, queryDto) {
        let clientId;
        if (req.user.role === client_1.Role.CLIENT) {
            clientId = req.user.client.id;
        }
        else {
            return [];
        }
        return this.documentFoldersService.findAllByClient(clientId, queryDto);
    }
    async create(createFolderDto, req) {
        const clientId = req.user.client?.id;
        if (!clientId) {
            throw new Error('ClientId is required. This endpoint needs enhancement for accountant use case.');
        }
        return this.documentFoldersService.create(createFolderDto, clientId);
    }
    async update(id, updateFolderDto, req) {
        const clientId = req.user.client?.id;
        if (!clientId) {
            throw new Error('ClientId is required. This endpoint needs enhancement for accountant use case.');
        }
        return this.documentFoldersService.update(id, updateFolderDto, clientId);
    }
    async remove(id, req) {
        const clientId = req.user.client?.id;
        if (!clientId) {
            throw new Error('ClientId is required. This endpoint needs enhancement for accountant use case.');
        }
        return this.documentFoldersService.remove(id, clientId);
    }
};
exports.DocumentFoldersController = DocumentFoldersController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT, client_1.Role.ACCOUNTANT),
    (0, swagger_1.ApiOperation)({ summary: 'Listar pastas de documentos do cliente' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de pastas retornada com sucesso',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.QueryFoldersDto]),
    __metadata("design:returntype", Promise)
], DocumentFoldersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Criar pasta customizada' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Pasta criada com sucesso' }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Tipo conflita com pasta padrão',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateFolderDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentFoldersController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar pasta' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Pasta atualizada com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Pasta não encontrada' }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Não é possível alterar tipo de pasta padrão',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateFolderDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentFoldersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Remover pasta' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Pasta removida com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Pasta não encontrada' }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Não é possível remover pasta padrão com documentos',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentFoldersController.prototype, "remove", null);
exports.DocumentFoldersController = DocumentFoldersController = __decorate([
    (0, swagger_1.ApiTags)('document-folders'),
    (0, common_1.Controller)('document-folders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [document_folders_service_1.DocumentFoldersService])
], DocumentFoldersController);
//# sourceMappingURL=document-folders.controller.js.map