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
exports.DocumentRequestsController = void 0;
const common_1 = require("@nestjs/common");
const document_requests_service_1 = require("./document-requests.service");
const create_document_request_dto_1 = require("./dto/create-document-request.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let DocumentRequestsController = class DocumentRequestsController {
    documentRequestsService;
    constructor(documentRequestsService) {
        this.documentRequestsService = documentRequestsService;
    }
    async create(createDocumentRequestDto) {
        return this.documentRequestsService.create(createDocumentRequestDto);
    }
    async findClientRequests(req) {
        const clientId = req.user.client.id;
        return this.documentRequestsService.findClientRequests(clientId);
    }
};
exports.DocumentRequestsController = DocumentRequestsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ACCOUNTANT),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_document_request_dto_1.CreateDocumentRequestDto]),
    __metadata("design:returntype", Promise)
], DocumentRequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.CLIENT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DocumentRequestsController.prototype, "findClientRequests", null);
exports.DocumentRequestsController = DocumentRequestsController = __decorate([
    (0, common_1.Controller)('document-requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [document_requests_service_1.DocumentRequestsService])
], DocumentRequestsController);
//# sourceMappingURL=document-requests.controller.js.map