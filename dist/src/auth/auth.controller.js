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
exports.UsersController = exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const register_dto_1 = require("./dto/register.dto");
const signup_dto_1 = require("./dto/signup.dto");
const password_reset_dto_1 = require("./dto/password-reset.dto");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const roles_guard_1 = require("./guards/roles.guard");
const roles_decorator_1 = require("./decorators/roles.decorator");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async login(loginDto) {
        return this.authService.login(loginDto);
    }
    async register(registerDto) {
        return this.authService.register(registerDto);
    }
    async registerAccountant(registerDto) {
        return this.authService.registerAccountant(registerDto);
    }
    async signup(signupDto) {
        return this.authService.signup(signupDto);
    }
    async refresh(refreshToken) {
        return this.authService.refreshAccessToken(refreshToken);
    }
    async logout(refreshToken) {
        return this.authService.logout(refreshToken);
    }
    async requestPasswordReset(dto) {
        return this.authService.requestPasswordReset(dto.email);
    }
    async resetPassword(dto) {
        return this.authService.resetPassword(dto.token, dto.newPassword);
    }
    async getProfile(req) {
        return this.authService.validateUser(req.user.id);
    }
    async completeOnboarding(req) {
        return this.authService.completeOnboarding(req.user.id);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, swagger_1.ApiOperation)({ summary: 'Login de usuário', description: 'Autentica usuário (contador ou cliente) e retorna tokens JWT' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Login bem-sucedido' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Credenciais inválidas' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({ summary: 'Registro de cliente', description: 'Cria novo usuário cliente' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Cliente criado com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'E-mail já cadastrado' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('register-accountant'),
    (0, swagger_1.ApiOperation)({ summary: 'Registro de contador', description: 'Cria novo usuário contador com período trial de 30 dias' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Contador criado com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'E-mail ou CNPJ já cadastrado' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterAccountantDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerAccountant", null);
__decorate([
    (0, common_1.Post)('signup'),
    (0, swagger_1.ApiOperation)({
        summary: 'Signup unificado',
        description: 'Cria novo usuário (INDIVIDUAL ou ACCOUNTANT_FIRM) com trial de 14 dias e subscription automática'
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Usuário criado com sucesso e retorna access token' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'E-mail ou CPF/CNPJ já cadastrado' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signup_dto_1.SignupDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signup", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, swagger_1.ApiOperation)({ summary: 'Renovar access token', description: 'Gera novo access token usando refresh token' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { refreshToken: { type: 'string' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Token renovado com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Refresh token inválido ou expirado' }),
    __param(0, (0, common_1.Body)('refreshToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, swagger_1.ApiOperation)({ summary: 'Logout', description: 'Invalida refresh token do usuário' }),
    (0, swagger_1.ApiBody)({ schema: { properties: { refreshToken: { type: 'string' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Logout realizado com sucesso' }),
    __param(0, (0, common_1.Body)('refreshToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('request-password-reset'),
    (0, swagger_1.ApiOperation)({ summary: 'Solicitar redefinição de senha', description: 'Envia link de redefinição de senha para o e-mail (dev: imprime no console)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Solicitação processada' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [password_reset_dto_1.RequestPasswordResetDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestPasswordReset", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, swagger_1.ApiOperation)({ summary: 'Redefinir senha', description: 'Redefine senha usando token recebido por e-mail' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Senha redefinida com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Token inválido ou expirado' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [password_reset_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Obter perfil do usuário autenticado', description: 'Retorna dados do usuário logado' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Perfil retornado com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Não autenticado' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ACCOUNTANT'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('complete-onboarding'),
    (0, swagger_1.ApiOperation)({ summary: 'Completar onboarding', description: 'Marca o onboarding do contador como concluído' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Onboarding completado com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Não autenticado' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Acesso negado - apenas contadores' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "completeOnboarding", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
let UsersController = class UsersController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async getOnboardingProgress(req) {
        return this.authService.getOnboardingProgress(req.user.id);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ACCOUNTANT'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('me/onboarding-progress'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obter progresso do onboarding',
        description: 'Retorna o progresso das tarefas de onboarding do contador'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Progresso retornado com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Não autenticado' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Acesso negado - apenas contadores' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getOnboardingProgress", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, swagger_1.ApiTags)('users'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], UsersController);
//# sourceMappingURL=auth.controller.js.map