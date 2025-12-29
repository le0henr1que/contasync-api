import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { LimitsService } from '../limits/limits.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Prisma, PaymentStatus, DocumentType, NotificationType } from '@prisma/client';
import { PaymentType } from './enums/payment-type.enum';
import * as path from 'path';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private limitsService: LimitsService,
    private notificationsService: NotificationsService,
    private storageService: StorageService,
    private configService: ConfigService,
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

    // Add period filter (uses dueDate)
    if (period && period !== 'ALL') {
      const now = new Date();
      let periodStart: Date | null = null;
      let periodEnd: Date = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // Last day of current month

      switch (period) {
        case 'THIS_MONTH':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'LAST_MONTH':
          periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        case 'THIS_YEAR':
          periodStart = new Date(now.getFullYear(), 0, 1);
          periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
          break;
      }

      if (periodStart) {
        where.dueDate = {
          gte: periodStart,
          lte: periodEnd,
        };
      }
    }

    // Add custom date range filter (overrides period if provided)
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
      // Individual clients (without accountant) can't be used by accountants
      if (!client.accountantId) {
        throw new ForbiddenException('Este cliente não pertence a nenhum contador');
      }

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

    // Determine status based on dates and payment type
    let status: PaymentStatus;
    const now = new Date();
    const dueDate = new Date(createPaymentDto.dueDate);

    if (createPaymentDto.paymentDate) {
      status = PaymentStatus.PAID;
    } else if (paymentType === PaymentType.CLIENT) {
      // CLIENT payments start as AWAITING_INVOICE (accountant must attach NF first)
      status = PaymentStatus.AWAITING_INVOICE;
    } else if (dueDate < now) {
      status = PaymentStatus.OVERDUE;
    } else {
      status = PaymentStatus.PENDING;
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

    // Send notification to client if it's a CLIENT payment
    if (paymentType === PaymentType.CLIENT && payment.clientId) {
      await this.notificationsService.create({
        clientId: payment.clientId,
        type: NotificationType.PAYMENT_REGISTERED,
        title: 'Novo pagamento registrado',
        message: `Um novo pagamento de ${payment.title} no valor de R$ ${payment.amount} foi registrado. Aguardando a contadora anexar a Nota Fiscal.`,
        metadata: {
          paymentId: payment.id,
          status: payment.status,
        },
      });
    }

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
    console.log('\n📨 ========== UPLOAD RECEIPT (ACCOUNTANT) STARTED ==========');
    console.log('💳 Payment ID:', id);
    console.log('🏢 Accountant ID:', accountantId);
    console.log('📄 File:', file.originalname);

    // Verify payment exists and belongs to accountant's client
    console.log('⏳ Verifying payment...');
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
      console.error('❌ Payment not found!');
      throw new NotFoundException('Pagamento não encontrado');
    }
    console.log('✅ Payment verified');

    // Validate file type (PDF, JPG, PNG)
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      console.error('❌ Invalid file type:', file.mimetype);
      throw new BadRequestException(
        'Tipo de arquivo inválido. Apenas PDF, JPG e PNG são permitidos.',
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size);
      throw new BadRequestException('Arquivo muito grande. Tamanho máximo: 10MB');
    }
    console.log('✅ File validation passed');

    // Delete old receipt from S3 if exists
    if (payment.receiptPath) {
      console.log('🗑️  Deleting old receipt from S3...');
      try {
        await this.storageService.deleteFile(payment.receiptPath);
        console.log('✅ Old receipt deleted');
      } catch (error) {
        console.error('⚠️  Error deleting old receipt:', error.message);
      }
    }

    // Generate unique S3 key for the receipt
    console.log('🔑 Generating S3 key...');
    const fileExt = path.extname(file.originalname);
    const timestamp = Date.now();
    const s3Key = `receipts/payment-${id}-${timestamp}${fileExt}`;
    console.log('✅ S3 Key generated:', s3Key);

    // Upload file to S3
    console.log('☁️  Uploading receipt to S3...');
    await this.storageService.uploadFile(s3Key, file.buffer, file.mimetype);
    console.log('✅ Receipt uploaded to S3!');

    // Update payment with receipt info (S3 key in receiptPath)
    console.log('💾 Updating payment record...');
    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        receiptPath: s3Key, // Store S3 key instead of local path
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

    console.log('✅ Payment updated with receipt');
    console.log('📁 S3 Path:', updatedPayment.receiptPath);
    console.log('========== UPLOAD RECEIPT COMPLETED ==========\n');

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
                accountantId: payment.client.accountantId || undefined, // May be null for individual clients
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
      period,
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

    // Add period filter (uses dueDate)
    if (period && period !== 'ALL') {
      const now = new Date();
      let periodStart: Date | null = null;
      let periodEnd: Date = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // Last day of current month

      switch (period) {
        case 'THIS_MONTH':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'LAST_MONTH':
          periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        case 'THIS_YEAR':
          periodStart = new Date(now.getFullYear(), 0, 1);
          periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
          break;
      }

      if (periodStart) {
        where.dueDate = {
          gte: periodStart,
          lte: periodEnd,
        };
      }
    }

    // Add custom date range filter (overrides period if provided)
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
    console.log('\n📨 ========== UPLOAD RECEIPT (CLIENT) STARTED ==========');
    console.log('💳 Payment ID:', id);
    console.log('👤 Client ID:', clientId);
    console.log('📄 File:', file.originalname);

    // Verify payment exists and belongs to client with attached documents
    console.log('⏳ Verifying payment...');
    const payment = await this.prisma.payment.findFirst({
      where: { id, clientId },
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
        accountant: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        attachedDocuments: {
          include: {
            document: true,
          },
        },
      },
    });

    if (!payment) {
      console.error('❌ Payment not found!');
      throw new NotFoundException('Pagamento não encontrado');
    }
    console.log('✅ Payment verified');

    // Only allow upload if payment is READY_TO_PAY or AWAITING_VALIDATION
    if (
      payment.status !== PaymentStatus.READY_TO_PAY &&
      payment.status !== PaymentStatus.AWAITING_VALIDATION
    ) {
      if (payment.status === PaymentStatus.AWAITING_INVOICE) {
        throw new BadRequestException(
          'Aguardando a contadora anexar a Nota Fiscal (NF) para este pagamento',
        );
      }
      throw new BadRequestException(
        'Comprovante só pode ser enviado para pagamentos prontos para pagamento',
      );
    }

    // Double-check if payment has any document attached
    const hasDocument = payment.attachedDocuments.length > 0;

    if (!hasDocument) {
      throw new BadRequestException(
        'Comprovante só pode ser enviado após a contadora anexar a Nota Fiscal (NF)',
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
      console.error('❌ File too large:', file.size);
      throw new BadRequestException('Arquivo muito grande. Tamanho máximo: 10MB');
    }
    console.log('✅ File validation passed');

    // Delete old receipt from S3 if exists
    if (payment.receiptPath) {
      console.log('🗑️  Deleting old receipt from S3...');
      try {
        await this.storageService.deleteFile(payment.receiptPath);
        console.log('✅ Old receipt deleted');
      } catch (error) {
        console.error('⚠️  Error deleting old receipt:', error.message);
      }
    }

    // Generate unique S3 key for the receipt
    console.log('🔑 Generating S3 key...');
    const fileExt = path.extname(file.originalname);
    const timestamp = Date.now();
    const s3Key = `receipts/payment-${id}-${timestamp}${fileExt}`;
    console.log('✅ S3 Key generated:', s3Key);

    // Upload file to S3
    console.log('☁️  Uploading receipt to S3...');
    await this.storageService.uploadFile(s3Key, file.buffer, file.mimetype);
    console.log('✅ Receipt uploaded to S3!');

    // Update payment with receipt info and change status to AWAITING_VALIDATION
    console.log('💾 Updating payment record...');
    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        receiptPath: s3Key, // Store S3 key instead of local path
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        status: PaymentStatus.AWAITING_VALIDATION,
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

    // Send confirmation email to client (async, non-blocking)
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

    // Send notification email to accountant (async, non-blocking)
    this.emailService
      .sendPaymentReceiptToAccountant(payment.accountant.user.email, {
        accountantName: payment.accountant.user.name,
        clientName: updatedPayment.client.user.name,
        paymentTitle: updatedPayment.title,
        paymentReference: updatedPayment.reference || 'N/A',
        amount: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(Number(updatedPayment.amount)),
        portalUrl: this.configService.get<string>('APP_URL', 'http://localhost:3001'),
      })
      .catch((error) => {
        this.logger.error(
          `Failed to send payment receipt notification to accountant: ${error.message}`,
        );
      });

    // Send notification to accountant that client uploaded receipt
    await this.notificationsService.create({
      accountantId: payment.accountantId,
      type: NotificationType.PAYMENT_REGISTERED,
      title: 'Comprovante de pagamento enviado',
      message: `O cliente ${updatedPayment.client.user.name} enviou o comprovante do pagamento "${updatedPayment.title}". Aguardando sua validação.`,
      metadata: {
        paymentId: updatedPayment.id,
        clientId: updatedPayment.client.id,
        status: PaymentStatus.AWAITING_VALIDATION,
      },
    });

    return updatedPayment;
  }

  async delete(id: string, accountantId: string) {
    console.log('\n🗑️  ========== DELETE PAYMENT STARTED ==========');
    console.log('💳 Payment ID:', id);
    console.log('🏢 Accountant ID:', accountantId);

    // Verify payment exists and belongs to accountant
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        accountantId,
      },
    });

    if (!payment) {
      console.error('❌ Payment not found!');
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Delete receipt file from S3 if exists
    if (payment.receiptPath) {
      console.log('🗑️  Deleting receipt from S3...');
      try {
        await this.storageService.deleteFile(payment.receiptPath);
        console.log('✅ Receipt deleted from S3');
      } catch (error) {
        console.error('⚠️  Error deleting receipt from S3:', error.message);
      }
    }

    // Delete payment from database
    console.log('💾 Deleting payment from database...');
    await this.prisma.payment.delete({
      where: { id },
    });

    console.log('✅ Payment deleted successfully');
    console.log('========== DELETE PAYMENT COMPLETED ==========\n');

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

    // Update payment status if it's the first document attached and status is AWAITING_INVOICE
    if (payment.status === PaymentStatus.AWAITING_INVOICE) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.READY_TO_PAY,
          invoiceAttachedAt: new Date(),
          invoiceAttachedBy: userId,
        },
      });

      // Send notification to client that document was attached
      if (payment.clientId) {
        await this.notificationsService.create({
          clientId: payment.clientId,
          type: NotificationType.DOCUMENT_AVAILABLE,
          title: 'Nota Fiscal anexada',
          message: `A Nota Fiscal do pagamento "${payment.title}" foi anexada. Agora você pode enviar o comprovante de pagamento.`,
          metadata: {
            paymentId: payment.id,
            documentId,
            status: PaymentStatus.READY_TO_PAY,
          },
        });
      }
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

  /**
   * Send payment reminder notification to client
   * Creates a notification in the system (no email)
   */
  async chargePayment(id: string, userId: string, accountantId: string) {
    // Verify payment exists and belongs to accountant
    const payment = await this.prisma.payment.findFirst({
      where: { id, accountantId },
      include: {
        client: {
          include: {
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

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Only allow charging unpaid payments (PENDING, AWAITING_INVOICE, READY_TO_PAY, AWAITING_VALIDATION, OVERDUE)
    if (payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.CANCELED) {
      throw new BadRequestException(
        'Não é possível cobrar pagamentos que já foram pagos ou cancelados',
      );
    }

    // Must be a CLIENT payment (not OFFICE)
    if (!payment.clientId) {
      throw new BadRequestException(
        'Apenas pagamentos de clientes podem ser cobrados',
      );
    }

    // Format due date and amount
    const dueDate = new Date(payment.dueDate);
    const formattedDate = dueDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(payment.amount));

    // Calculate days overdue if applicable
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays > 0;

    // Create notification message
    let message = `Lembrete de pagamento: ${payment.title}\n`;
    message += `Valor: ${formattedAmount}\n`;
    message += `Vencimento: ${formattedDate}`;

    if (isOverdue) {
      message += `\n\n⚠️ Este pagamento está ${diffDays} dia${diffDays > 1 ? 's' : ''} em atraso.`;
    }

    // Send notification to client
    await this.notificationsService.create({
      clientId: payment.clientId,
      type: NotificationType.PAYMENT_REGISTERED,
      title: isOverdue ? 'Cobrança - Pagamento em Atraso' : 'Lembrete de Pagamento',
      message,
      metadata: {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        dueDate: payment.dueDate,
        daysOverdue: isOverdue ? diffDays : 0,
      },
    });

    return {
      success: true,
      message: 'Notificação de cobrança enviada com sucesso',
      payment: {
        id: payment.id,
        title: payment.title,
        amount: payment.amount,
        dueDate: payment.dueDate,
        status: payment.status,
        client: payment.client,
      },
    };
  }

  /**
   * Approve payment and mark as PAID
   * Can only approve payments with status AWAITING_VALIDATION
   */
  async approvePayment(id: string, accountantId: string) {
    // Verify payment exists and belongs to accountant
    const payment = await this.prisma.payment.findFirst({
      where: { id, accountantId },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Only allow approval if payment has a receipt and is awaiting validation
    if (payment.status !== PaymentStatus.AWAITING_VALIDATION) {
      throw new BadRequestException(
        'Apenas pagamentos aguardando validação podem ser aprovados',
      );
    }

    if (!payment.receiptPath) {
      throw new BadRequestException(
        'Pagamento não possui comprovante anexado',
      );
    }

    // Update payment status to PAID and set payment date
    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        paymentDate: new Date(),
      },
      include: {
        client: {
          include: {
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
    });

    // Send notification to client about payment approval
    if (updatedPayment.client) {
      await this.notificationsService.create({
        clientId: updatedPayment.client.id,
        type: NotificationType.PAYMENT_REGISTERED,
        title: 'Pagamento aprovado',
        message: `O pagamento "${updatedPayment.title}" foi aprovado pela contadora. O comprovante foi validado com sucesso!`,
        metadata: {
          paymentId: updatedPayment.id,
          status: PaymentStatus.PAID,
        },
      });
    }

    return updatedPayment;
  }

  async getPaymentDocuments(paymentId: string, accountantId: string) {
    // Verify payment exists and belongs to accountant
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, accountantId },
      include: {
        attachedDocuments: {
          include: {
            document: {
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
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Return only the documents array
    return payment.attachedDocuments.map((ad) => ad.document);
  }

  async getPaymentDocumentsForClient(paymentId: string, clientId: string) {
    // Verify payment exists and belongs to client
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, clientId },
      include: {
        attachedDocuments: {
          include: {
            document: {
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
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Return only the documents array
    return payment.attachedDocuments.map((ad) => ad.document);
  }
}
