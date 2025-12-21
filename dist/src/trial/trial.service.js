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
var TrialService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrialService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
const client_1 = require("@prisma/client");
let TrialService = TrialService_1 = class TrialService {
    prisma;
    emailService;
    logger = new common_1.Logger(TrialService_1.name);
    constructor(prisma, emailService) {
        this.prisma = prisma;
        this.emailService = emailService;
    }
    async checkTrialsExpiring4Days() {
        this.logger.log('Running cron: Check trials expiring in 4 days');
        try {
            const now = new Date();
            const startOfDay = new Date(now);
            startOfDay.setDate(now.getDate() + 4);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(startOfDay);
            endOfDay.setHours(23, 59, 59, 999);
            const expiringSubscriptions = await this.prisma.subscription.findMany({
                where: {
                    status: client_1.SubscriptionStatus.TRIALING,
                    trialEnd: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
                include: {
                    accountant: {
                        include: {
                            user: true,
                            clients: true,
                        },
                    },
                },
            });
            this.logger.log(`Found ${expiringSubscriptions.length} trials expiring in 4 days`);
            for (const subscription of expiringSubscriptions) {
                const accountant = subscription.accountant;
                const user = accountant.user;
                const documentsCount = await this.prisma.document.count({
                    where: { createdById: user.id },
                });
                const paymentsCount = await this.prisma.payment.count({
                    where: {
                        client: {
                            accountantId: accountant.id,
                        },
                    },
                });
                await this.emailService.sendTrialExpiring4Days(user.email, {
                    accountantName: user.name,
                    companyName: accountant.companyName,
                    trialEndDate: subscription.trialEnd?.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                    }) || '',
                    daysRemaining: 4,
                    usage: {
                        clientsCount: accountant.clients.length,
                        documentsCount,
                        paymentsCount,
                    },
                    plansUrl: `${process.env.APP_URL || 'http://localhost:3001'}/pricing`,
                });
                this.logger.log(`Sent 4-day expiration email to ${user.email} (${accountant.companyName})`);
            }
        }
        catch (error) {
            this.logger.error('Error checking trials expiring in 4 days:', error);
        }
    }
    async checkTrialsExpiring1Day() {
        this.logger.log('Running cron: Check trials expiring in 1 day');
        try {
            const now = new Date();
            const startOfDay = new Date(now);
            startOfDay.setDate(now.getDate() + 1);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(startOfDay);
            endOfDay.setHours(23, 59, 59, 999);
            const expiringSubscriptions = await this.prisma.subscription.findMany({
                where: {
                    status: client_1.SubscriptionStatus.TRIALING,
                    trialEnd: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
                include: {
                    accountant: {
                        include: {
                            user: true,
                            clients: true,
                        },
                    },
                },
            });
            this.logger.log(`Found ${expiringSubscriptions.length} trials expiring in 1 day`);
            for (const subscription of expiringSubscriptions) {
                const accountant = subscription.accountant;
                const user = accountant.user;
                const documentsCount = await this.prisma.document.count({
                    where: { createdById: user.id },
                });
                const paymentsCount = await this.prisma.payment.count({
                    where: {
                        client: {
                            accountantId: accountant.id,
                        },
                    },
                });
                await this.emailService.sendTrialExpiring1Day(user.email, {
                    accountantName: user.name,
                    companyName: accountant.companyName,
                    trialEndDate: subscription.trialEnd?.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                    }) || '',
                    daysRemaining: 1,
                    usage: {
                        clientsCount: accountant.clients.length,
                        documentsCount,
                        paymentsCount,
                    },
                    plansUrl: `${process.env.APP_URL || 'http://localhost:3001'}/pricing`,
                });
                this.logger.log(`Sent 1-day expiration email to ${user.email} (${accountant.companyName})`);
            }
        }
        catch (error) {
            this.logger.error('Error checking trials expiring in 1 day:', error);
        }
    }
    async expireTrials() {
        this.logger.log('Running cron: Expire trials');
        try {
            const now = new Date();
            const expiredSubscriptions = await this.prisma.subscription.findMany({
                where: {
                    status: client_1.SubscriptionStatus.TRIALING,
                    trialEnd: {
                        lt: now,
                    },
                },
                include: {
                    accountant: {
                        include: {
                            user: true,
                        },
                    },
                },
            });
            this.logger.log(`Found ${expiredSubscriptions.length} expired trials`);
            for (const subscription of expiredSubscriptions) {
                const accountant = subscription.accountant;
                const user = accountant.user;
                await this.prisma.subscription.update({
                    where: { id: subscription.id },
                    data: { status: client_1.SubscriptionStatus.CANCELED },
                });
                await this.prisma.accountant.update({
                    where: { id: accountant.id },
                    data: { subscriptionStatus: client_1.SubscriptionStatus.CANCELED },
                });
                await this.emailService.sendTrialExpired(user.email, {
                    accountantName: user.name,
                    companyName: accountant.companyName,
                    plansUrl: `${process.env.APP_URL || 'http://localhost:3001'}/pricing`,
                });
                this.logger.log(`Expired trial for ${user.email} (${accountant.companyName})`);
            }
        }
        catch (error) {
            this.logger.error('Error expiring trials:', error);
        }
    }
};
exports.TrialService = TrialService;
__decorate([
    (0, schedule_1.Cron)('0 9 * * *', {
        name: 'check-trials-expiring-4-days',
        timeZone: 'America/Sao_Paulo',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TrialService.prototype, "checkTrialsExpiring4Days", null);
__decorate([
    (0, schedule_1.Cron)('0 9 * * *', {
        name: 'check-trials-expiring-1-day',
        timeZone: 'America/Sao_Paulo',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TrialService.prototype, "checkTrialsExpiring1Day", null);
__decorate([
    (0, schedule_1.Cron)('0 1 * * *', {
        name: 'expire-trials',
        timeZone: 'America/Sao_Paulo',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TrialService.prototype, "expireTrials", null);
exports.TrialService = TrialService = TrialService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService])
], TrialService);
//# sourceMappingURL=trial.service.js.map