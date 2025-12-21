import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { LimitsService } from '../limits/limits.service';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Prisma, PaymentStatus } from '@prisma/client';
import { PaymentType } from './enums/payment-type.enum';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private limitsService: LimitsService,
  ) {}

  async findAll(queryDto: QueryPaymentsDto, accountantId: string) {
    const {
      search,
      status,
      type,
      clientId,
      period,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = queryDto;

    // Build where clause - filter by accountantId directly
    const where: Prisma.PaymentWhereInput = {
      accountantId,
    };

    // Add status filter
    if (status) {
      where.status = status;
    }

    // Add payment type filter
    if (type) {
      where.paymentType = type;
    }

    // Add client filter
    if (clientId) {
      where.clientId = clientId;
    }

    // Add period filter
    if (period) {
      const now = new Date();
      let periodStart: Date | null = null;
      let periodEnd: Date = now;

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

    // Add date range filter
    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) {
        where.dueDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.dueDate.lte = new Date(endDate);
      }
    }

    // Add search filter
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } },
        { client: { user: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Build orderBy
    const orderBy: Prisma.PaymentOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    // Execute query
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

    // Calculate total sum
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

  async findOne(id: string, accountantId: string) {
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
      throw new NotFoundException('Pagamento não encontrado');
    }

    return payment;
  }

  async create(createPaymentDto: CreatePaymentDto, accountantId: string) {
    // Determine payment type (default to CLIENT for backward compatibility)
    const paymentType = createPaymentDto.paymentType || PaymentType.CLIENT;

    // Validation: CLIENT type must have clientId
    if (paymentType === PaymentType.CLIENT && !createPaymentDto.clientId) {
      throw new BadRequestException('Pagamentos do tipo CLIENT precisam ter um cliente vinculado');
    }

    // Validation: OFFICE type cannot have clientId
    if (paymentType === PaymentType.OFFICE && createPaymentDto.clientId) {
      throw new BadRequestException('Pagamentos do tipo OFFICE não podem ter cliente vinculado');
    }

    // Validation: Recurring payments must have frequency and day of month
    if (createPaymentDto.isRecurring) {
      if (!createPaymentDto.recurringFrequency || !createPaymentDto.recurringDayOfMonth) {
        throw new BadRequestException('Pagamentos recorrentes precisam de frequência e dia do mês');
      }
    }

    let finalAccountantId = accountantId;
    let client = null;

    // If CLIENT type, verify client exists and belongs to accountant
    if (paymentType === PaymentType.CLIENT && createPaymentDto.clientId) {
      client = await this.prisma.client.findFirst({
        where: {
          id: createPaymentDto.clientId,
          deletedAt: null,
        },
      });

      if (!client) {
        throw new NotFoundException('Cliente não encontrado');
      }

      // Security check: verify client belongs to logged-in accountant
      if (client.accountantId !== accountantId) {
        throw new ForbiddenException('Cliente não pertence a este contador');
      }

      finalAccountantId = client.accountantId;

      // Check payment limit for client payments
      const limitCheck = await this.limitsService.checkPaymentLimit(createPaymentDto.clientId);
      if (!limitCheck.allowed) {
        throw new ForbiddenException({
          message: limitCheck.message,
          upgradeMessage: limitCheck.upgradeMessage,
          usage: limitCheck.usage,
        });
      }
    }

    // Determine status based on dates
    let status: PaymentStatus = PaymentStatus.PENDING;
    const now = new Date();
    const dueDate = new Date(createPaymentDto.dueDate);

    if (createPaymentDto.paymentDate) {
      status = PaymentStatus.PAID;
    } else if (dueDate < now) {
      status = PaymentStatus.OVERDUE;
    }

    // Create payment
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
        // Recurring fields
        isRecurring: createPaymentDto.isRecurring || false,
        recurringFrequency: createPaymentDto.recurringFrequency || null,
        recurringDayOfMonth: createPaymentDto.recurringDayOfMonth || null,
        recurringEndDate: createPaymentDto.recurringEndDate ? new Date(createPaymentDto.recurringEndDate) : null,
        parentPaymentId: null, // This is a template, not a child
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

  async update(id: string, updatePaymentDto: UpdatePaymentDto, accountantId: string) {
    // Verify payment exists and belongs to accountant
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        accountantId,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Update status if necessary
    let status = updatePaymentDto.status || payment.status;
    const now = new Date();

    if (updatePaymentDto.paymentDate !== undefined) {
      if (updatePaymentDto.paymentDate) {
        status = PaymentStatus.PAID;
      } else {
        const dueDate = updatePaymentDto.dueDate ? new Date(updatePaymentDto.dueDate) : payment.dueDate;
        status = dueDate < now ? PaymentStatus.OVERDUE : PaymentStatus.PENDING;
      }
    } else if (updatePaymentDto.dueDate) {
      const dueDate = new Date(updatePaymentDto.dueDate);
      if (!payment.paymentDate && dueDate < now) {
        status = PaymentStatus.OVERDUE;
      }
    }

    // Update payment
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

  async uploadReceipt(
    id: string,
    file: Express.Multer.File,
    accountantId: string,
  ) {
    // Verify payment exists and belongs to accountant's client
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
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Validate file type (PDF, JPG, PNG)
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de arquivo inválido. Apenas PDF, JPG e PNG são permitidos.',
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      throw new BadRequestException('Arquivo muito grande. Tamanho máximo: 10MB');
    }

    // Delete old receipt if exists
    if (payment.receiptPath) {
      const oldFilePath = path.join(process.cwd(), payment.receiptPath);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Create unique filename
    const fileExt = path.extname(file.originalname);
    const timestamp = Date.now();
    const uniqueFilename = `payment-${id}-${timestamp}${fileExt}`;
    const filePath = path.join('uploads', 'receipts', uniqueFilename);

    // Save file to disk
    const uploadsDir = path.join(process.cwd(), 'uploads', 'receipts');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(path.join(process.cwd(), filePath), file.buffer);

    // Update payment with receipt info
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

  /**
   * Calculate payment status based on payment date and due date
   */
  private calculatePaymentStatus(paymentDate: Date | null, dueDate: Date): PaymentStatus {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison

    if (paymentDate) {
      return PaymentStatus.PAID;
    }

    const dueDateOnly = new Date(dueDate);
    dueDateOnly.setHours(0, 0, 0, 0);

    if (now > dueDateOnly) {
      return PaymentStatus.OVERDUE;
    }

    return PaymentStatus.PENDING;
  }

  /**
   * Get payment statistics for an accountant
   */
  async getStatistics(accountantId: string) {
    const where: Prisma.PaymentWhereInput = {
      client: {
        accountantId,
        deletedAt: null,
      },
    };

    // Get counts by status
    const [total, paid, pending, overdue, canceled] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.count({ where: { ...where, status: PaymentStatus.PAID } }),
      this.prisma.payment.count({ where: { ...where, status: PaymentStatus.PENDING } }),
      this.prisma.payment.count({ where: { ...where, status: PaymentStatus.OVERDUE } }),
      this.prisma.payment.count({ where: { ...where, status: PaymentStatus.CANCELED } }),
    ]);

    // Get total amount by status
    const [totalAmount, paidAmount, pendingAmount, overdueAmount] = await Promise.all([
      this.prisma.payment.aggregate({ where, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { ...where, status: PaymentStatus.PAID }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { ...where, status: PaymentStatus.PENDING }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { ...where, status: PaymentStatus.OVERDUE }, _sum: { amount: true } }),
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

  /**
   * Update payment statuses for all unpaid payments
   * Runs daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updatePaymentStatuses() {
    this.logger.log('Running daily payment status update...');

    try {
      // Get all payments that are not paid
      const payments = await this.prisma.payment.findMany({
        where: {
          paymentDate: null,
        },
      });

      let updatedCount = 0;

      for (const payment of payments) {
        const newStatus = this.calculatePaymentStatus(payment.paymentDate, payment.dueDate);

        // Only update if status changed
        if (payment.status !== newStatus) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: newStatus },
          });
          updatedCount++;
        }
      }

      this.logger.log(`Payment status update complete. Updated ${updatedCount} payments.`);
    } catch (error) {
      this.logger.error('Error updating payment statuses', error);
    }
  }

  /**
   * Process recurring payments and create new instances
   * Runs daily at 1 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async processRecurringPayments() {
    this.logger.log('Running recurring payments processor...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all active recurring payments
      const recurringPayments = await this.prisma.payment.findMany({
        where: {
          isRecurring: true,
          recurringFrequency: { not: null },
          OR: [
            { recurringEndDate: null }, // No end date
            { recurringEndDate: { gte: today } }, // End date in the future
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
        // Calculate next due date based on frequency
        const lastDueDate = new Date(payment.dueDate);
        lastDueDate.setHours(0, 0, 0, 0);

        let nextDueDate = new Date(lastDueDate);

        switch (payment.recurringFrequency) {
          case 'MONTHLY':
            // Use recurringDayOfMonth if set, otherwise use original day
            if (payment.recurringDayOfMonth) {
              nextDueDate.setMonth(today.getMonth());
              nextDueDate.setDate(payment.recurringDayOfMonth);

              // If the day has already passed this month, set for next month
              if (nextDueDate < today) {
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
              }
            } else {
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

        // Check if we need to create a new payment for this period
        const shouldCreate = nextDueDate <= today;

        if (shouldCreate) {
          // Check if payment for this period already exists
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
            // Create new payment instance
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
                status: PaymentStatus.PENDING,
                isRecurring: false, // The instance is not recurring
                parentPaymentId: payment.id, // Link to parent
                requiresInvoice: payment.requiresInvoice,
              },
            });

            createdCount++;
            this.logger.log(
              `Created recurring payment instance: ${newPayment.id} for parent ${payment.id}`,
            );

            // Update parent payment's dueDate to next period
            await this.prisma.payment.update({
              where: { id: payment.id },
              data: { dueDate: nextDueDate },
            });
          }
        }
      }

      this.logger.log(
        `Recurring payments processing complete. Created ${createdCount} new payment instances.`,
      );
    } catch (error) {
      this.logger.error('Error processing recurring payments', error);
    }
  }

  /**
   * Get client by user ID
   */
  async getClientByUserId(userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { userId },
    });

    if (!client || client.deletedAt) {
      throw new NotFoundException('Cliente não encontrado');
    }

    return client;
  }

  /**
   * Find all payments for a specific client
   */
  async findAllForClient(queryDto: QueryPaymentsDto, clientId: string) {
    const {
      search,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = queryDto;

    // Build where clause - only this client's payments
    const where: Prisma.PaymentWhereInput = {
      clientId,
    };

    // Add status filter
    if (status) {
      where.status = status;
    }

    // Add date range filter
    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) {
        where.dueDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.dueDate.lte = new Date(endDate);
      }
    }

    // Add search filter
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Build orderBy
    const orderBy: Prisma.PaymentOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    // Execute query
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

    // Calculate total sum
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

  /**
   * Find one payment for a specific client
   */
  async findOneForClient(id: string, clientId: string) {
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
      throw new NotFoundException('Pagamento não encontrado');
    }

    return payment;
  }

  /**
   * Upload receipt for a specific client
   */
  async uploadReceiptForClient(
    id: string,
    file: Express.Multer.File,
    clientId: string,
  ) {
    // Verify payment exists and belongs to client
    const payment = await this.findOneForClient(id, clientId);

    // Only allow upload if payment is PAID
    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException(
        'Comprovante só pode ser enviado para pagamentos marcados como pagos',
      );
    }

    // Validate file type (PDF, JPG, PNG)
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de arquivo inválido. Apenas PDF, JPG e PNG são permitidos.',
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      throw new BadRequestException('Arquivo muito grande. Tamanho máximo: 10MB');
    }

    // Delete old receipt if exists
    if (payment.receiptPath) {
      const oldFilePath = path.join(process.cwd(), payment.receiptPath);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Create unique filename
    const fileExt = path.extname(file.originalname);
    const timestamp = Date.now();
    const uniqueFilename = `payment-${id}-${timestamp}${fileExt}`;
    const filePath = path.join('uploads', 'receipts', uniqueFilename);

    // Save file to disk
    const uploadsDir = path.join(process.cwd(), 'uploads', 'receipts');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(path.join(process.cwd(), filePath), file.buffer);

    // Update payment with receipt info
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

    // Send confirmation email (async, non-blocking)
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
        this.logger.error(
          `Failed to send payment receipt confirmation email: ${error.message}`,
        );
      });

    return updatedPayment;
  }

  async delete(id: string, accountantId: string) {
    // Verify payment exists and belongs to accountant
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        accountantId,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Delete receipt file if exists
    if (payment.receiptPath) {
      const filePath = path.join(process.cwd(), payment.receiptPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete payment from database
    await this.prisma.payment.delete({
      where: { id },
    });

    return { message: 'Pagamento deletado com sucesso' };
  }

  /**
   * Find all active recurring payments for an accountant
   */
  async findRecurringPayments(accountantId: string) {
    const today = new Date();

    return this.prisma.payment.findMany({
      where: {
        accountantId,
        isRecurring: true,
        parentPaymentId: null, // Only templates
        OR: [
          { recurringEndDate: null }, // Indefinite
          { recurringEndDate: { gte: today } }, // Not ended yet
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
          take: 1, // Get last generated child
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel recurrence for a payment
   */
  async cancelRecurrence(paymentId: string, accountantId: string) {
    // Verify payment exists and belongs to accountant
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        accountantId,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    if (!payment.isRecurring) {
      throw new BadRequestException('Este pagamento não é recorrente');
    }

    if (payment.parentPaymentId) {
      throw new BadRequestException('Não é possível cancelar recorrência de um pagamento gerado automaticamente');
    }

    // Set isRecurring to false
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { isRecurring: false },
    });
  }

  /**
   * Attach a document to a payment
   */
  async attachDocument(
    paymentId: string,
    documentId: string,
    userId: string,
    accountantId: string,
  ) {
    // Verify payment exists and belongs to accountant
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, accountantId },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Verify document exists and belongs to the same client
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        clientId: payment.clientId,
      },
    });

    if (!document) {
      throw new NotFoundException(
        'Documento não encontrado ou não pertence ao cliente deste pagamento',
      );
    }

    // Check if document is already attached
    const existing = await this.prisma.paymentDocument.findUnique({
      where: {
        paymentId_documentId: {
          paymentId,
          documentId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Documento já anexado a este pagamento');
    }

    // Create the attachment
    await this.prisma.paymentDocument.create({
      data: {
        paymentId,
        documentId,
        attachedBy: userId,
      },
    });

    // Update payment status if needed
    if (payment.requiresInvoice && payment.status === PaymentStatus.AWAITING_INVOICE) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.READY_TO_PAY,
          invoiceAttachedAt: new Date(),
          invoiceAttachedBy: userId,
        },
      });
    }

    // Return updated payment with attached documents
    return this.findOne(paymentId, accountantId);
  }

  /**
   * Detach a document from a payment
   */
  async detachDocument(
    paymentId: string,
    documentId: string,
    accountantId: string,
  ) {
    // Verify payment exists and belongs to accountant
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, accountantId },
      include: {
        attachedDocuments: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Delete the attachment
    try {
      await this.prisma.paymentDocument.delete({
        where: {
          paymentId_documentId: {
            paymentId,
            documentId,
          },
        },
      });
    } catch (error) {
      throw new NotFoundException('Documento não está anexado a este pagamento');
    }

    // If this was the last document and payment requires invoice, revert status
    if (
      payment.requiresInvoice &&
      payment.attachedDocuments.length === 1 &&
      payment.status === PaymentStatus.READY_TO_PAY
    ) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.AWAITING_INVOICE,
          invoiceAttachedAt: null,
          invoiceAttachedBy: null,
        },
      });
    }

    // Return updated payment
    return this.findOne(paymentId, accountantId);
  }
}
