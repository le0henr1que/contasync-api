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
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
const limits_service_1 = require("../limits/limits.service");
const client_1 = require("@prisma/client");
const payment_type_enum_1 = require("./enums/payment-type.enum");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let PaymentsService = PaymentsService_1 = class PaymentsService {
    prisma;
    emailService;
    limitsService;
    logger = new common_1.Logger(PaymentsService_1.name);
    constructor(prisma, emailService, limitsService) {
        this.prisma = prisma;
        this.emailService = emailService;
        this.limitsService = limitsService;
    }
    async findAll(queryDto, accountantId) {
        const { search, status, type, clientId, period, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20, } = queryDto;
        const where = {
            accountantId,
        };
        if (status) {
            where.status = status;
        }
        if (type) {
            where.paymentType = type;
        }
        if (clientId) {
            where.clientId = clientId;
        }
        if (period) {
            const now = new Date();
            let periodStart = null;
            let periodEnd = now;
            switch (period) {
                case 'THIS_MONTH':
                    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'LAST_MONTH':
                    periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                    break;
                case 'THIS_YEAR':
                    periodStart = new Date(now.getFullYear(), 0, 1);
                    break;
                default:
                    periodStart = null;
            }
            if (periodStart) {
                where.createdAt = {
                    gte: periodStart,
                    lte: periodEnd,
                };
            }
        }
        if (startDate || endDate) {
            where.dueDate = {};
            if (startDate) {
                where.dueDate.gte = new Date(startDate);
            }
            if (endDate) {
                where.dueDate.lte = new Date(endDate);
            }
        }
        if (search) {
            where.OR = [
                { reference: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
                { client: { companyName: { contains: search, mode: 'insensitive' } } },
                { client: { user: { name: { contains: search, mode: 'insensitive' } } } },
            ];
        }
        const skip = (page - 1) * limit;
        const orderBy = {};
        orderBy[sortBy] = sortOrder;
        const [payments, total] = await Promise.all([
            this.prisma.payment.findMany({
                where,
                include: {
                    client: {
                        select: {
                            id: true,
                            companyName: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    attachedDocuments: {
                        include: {
                            document: {
                                select: {
                                    id: true,
                                    title: true,
                                    fileName: true,
                                    mimeType: true,
                                    fileSize: true,
                                },
                            },
                        },
                    },
                },
                orderBy,
                skip,
                take: limit,
            }),
            this.prisma.payment.count({ where }),
        ]);
        const totalSum = await this.prisma.payment.aggregate({
            where,
            _sum: {
                amount: true,
            },
        });
        return {
            payments,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            totalSum: totalSum._sum.amount || 0,
        };
    }
    async findOne(id, accountantId) {
        const payment = await this.prisma.payment.findFirst({
            where: {
                id,
                accountantId,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        companyName: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                accountant: {
                    select: {
                        id: true,
                        companyName: true,
                    },
                },
                attachedDocuments: {
                    include: {
                        document: {
                            include: {
                                folder: {
                                    select: {
                                        id: true,
                                        name: true,
                                        type: true,
                                        icon: true,
                                        color: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Pagamento não encontrado');
        }
        return payment;
    }
    async create(createPaymentDto, accountantId) {
        const paymentType = createPaymentDto.paymentType || payment_type_enum_1.PaymentType.CLIENT;
        if (paymentType === payment_type_enum_1.PaymentType.CLIENT && !createPaymentDto.clientId) {
            throw new common_1.BadRequestException('Pagamentos do tipo CLIENT precisam ter um cliente vinculado');
        }
        if (paymentType === payment_type_enum_1.PaymentType.OFFICE && createPaymentDto.clientId) {
            throw new common_1.BadRequestException('Pagamentos do tipo OFFICE não podem ter cliente vinculado');
        }
        if (createPaymentDto.isRecurring) {
            if (!createPaymentDto.recurringFrequency || !createPaymentDto.recurringDayOfMonth) {
                throw new common_1.BadRequestException('Pagamentos recorrentes precisam de frequência e dia do mês');
            }
        }
        let finalAccountantId = accountantId;
        let client = null;
        if (paymentType === payment_type_enum_1.PaymentType.CLIENT && createPaymentDto.clientId) {
            client = await this.prisma.client.findFirst({
                where: {
                    id: createPaymentDto.clientId,
                    deletedAt: null,
                },
            });
            if (!client) {
                throw new common_1.NotFoundException('Cliente não encontrado');
            }
            if (client.accountantId !== accountantId) {
                throw new common_1.ForbiddenException('Cliente não pertence a este contador');
            }
            finalAccountantId = client.accountantId;
            const limitCheck = await this.limitsService.checkPaymentLimit(createPaymentDto.clientId);
            if (!limitCheck.allowed) {
                throw new common_1.ForbiddenException({
                    message: limitCheck.message,
                    upgradeMessage: limitCheck.upgradeMessage,
                    usage: limitCheck.usage,
                });
            }
        }
        let status = client_1.PaymentStatus.PENDING;
        const now = new Date();
        const dueDate = new Date(createPaymentDto.dueDate);
        if (createPaymentDto.paymentDate) {
            status = client_1.PaymentStatus.PAID;
        }
        else if (dueDate < now) {
            status = client_1.PaymentStatus.OVERDUE;
        }
        const payment = await this.prisma.payment.create({
            data: {
                clientId: createPaymentDto.clientId || null,
                accountantId: finalAccountantId,
                paymentType,
                title: createPaymentDto.title,
                amount: createPaymentDto.amount,
                paymentDate: createPaymentDto.paymentDate ? new Date(createPaymentDto.paymentDate) : null,
                dueDate: new Date(createPaymentDto.dueDate),
                paymentMethod: createPaymentDto.paymentMethod || null,
                reference: createPaymentDto.reference || null,
                notes: createPaymentDto.notes || null,
                status,
                isRecurring: createPaymentDto.isRecurring || false,
                recurringFrequency: createPaymentDto.recurringFrequency || null,
                recurringDayOfMonth: createPaymentDto.recurringDayOfMonth || null,
                recurringEndDate: createPaymentDto.recurringEndDate ? new Date(createPaymentDto.recurringEndDate) : null,
                parentPaymentId: null,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        companyName: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                accountant: {
                    select: {
                        id: true,
                        companyName: true,
                    },
                },
            },
        });
        return payment;
    }
    async update(id, updatePaymentDto, accountantId) {
        const payment = await this.prisma.payment.findFirst({
            where: {
                id,
                accountantId,
            },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Pagamento não encontrado');
        }
        let status = updatePaymentDto.status || payment.status;
        const now = new Date();
        if (updatePaymentDto.paymentDate !== undefined) {
            if (updatePaymentDto.paymentDate) {
                status = client_1.PaymentStatus.PAID;
            }
            else {
                const dueDate = updatePaymentDto.dueDate ? new Date(updatePaymentDto.dueDate) : payment.dueDate;
                status = dueDate < now ? client_1.PaymentStatus.OVERDUE : client_1.PaymentStatus.PENDING;
            }
        }
        else if (updatePaymentDto.dueDate) {
            const dueDate = new Date(updatePaymentDto.dueDate);
            if (!payment.paymentDate && dueDate < now) {
                status = client_1.PaymentStatus.OVERDUE;
            }
        }
        const updatedPayment = await this.prisma.payment.update({
            where: { id },
            data: {
                ...updatePaymentDto,
                paymentDate: updatePaymentDto.paymentDate !== undefined
                    ? (updatePaymentDto.paymentDate ? new Date(updatePaymentDto.paymentDate) : null)
                    : undefined,
                dueDate: updatePaymentDto.dueDate ? new Date(updatePaymentDto.dueDate) : undefined,
                status,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        companyName: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        return updatedPayment;
    }
    async uploadReceipt(id, file, accountantId) {
        const payment = await this.prisma.payment.findFirst({
            where: {
                id,
                client: {
                    accountantId,
                    deletedAt: null,
                },
            },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Pagamento não encontrado');
        }
        const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Tipo de arquivo inválido. Apenas PDF, JPG e PNG são permitidos.');
        }
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new common_1.BadRequestException('Arquivo muito grande. Tamanho máximo: 10MB');
        }
        if (payment.receiptPath) {
            const oldFilePath = path.join(process.cwd(), payment.receiptPath);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }
        const fileExt = path.extname(file.originalname);
        const timestamp = Date.now();
        const uniqueFilename = `payment-${id}-${timestamp}${fileExt}`;
        const filePath = path.join('uploads', 'receipts', uniqueFilename);
        const uploadsDir = path.join(process.cwd(), 'uploads', 'receipts');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        fs.writeFileSync(path.join(process.cwd(), filePath), file.buffer);
        const updatedPayment = await this.prisma.payment.update({
            where: { id },
            data: {
                receiptPath: filePath,
                fileName: file.originalname,
                mimeType: file.mimetype,
                fileSize: file.size,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        companyName: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        return updatedPayment;
    }
    calculatePaymentStatus(paymentDate, dueDate) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (paymentDate) {
            return client_1.PaymentStatus.PAID;
        }
        const dueDateOnly = new Date(dueDate);
        dueDateOnly.setHours(0, 0, 0, 0);
        if (now > dueDateOnly) {
            return client_1.PaymentStatus.OVERDUE;
        }
        return client_1.PaymentStatus.PENDING;
    }
    async getStatistics(accountantId) {
        const where = {
            client: {
                accountantId,
                deletedAt: null,
            },
        };
        const [total, paid, pending, overdue, canceled] = await Promise.all([
            this.prisma.payment.count({ where }),
            this.prisma.payment.count({ where: { ...where, status: client_1.PaymentStatus.PAID } }),
            this.prisma.payment.count({ where: { ...where, status: client_1.PaymentStatus.PENDING } }),
            this.prisma.payment.count({ where: { ...where, status: client_1.PaymentStatus.OVERDUE } }),
            this.prisma.payment.count({ where: { ...where, status: client_1.PaymentStatus.CANCELED } }),
        ]);
        const [totalAmount, paidAmount, pendingAmount, overdueAmount] = await Promise.all([
            this.prisma.payment.aggregate({ where, _sum: { amount: true } }),
            this.prisma.payment.aggregate({ where: { ...where, status: client_1.PaymentStatus.PAID }, _sum: { amount: true } }),
            this.prisma.payment.aggregate({ where: { ...where, status: client_1.PaymentStatus.PENDING }, _sum: { amount: true } }),
            this.prisma.payment.aggregate({ where: { ...where, status: client_1.PaymentStatus.OVERDUE }, _sum: { amount: true } }),
        ]);
        return {
            count: {
                total,
                paid,
                pending,
                overdue,
                canceled,
            },
            amount: {
                total: totalAmount._sum.amount || 0,
                paid: paidAmount._sum.amount || 0,
                pending: pendingAmount._sum.amount || 0,
                overdue: overdueAmount._sum.amount || 0,
            },
        };
    }
    async updatePaymentStatuses() {
        this.logger.log('Running daily payment status update...');
        try {
            const payments = await this.prisma.payment.findMany({
                where: {
                    paymentDate: null,
                },
            });
            let updatedCount = 0;
            for (const payment of payments) {
                const newStatus = this.calculatePaymentStatus(payment.paymentDate, payment.dueDate);
                if (payment.status !== newStatus) {
                    await this.prisma.payment.update({
                        where: { id: payment.id },
                        data: { status: newStatus },
                    });
                    updatedCount++;
                }
            }
            this.logger.log(`Payment status update complete. Updated ${updatedCount} payments.`);
        }
        catch (error) {
            this.logger.error('Error updating payment statuses', error);
        }
    }
    async processRecurringPayments() {
        this.logger.log('Running recurring payments processor...');
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const recurringPayments = await this.prisma.payment.findMany({
                where: {
                    isRecurring: true,
                    recurringFrequency: { not: null },
                    OR: [
                        { recurringEndDate: null },
                        { recurringEndDate: { gte: today } },
                    ],
                },
                include: {
                    client: {
                        select: {
                            id: true,
                            accountantId: true,
                        },
                    },
                },
            });
            let createdCount = 0;
            for (const payment of recurringPayments) {
                const lastDueDate = new Date(payment.dueDate);
                lastDueDate.setHours(0, 0, 0, 0);
                let nextDueDate = new Date(lastDueDate);
                switch (payment.recurringFrequency) {
                    case 'MONTHLY':
                        if (payment.recurringDayOfMonth) {
                            nextDueDate.setMonth(today.getMonth());
                            nextDueDate.setDate(payment.recurringDayOfMonth);
                            if (nextDueDate < today) {
                                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                            }
                        }
                        else {
                            nextDueDate = new Date(lastDueDate);
                            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                        }
                        break;
                    case 'QUARTERLY':
                        nextDueDate = new Date(lastDueDate);
                        nextDueDate.setMonth(nextDueDate.getMonth() + 3);
                        break;
                    case 'SEMIANNUAL':
                        nextDueDate = new Date(lastDueDate);
                        nextDueDate.setMonth(nextDueDate.getMonth() + 6);
                        break;
                    case 'YEARLY':
                        nextDueDate = new Date(lastDueDate);
                        nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
                        break;
                    default:
                        this.logger.warn(`Unknown recurring frequency: ${payment.recurringFrequency}`);
                        continue;
                }
                const shouldCreate = nextDueDate <= today;
                if (shouldCreate) {
                    const existingPayment = await this.prisma.payment.findFirst({
                        where: {
                            parentPaymentId: payment.id,
                            dueDate: {
                                gte: new Date(nextDueDate.getFullYear(), nextDueDate.getMonth(), 1),
                                lt: new Date(nextDueDate.getFullYear(), nextDueDate.getMonth() + 1, 1),
                            },
                        },
                    });
                    if (!existingPayment) {
                        const newPayment = await this.prisma.payment.create({
                            data: {
                                clientId: payment.clientId,
                                accountantId: payment.client.accountantId,
                                paymentType: payment.paymentType,
                                title: payment.title,
                                amount: payment.amount,
                                dueDate: nextDueDate,
                                paymentMethod: payment.paymentMethod,
                                reference: payment.reference,
                                notes: payment.notes,
                                status: client_1.PaymentStatus.PENDING,
                                isRecurring: false,
                                parentPaymentId: payment.id,
                                requiresInvoice: payment.requiresInvoice,
                            },
                        });
                        createdCount++;
                        this.logger.log(`Created recurring payment instance: ${newPayment.id} for parent ${payment.id}`);
                        await this.prisma.payment.update({
                            where: { id: payment.id },
                            data: { dueDate: nextDueDate },
                        });
                    }
                }
            }
            this.logger.log(`Recurring payments processing complete. Created ${createdCount} new payment instances.`);
        }
        catch (error) {
            this.logger.error('Error processing recurring payments', error);
        }
    }
    async getClientByUserId(userId) {
        const client = await this.prisma.client.findUnique({
            where: { userId },
        });
        if (!client || client.deletedAt) {
            throw new common_1.NotFoundException('Cliente não encontrado');
        }
        return client;
    }
    async findAllForClient(queryDto, clientId) {
        const { search, status, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20, } = queryDto;
        const where = {
            clientId,
        };
        if (status) {
            where.status = status;
        }
        if (startDate || endDate) {
            where.dueDate = {};
            if (startDate) {
                where.dueDate.gte = new Date(startDate);
            }
            if (endDate) {
                where.dueDate.lte = new Date(endDate);
            }
        }
        if (search) {
            where.OR = [
                { reference: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
            ];
        }
        const skip = (page - 1) * limit;
        const orderBy = {};
        orderBy[sortBy] = sortOrder;
        const [payments, total] = await Promise.all([
            this.prisma.payment.findMany({
                where,
                include: {
                    client: {
                        select: {
                            id: true,
                            companyName: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    attachedDocuments: {
                        include: {
                            document: {
                                select: {
                                    id: true,
                                    title: true,
                                    fileName: true,
                                    mimeType: true,
                                    fileSize: true,
                                },
                            },
                        },
                    },
                },
                orderBy,
                skip,
                take: limit,
            }),
            this.prisma.payment.count({ where }),
        ]);
        const totalSum = await this.prisma.payment.aggregate({
            where,
            _sum: {
                amount: true,
            },
        });
        return {
            payments,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            totalSum: totalSum._sum.amount || 0,
        };
    }
    async findOneForClient(id, clientId) {
        const payment = await this.prisma.payment.findFirst({
            where: {
                id,
                clientId,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        companyName: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                attachedDocuments: {
                    include: {
                        document: {
                            include: {
                                folder: {
                                    select: {
                                        id: true,
                                        name: true,
                                        type: true,
                                        icon: true,
                                        color: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Pagamento não encontrado');
        }
        return payment;
    }
    async uploadReceiptForClient(id, file, clientId) {
        const payment = await this.findOneForClient(id, clientId);
        if (payment.status !== client_1.PaymentStatus.PAID) {
            throw new common_1.BadRequestException('Comprovante só pode ser enviado para pagamentos marcados como pagos');
        }
        const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Tipo de arquivo inválido. Apenas PDF, JPG e PNG são permitidos.');
        }
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new common_1.BadRequestException('Arquivo muito grande. Tamanho máximo: 10MB');
        }
        if (payment.receiptPath) {
            const oldFilePath = path.join(process.cwd(), payment.receiptPath);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }
        const fileExt = path.extname(file.originalname);
        const timestamp = Date.now();
        const uniqueFilename = `payment-${id}-${timestamp}${fileExt}`;
        const filePath = path.join('uploads', 'receipts', uniqueFilename);
        const uploadsDir = path.join(process.cwd(), 'uploads', 'receipts');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        fs.writeFileSync(path.join(process.cwd(), filePath), file.buffer);
        const updatedPayment = await this.prisma.payment.update({
            where: { id },
            data: {
                receiptPath: filePath,
                fileName: file.originalname,
                mimeType: file.mimetype,
                fileSize: file.size,
            },
            include: {
                client: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        this.emailService
            .sendPaymentReceiptConfirmation(updatedPayment.client.user.email, {
            clientName: updatedPayment.client.user.name,
            paymentReference: updatedPayment.reference || 'N/A',
            amount: new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
            }).format(Number(updatedPayment.amount)),
            date: updatedPayment.paymentDate
                ? new Date(updatedPayment.paymentDate).toLocaleDateString('pt-BR')
                : new Date().toLocaleDateString('pt-BR'),
        })
            .catch((error) => {
            this.logger.error(`Failed to send payment receipt confirmation email: ${error.message}`);
        });
        return updatedPayment;
    }
    async delete(id, accountantId) {
        const payment = await this.prisma.payment.findFirst({
            where: {
                id,
                accountantId,
            },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Pagamento não encontrado');
        }
        if (payment.receiptPath) {
            const filePath = path.join(process.cwd(), payment.receiptPath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        await this.prisma.payment.delete({
            where: { id },
        });
        return { message: 'Pagamento deletado com sucesso' };
    }
    async findRecurringPayments(accountantId) {
        const today = new Date();
        return this.prisma.payment.findMany({
            where: {
                accountantId,
                isRecurring: true,
                parentPaymentId: null,
                OR: [
                    { recurringEndDate: null },
                    { recurringEndDate: { gte: today } },
                ],
            },
            include: {
                client: {
                    select: {
                        id: true,
                        companyName: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                childPayments: {
                    orderBy: { dueDate: 'desc' },
                    take: 1,
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async cancelRecurrence(paymentId, accountantId) {
        const payment = await this.prisma.payment.findFirst({
            where: {
                id: paymentId,
                accountantId,
            },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Pagamento não encontrado');
        }
        if (!payment.isRecurring) {
            throw new common_1.BadRequestException('Este pagamento não é recorrente');
        }
        if (payment.parentPaymentId) {
            throw new common_1.BadRequestException('Não é possível cancelar recorrência de um pagamento gerado automaticamente');
        }
        return this.prisma.payment.update({
            where: { id: paymentId },
            data: { isRecurring: false },
        });
    }
    async attachDocument(paymentId, documentId, userId, accountantId) {
        const payment = await this.prisma.payment.findFirst({
            where: { id: paymentId, accountantId },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Pagamento não encontrado');
        }
        const document = await this.prisma.document.findFirst({
            where: {
                id: documentId,
                clientId: payment.clientId,
            },
        });
        if (!document) {
            throw new common_1.NotFoundException('Documento não encontrado ou não pertence ao cliente deste pagamento');
        }
        const existing = await this.prisma.paymentDocument.findUnique({
            where: {
                paymentId_documentId: {
                    paymentId,
                    documentId,
                },
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('Documento já anexado a este pagamento');
        }
        await this.prisma.paymentDocument.create({
            data: {
                paymentId,
                documentId,
                attachedBy: userId,
            },
        });
        if (payment.requiresInvoice && payment.status === client_1.PaymentStatus.AWAITING_INVOICE) {
            await this.prisma.payment.update({
                where: { id: paymentId },
                data: {
                    status: client_1.PaymentStatus.READY_TO_PAY,
                    invoiceAttachedAt: new Date(),
                    invoiceAttachedBy: userId,
                },
            });
        }
        return this.findOne(paymentId, accountantId);
    }
    async detachDocument(paymentId, documentId, accountantId) {
        const payment = await this.prisma.payment.findFirst({
            where: { id: paymentId, accountantId },
            include: {
                attachedDocuments: true,
            },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Pagamento não encontrado');
        }
        try {
            await this.prisma.paymentDocument.delete({
                where: {
                    paymentId_documentId: {
                        paymentId,
                        documentId,
                    },
                },
            });
        }
        catch (error) {
            throw new common_1.NotFoundException('Documento não está anexado a este pagamento');
        }
        if (payment.requiresInvoice &&
            payment.attachedDocuments.length === 1 &&
            payment.status === client_1.PaymentStatus.READY_TO_PAY) {
            await this.prisma.payment.update({
                where: { id: paymentId },
                data: {
                    status: client_1.PaymentStatus.AWAITING_INVOICE,
                    invoiceAttachedAt: null,
                    invoiceAttachedBy: null,
                },
            });
        }
        return this.findOne(paymentId, accountantId);
    }
};
exports.PaymentsService = PaymentsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentsService.prototype, "updatePaymentStatuses", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_1AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentsService.prototype, "processRecurringPayments", null);
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService,
        limits_service_1.LimitsService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map