"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const subscriptions_service_1 = require("../subscriptions/subscriptions.service");
const signup_dto_1 = require("./dto/signup.dto");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
let AuthService = class AuthService {
    prisma;
    jwtService;
    subscriptionsService;
    constructor(prisma, jwtService, subscriptionsService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.subscriptionsService = subscriptionsService;
    }
    async login(loginDto) {
        const { email, password, rememberMe } = loginDto;
        const user = await this.prisma.user.findUnique({
            where: { email },
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
                client: true,
            },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('E-mail ou senha incorretos');
        }
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('E-mail ou senha incorretos');
        }
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        if (user.accountant) {
            payload.accountantId = user.accountant.id;
            payload.subscriptionStatus = user.accountant.subscriptionStatus;
        }
        if (user.client) {
            payload.clientId = user.client.id;
        }
        const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });
        const refreshToken = await this.createRefreshToken(user.id, rememberMe);
        let subscriptionInfo = null;
        if (user.accountant?.subscription) {
            const sub = user.accountant.subscription;
            subscriptionInfo = {
                id: sub.id,
                status: sub.status,
                interval: sub.interval,
                currentPeriodStart: sub.currentPeriodStart,
                currentPeriodEnd: sub.currentPeriodEnd,
                cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
                trialEnd: sub.trialEnd,
                plan: sub.plan ? {
                    id: sub.plan.id,
                    name: sub.plan.name,
                    slug: sub.plan.slug,
                    description: sub.plan.description,
                    tenantType: sub.plan.tenantType,
                    priceMonthly: sub.plan.priceMonthly,
                    priceYearly: sub.plan.priceYearly,
                    stripePriceIdMonthly: sub.plan.stripePriceIdMonthly,
                    stripePriceIdYearly: sub.plan.stripePriceIdYearly,
                    limitsJson: sub.plan.limitsJson,
                    featuresJson: sub.plan.featuresJson,
                } : null,
            };
        }
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                accountantId: user.accountant?.id,
                clientId: user.client?.id,
                expenseModuleEnabled: user.client?.expenseModuleEnabled ?? false,
                subscriptionStatus: user.accountant?.subscriptionStatus,
                trialEndsAt: user.accountant?.trialEndsAt,
                subscription: subscriptionInfo,
            },
        };
    }
    async register(registerDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: registerDto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Este e-mail já está cadastrado');
        }
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: registerDto.email,
                passwordHash: hashedPassword,
                name: registerDto.name,
                role: registerDto.role || client_1.Role.CLIENT,
            },
        });
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        };
    }
    async registerAccountant(registerDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: registerDto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Este e-mail já está cadastrado');
        }
        const existingCnpj = await this.prisma.accountant.findUnique({
            where: { cnpj: registerDto.cnpj },
        });
        if (existingCnpj) {
            throw new common_1.ConflictException('Este CNPJ já está cadastrado');
        }
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: registerDto.email,
                passwordHash: hashedPassword,
                name: registerDto.name,
                role: client_1.Role.ACCOUNTANT,
                accountant: {
                    create: {
                        companyName: registerDto.companyName,
                        cnpj: registerDto.cnpj,
                        crc: registerDto.crc,
                        phone: registerDto.phone,
                        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    },
                },
            },
            include: {
                accountant: true,
            },
        });
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            accountantId: user.accountant?.id,
        };
    }
    async signup(signupDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: signupDto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Este e-mail já está cadastrado');
        }
        const hashedPassword = await bcrypt.hash(signupDto.password, 10);
        let selectedPlan;
        if (signupDto.planId) {
            selectedPlan = await this.prisma.plan.findUnique({
                where: { id: signupDto.planId },
            });
            if (!selectedPlan || !selectedPlan.isActive) {
                throw new common_1.ConflictException('Plano selecionado não encontrado ou inativo.');
            }
        }
        else {
            const trialSlug = signupDto.type === signup_dto_1.TenantType.ACCOUNTANT_FIRM ? 'firm-trial' : 'individual-free-trial';
            selectedPlan = await this.prisma.plan.findFirst({
                where: {
                    tenantType: signupDto.type,
                    slug: trialSlug,
                    isActive: true,
                },
            });
            if (!selectedPlan) {
                throw new common_1.ConflictException('Plano trial não encontrado. Contate o suporte.');
            }
        }
        const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        const currentPeriodStart = new Date();
        const currentPeriodEnd = trialEndsAt;
        if (signupDto.type === signup_dto_1.TenantType.ACCOUNTANT_FIRM) {
            if (!signupDto.cpfCnpj || !signupDto.companyName) {
                throw new common_1.ConflictException('CNPJ e Nome da Empresa são obrigatórios para contadores');
            }
            const existingCnpj = await this.prisma.accountant.findUnique({
                where: { cnpj: signupDto.cpfCnpj },
            });
            if (existingCnpj) {
                throw new common_1.ConflictException('Este CNPJ já está cadastrado');
            }
            const user = await this.prisma.user.create({
                data: {
                    email: signupDto.email,
                    passwordHash: hashedPassword,
                    name: signupDto.name,
                    role: client_1.Role.ACCOUNTANT,
                    accountant: {
                        create: {
                            companyName: signupDto.companyName,
                            cnpj: signupDto.cpfCnpj,
                            crc: '',
                            phone: null,
                            trialEndsAt,
                            subscriptionStatus: client_1.SubscriptionStatus.TRIALING,
                            subscription: {
                                create: {
                                    planId: selectedPlan.id,
                                    status: client_1.SubscriptionStatus.TRIALING,
                                    interval: 'MONTHLY',
                                    currentPeriodStart,
                                    currentPeriodEnd,
                                    trialEnd: trialEndsAt,
                                    cancelAtPeriodEnd: false,
                                },
                            },
                        },
                    },
                },
                include: {
                    accountant: {
                        include: {
                            subscription: true,
                        },
                    },
                },
            });
            const payload = {
                sub: user.id,
                email: user.email,
                role: user.role,
                accountantId: user.accountant?.id,
                subscriptionStatus: user.accountant?.subscriptionStatus,
            };
            const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });
            let checkoutUrl;
            if (selectedPlan.stripePriceIdMonthly || selectedPlan.stripePriceIdYearly) {
                try {
                    const checkoutSession = await this.subscriptionsService.createCheckoutSession(user.accountant.id, {
                        planId: selectedPlan.id,
                        successUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/billing?session_id={CHECKOUT_SESSION_ID}`,
                        cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/billing`,
                    });
                    checkoutUrl = checkoutSession.url;
                }
                catch (error) {
                    console.error('Error creating Stripe checkout session during signup:', error);
                }
            }
            else {
                console.log(`⚠️  Stripe checkout skipped - Plan "${selectedPlan.name}" has no Stripe price IDs configured`);
            }
            return {
                accessToken,
                checkoutUrl,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    accountantId: user.accountant?.id,
                    subscriptionStatus: user.accountant?.subscriptionStatus,
                    trialEndsAt: user.accountant?.trialEndsAt,
                },
            };
        }
        else {
            throw new common_1.ConflictException('Cadastro de clientes individuais ainda não implementado. Use o convite do contador.');
        }
    }
    async refreshAccessToken(refreshToken) {
        const storedToken = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: { include: { accountant: true, client: true } } },
        });
        if (!storedToken || storedToken.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Token inválido ou expirado');
        }
        const user = storedToken.user;
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        if (user.accountant) {
            payload.accountantId = user.accountant.id;
            payload.subscriptionStatus = user.accountant.subscriptionStatus;
        }
        if (user.client) {
            payload.clientId = user.client.id;
        }
        const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });
        return { accessToken };
    }
    async logout(refreshToken) {
        await this.prisma.refreshToken.deleteMany({
            where: { token: refreshToken },
        });
        return { message: 'Logout realizado com sucesso' };
    }
    async validateUser(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                accountant: true,
                client: true,
            },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Usuário não encontrado');
        }
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            accountant: user.accountant,
            client: user.client,
            accountantId: user.accountant?.id,
            clientId: user.client?.id,
            expenseModuleEnabled: user.client?.expenseModuleEnabled ?? false,
            onboardingCompleted: user.accountant?.onboardingCompleted ?? true,
        };
    }
    async completeOnboarding(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { accountant: true },
        });
        if (!user?.accountant) {
            throw new common_1.UnauthorizedException('Usuário não é um contador');
        }
        await this.prisma.accountant.update({
            where: { id: user.accountant.id },
            data: { onboardingCompleted: true },
        });
        return { message: 'Onboarding completado com sucesso' };
    }
    async getOnboardingProgress(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                accountant: {
                    include: {
                        clients: true,
                    },
                },
            },
        });
        if (!user?.accountant) {
            throw new common_1.UnauthorizedException('Usuário não é um contador');
        }
        const hasAddedClient = user.accountant.clients.length > 0;
        const documentsCount = await this.prisma.document.count({
            where: {
                createdById: userId,
            },
        });
        const hasUploadedDocument = documentsCount > 0;
        const paymentsCount = await this.prisma.payment.count({
            where: {
                client: {
                    accountantId: user.accountant.id,
                },
            },
        });
        const hasRegisteredPayment = paymentsCount > 0;
        const hasCompletedProfile = !!(user.accountant.companyName && user.accountant.cnpj);
        const tasks = {
            hasAddedClient,
            hasUploadedDocument,
            hasRegisteredPayment,
            hasCompletedProfile,
        };
        const completedTasks = Object.values(tasks).filter(Boolean).length;
        const totalTasks = Object.keys(tasks).length;
        const completionPercentage = (completedTasks / totalTasks) * 100;
        return {
            onboardingCompleted: user.accountant.onboardingCompleted,
            tasks,
            completionPercentage,
        };
    }
    async requestPasswordReset(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return { message: 'Se o e-mail existir, um link de redefinição será enviado' };
        }
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await this.prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token,
                expiresAt,
            },
        });
        console.log(`📧 [DEV] Reset password link: http://localhost:3001/reset-password?token=${token}`);
        return { message: 'Se o e-mail existir, um link de redefinição será enviado' };
    }
    async resetPassword(token, newPassword) {
        const resetToken = await this.prisma.passwordResetToken.findUnique({
            where: { token },
            include: { user: true },
        });
        if (!resetToken) {
            throw new common_1.UnauthorizedException('Token inválido');
        }
        if (resetToken.used) {
            throw new common_1.UnauthorizedException('Token já foi utilizado');
        }
        if (resetToken.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Link expirado. Solicite um novo');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: resetToken.userId },
                data: { passwordHash: hashedPassword },
            }),
            this.prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true },
            }),
        ]);
        return { message: 'Senha redefinida com sucesso' };
    }
    async createRefreshToken(userId, rememberMe) {
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        const expirationTime = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const expiresAt = new Date(Date.now() + expirationTime);
        await this.prisma.refreshToken.create({
            data: {
                userId,
                token,
                expiresAt,
            },
        });
        return token;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => subscriptions_service_1.SubscriptionsService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        subscriptions_service_1.SubscriptionsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map