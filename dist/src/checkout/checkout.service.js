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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var CheckoutService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const stripe_1 = __importDefault(require("stripe"));
const bcrypt = __importStar(require("bcrypt"));
let CheckoutService = CheckoutService_1 = class CheckoutService {
    prisma;
    configService;
    logger = new common_1.Logger(CheckoutService_1.name);
    stripe;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        const stripeSecretKey = this.configService.get('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) {
            throw new Error('STRIPE_SECRET_KEY não configurada');
        }
        this.stripe = new stripe_1.default(stripeSecretKey, {
            apiVersion: '2025-12-15.clover',
        });
    }
    async createCheckoutSession(dto) {
        this.logger.log(`Creating checkout session for email: ${dto.email}`);
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingUser) {
            throw new common_1.BadRequestException('Já existe um usuário cadastrado com este email');
        }
        const existingAccountant = await this.prisma.accountant.findUnique({
            where: { cnpj: dto.cpfCnpj },
        });
        if (existingAccountant) {
            throw new common_1.BadRequestException('Já existe um escritório cadastrado com este CNPJ');
        }
        const plan = await this.prisma.plan.findUnique({
            where: { id: dto.planId },
        });
        if (!plan || !plan.isActive) {
            throw new common_1.NotFoundException('Plano não encontrado ou inativo');
        }
        const stripePriceId = dto.billingInterval === 'MONTHLY'
            ? plan.stripePriceIdMonthly
            : plan.stripePriceIdYearly;
        if (!stripePriceId) {
            throw new common_1.BadRequestException(`Plano não possui preço configurado para cobrança ${dto.billingInterval}`);
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const metadata = {
            email: dto.email,
            name: dto.name,
            passwordHash,
            cpfCnpj: dto.cpfCnpj,
            companyName: dto.companyName,
            crc: dto.crc,
            phone: dto.phone || '',
            planId: dto.planId,
            billingInterval: dto.billingInterval,
            flow: 'public_checkout',
        };
        const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3001');
        try {
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: stripePriceId,
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${frontendUrl}/checkout/cancel`,
                customer_email: dto.email,
                metadata,
                subscription_data: {
                    metadata,
                },
            });
            this.logger.log(`Checkout session created successfully: ${session.id}`);
            return {
                sessionId: session.id,
                checkoutUrl: session.url,
            };
        }
        catch (error) {
            this.logger.error(`Failed to create checkout session: ${error.message}`, error.stack);
            throw new common_1.BadRequestException('Erro ao criar sessão de checkout. Tente novamente.');
        }
    }
};
exports.CheckoutService = CheckoutService;
exports.CheckoutService = CheckoutService = CheckoutService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], CheckoutService);
//# sourceMappingURL=checkout.service.js.map