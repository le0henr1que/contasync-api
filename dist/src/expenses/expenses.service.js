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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const limits_service_1 = require("../limits/limits.service");
let ExpensesService = class ExpensesService {
    prisma;
    limitsService;
    constructor(prisma, limitsService) {
        this.prisma = prisma;
        this.limitsService = limitsService;
    }
    async getClientByUserId(userId) {
        const client = await this.prisma.client.findUnique({
            where: { userId },
            select: {
                id: true,
                expenseModuleEnabled: true,
                deletedAt: true,
            },
        });
        if (!client || client.deletedAt) {
            throw new common_1.NotFoundException('Cliente não encontrado');
        }
        if (!client.expenseModuleEnabled) {
            throw new common_1.NotFoundException('Módulo de despesas não habilitado para este cliente');
        }
        return client;
    }
    async getAccountantByUserId(userId) {
        const accountant = await this.prisma.accountant.findUnique({
            where: { userId },
            select: {
                id: true,
            },
        });
        if (!accountant) {
            throw new common_1.NotFoundException('Contador não encontrado');
        }
        return accountant;
    }
    async findExpenseById(id) {
        return this.prisma.expense.findUnique({
            where: { id },
        });
    }
    async findAllForClient(queryDto, clientId) {
        const { page = 1, limit = 20, search, category, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = queryDto;
        const where = {
            clientId,
        };
        if (search) {
            where.description = {
                contains: search,
                mode: 'insensitive',
            };
        }
        if (category) {
            where.category = category;
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                where.date.gte = new Date(startDate);
            }
            if (endDate) {
                where.date.lte = new Date(endDate);
            }
        }
        const skip = (page - 1) * limit;
        const orderBy = { [sortBy]: sortOrder };
        const [expenses, total] = await Promise.all([
            this.prisma.expense.findMany({
                where,
                skip,
                take: limit,
                orderBy,
            }),
            this.prisma.expense.count({ where }),
        ]);
        const sumResult = await this.prisma.expense.aggregate({
            where,
            _sum: {
                amount: true,
            },
        });
        return {
            expenses,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            totalSum: sumResult._sum.amount || 0,
        };
    }
    async findOneForClient(id, clientId) {
        const expense = await this.prisma.expense.findFirst({
            where: {
                id,
                clientId,
            },
        });
        if (!expense) {
            throw new common_1.NotFoundException('Despesa não encontrada');
        }
        return expense;
    }
    async createForClient(createExpenseDto, clientId, file) {
        const limitCheck = await this.limitsService.checkExpenseLimit(clientId);
        if (!limitCheck.allowed) {
            throw new common_1.ForbiddenException({
                message: limitCheck.message,
                upgradeMessage: limitCheck.upgradeMessage,
                usage: limitCheck.usage,
            });
        }
        const expenseDate = new Date(createExpenseDto.date);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (expenseDate > today) {
            throw new common_1.BadRequestException('A data da despesa não pode ser no futuro');
        }
        let receiptPath;
        let fileName;
        let mimeType;
        let fileSize;
        if (file) {
            const fs = require('fs');
            const path = require('path');
            const uploadsDir = path.join(process.cwd(), 'uploads', 'expenses');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            const fileExt = path.extname(file.originalname);
            const timestamp = Date.now();
            const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            const newFileName = `${timestamp}_${sanitizedName}`;
            receiptPath = path.join(uploadsDir, newFileName);
            fs.writeFileSync(receiptPath, file.buffer);
            fileName = file.originalname;
            mimeType = file.mimetype;
            fileSize = file.size;
        }
        const expense = await this.prisma.expense.create({
            data: {
                clientId,
                date: expenseDate,
                description: createExpenseDto.description,
                category: createExpenseDto.category,
                amount: createExpenseDto.amount,
                receiptPath,
                fileName,
                mimeType,
                fileSize,
            },
        });
        return expense;
    }
    async findAllForAccountant(queryDto, accountantId) {
        const { page = 1, limit = 20, search, category, clientId, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = queryDto;
        const skip = (page - 1) * limit;
        const where = {
            client: {
                accountantId,
                deletedAt: null,
            },
        };
        if (search) {
            where.description = {
                contains: search,
                mode: 'insensitive',
            };
        }
        if (category) {
            where.category = category;
        }
        if (clientId) {
            where.clientId = clientId;
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate)
                where.date.lte = new Date(endDate);
        }
        const orderBy = {};
        orderBy[sortBy] = sortOrder;
        const [expenses, total] = await Promise.all([
            this.prisma.expense.findMany({
                where,
                include: {
                    client: {
                        select: {
                            id: true,
                            companyName: true,
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
                orderBy,
                skip,
                take: limit,
            }),
            this.prisma.expense.count({ where }),
        ]);
        const totalSum = await this.prisma.expense.aggregate({
            where,
            _sum: {
                amount: true,
            },
        });
        return {
            expenses,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            totalSum: totalSum._sum.amount || 0,
        };
    }
    async findOneForAccountant(id, accountantId) {
        const expense = await this.prisma.expense.findFirst({
            where: {
                id,
                client: {
                    accountantId,
                    deletedAt: null,
                },
            },
            include: {
                client: {
                    select: {
                        id: true,
                        companyName: true,
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
        if (!expense) {
            throw new common_1.NotFoundException('Despesa não encontrada');
        }
        return expense;
    }
    async exportToExcel(expenses, clientName) {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Despesas');
        worksheet.columns = [
            { header: 'Data', key: 'date', width: 12 },
            { header: 'Cliente', key: 'client', width: 25 },
            { header: 'Descrição', key: 'description', width: 35 },
            { header: 'Categoria', key: 'category', width: 15 },
            { header: 'Valor (R$)', key: 'amount', width: 15 },
            { header: 'Comprovante', key: 'receipt', width: 15 },
        ];
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
        };
        expenses.forEach((expense) => {
            worksheet.addRow({
                date: new Date(expense.date).toLocaleDateString('pt-BR'),
                client: expense.client?.companyName || expense.client?.user?.name || clientName || '-',
                description: expense.description,
                category: this.getCategoryLabel(expense.category),
                amount: parseFloat(expense.amount.toString()),
                receipt: expense.receiptPath ? 'Sim' : 'Não',
            });
        });
        worksheet.getColumn('amount').numFmt = 'R$ #,##0.00';
        const totalRow = worksheet.addRow({
            date: '',
            client: '',
            description: '',
            category: 'TOTAL',
            amount: { formula: `SUM(E2:E${expenses.length + 1})` },
            receipt: '',
        });
        totalRow.font = { bold: true };
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF0C0' },
        };
        return await workbook.xlsx.writeBuffer();
    }
    async exportToPDF(expenses, clientName) {
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.fontSize(20).text('Relatório de Despesas', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'right' });
        doc.moveDown();
        const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
        doc.fontSize(12).text(`Total de despesas: ${expenses.length}`);
        doc.text(`Valor total: ${this.formatCurrency(total)}`);
        doc.moveDown();
        const startY = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Data', 50, startY, { width: 70, continued: true });
        doc.text('Cliente', 120, startY, { width: 100, continued: true });
        doc.text('Descrição', 220, startY, { width: 150, continued: true });
        doc.text('Categoria', 370, startY, { width: 80, continued: true });
        doc.text('Valor', 450, startY, { width: 80, align: 'right' });
        doc.moveTo(50, startY + 15).lineTo(530, startY + 15).stroke();
        doc.moveDown();
        doc.font('Helvetica').fontSize(9);
        expenses.forEach((expense) => {
            const y = doc.y;
            if (y > 700) {
                doc.addPage();
            }
            doc.text(new Date(expense.date).toLocaleDateString('pt-BR'), 50, y, { width: 70, continued: true });
            doc.text(expense.client?.companyName || expense.client?.user?.name || clientName || '-', 120, y, { width: 100, continued: true });
            doc.text(expense.description, 220, y, { width: 150, continued: true });
            doc.text(this.getCategoryLabel(expense.category), 370, y, { width: 80, continued: true });
            doc.text(this.formatCurrency(parseFloat(expense.amount.toString())), 450, y, { width: 80, align: 'right' });
            doc.moveDown(0.5);
        });
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(530, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('TOTAL', 370, doc.y, { width: 80, continued: true });
        doc.text(this.formatCurrency(total), 450, doc.y, { width: 80, align: 'right' });
        doc.end();
        return new Promise((resolve) => {
            doc.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
        });
    }
    getCategoryLabel(category) {
        const labels = {
            FOOD: 'Alimentação',
            TRANSPORT: 'Transporte',
            HEALTH: 'Saúde',
            EDUCATION: 'Educação',
            OTHER: 'Outros',
        };
        return labels[category] || category;
    }
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        limits_service_1.LimitsService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map