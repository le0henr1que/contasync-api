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
var RecurringPaymentsCron_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecurringPaymentsCron = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../prisma/prisma.service");
const date_fns_1 = require("date-fns");
let RecurringPaymentsCron = RecurringPaymentsCron_1 = class RecurringPaymentsCron {
    prisma;
    logger = new common_1.Logger(RecurringPaymentsCron_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateRecurringPayments() {
        this.logger.log('Starting recurring payments generation...');
        try {
            const today = (0, date_fns_1.startOfDay)(new Date());
            const sevenDaysFromNow = new Date(today);
            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
            const recurringPayments = await this.prisma.payment.findMany({
                where: {
                    isRecurring: true,
                    parentPaymentId: null,
                    OR: [
                        { recurringEndDate: null },
                        { recurringEndDate: { gte: today } },
                    ],
                },
                include: {
                    client: true,
                    childPayments: {
                        orderBy: { dueDate: 'desc' },
                        take: 1,
                    },
                },
            });
            this.logger.log(`Found ${recurringPayments.length} active recurring payments`);
            let generatedCount = 0;
            let skippedCount = 0;
            let errorCount = 0;
            for (const template of recurringPayments) {
                try {
                    if (template.clientId && template.client?.deletedAt) {
                        this.logger.warn(`Skipping payment ${template.id} - client ${template.clientId} is deleted`);
                        skippedCount++;
                        continue;
                    }
                    const nextDueDate = this.calculateNextDueDate(template.childPayments[0]?.dueDate || template.dueDate, template.recurringFrequency, template.recurringDayOfMonth);
                    const existingPayment = await this.prisma.payment.findFirst({
                        where: {
                            parentPaymentId: template.id,
                            dueDate: nextDueDate,
                        },
                    });
                    if (existingPayment) {
                        this.logger.debug(`Payment for template ${template.id} with due date ${nextDueDate.toISOString()} already exists`);
                        skippedCount++;
                        continue;
                    }
                    if ((0, date_fns_1.isAfter)(nextDueDate, sevenDaysFromNow)) {
                        this.logger.debug(`Next due date ${nextDueDate.toISOString()} for template ${template.id} is more than 7 days away`);
                        skippedCount++;
                        continue;
                    }
                    if (template.recurringEndDate && (0, date_fns_1.isAfter)(nextDueDate, template.recurringEndDate)) {
                        this.logger.log(`Template ${template.id} has reached its end date. Marking as non-recurring.`);
                        await this.prisma.payment.update({
                            where: { id: template.id },
                            data: { isRecurring: false },
                        });
                        skippedCount++;
                        continue;
                    }
                    const newPayment = await this.prisma.payment.create({
                        data: {
                            accountantId: template.accountantId,
                            clientId: template.clientId,
                            paymentType: template.paymentType,
                            title: template.title,
                            amount: template.amount,
                            dueDate: nextDueDate,
                            paymentMethod: template.paymentMethod,
                            reference: template.reference,
                            notes: template.notes
                                ? `${template.notes}\n\n[Gerado automaticamente de recorrência]`
                                : '[Gerado automaticamente de recorrência]',
                            status: 'PENDING',
                            isRecurring: false,
                            parentPaymentId: template.id,
                        },
                    });
                    this.logger.log(`Generated payment ${newPayment.id} from template ${template.id} with due date ${nextDueDate.toISOString()}`);
                    generatedCount++;
                }
                catch (error) {
                    this.logger.error(`Error generating payment from template ${template.id}: ${error.message}`, error.stack);
                    errorCount++;
                }
            }
            this.logger.log(`Recurring payments generation completed. Generated: ${generatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
        }
        catch (error) {
            this.logger.error(`Fatal error during recurring payments generation: ${error.message}`, error.stack);
        }
    }
    calculateNextDueDate(lastDueDate, frequency, dayOfMonth) {
        let nextDate;
        switch (frequency) {
            case 'MONTHLY':
                nextDate = (0, date_fns_1.addMonths)(lastDueDate, 1);
                break;
            case 'QUARTERLY':
                nextDate = (0, date_fns_1.addMonths)(lastDueDate, 3);
                break;
            case 'SEMIANNUAL':
                nextDate = (0, date_fns_1.addMonths)(lastDueDate, 6);
                break;
            case 'YEARLY':
                nextDate = (0, date_fns_1.addYears)(lastDueDate, 1);
                break;
            default:
                throw new Error(`Unknown recurring frequency: ${frequency}`);
        }
        nextDate = (0, date_fns_1.setDate)(nextDate, dayOfMonth);
        return (0, date_fns_1.startOfDay)(nextDate);
    }
    async manualTrigger() {
        this.logger.log('Manual trigger initiated');
        await this.generateRecurringPayments();
    }
};
exports.RecurringPaymentsCron = RecurringPaymentsCron;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RecurringPaymentsCron.prototype, "generateRecurringPayments", null);
exports.RecurringPaymentsCron = RecurringPaymentsCron = RecurringPaymentsCron_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RecurringPaymentsCron);
//# sourceMappingURL=recurring-payments.cron.js.map