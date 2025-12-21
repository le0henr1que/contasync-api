import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { ActivityLogService, ActivityAction } from '../activity-log/activity-log.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LimitsService } from '../limits/limits.service';
import { DocumentFoldersService } from '../document-folders/document-folders.service';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private limitsService: LimitsService,
    private documentFoldersService: DocumentFoldersService,
  ) {}

  async create(createClientDto: CreateClientDto, accountantId: string, userId: string) {
    // Check plan limits before creating client
    const limitCheck = await this.limitsService.checkClientLimit(accountantId);
    if (!limitCheck.allowed) {
      const errorMessage = `${limitCheck.message} ${limitCheck.upgradeMessage}`;
      throw new ForbiddenException({
        message: limitCheck.message,
        upgradeMessage: limitCheck.upgradeMessage,
        suggestedPlans: limitCheck.suggestedPlans,
        usage: limitCheck.usage,
      });
    }

    // Check if email already exists
    const existingUserWithEmail = await this.prisma.user.findUnique({
      where: { email: createClientDto.email },
    });

    if (existingUserWithEmail) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }

    // Check if CPF/CNPJ already exists
    const existingClientWithCpfCnpj = await this.prisma.client.findFirst({
      where: { cpfCnpj: createClientDto.cpfCnpj },
    });

    if (existingClientWithCpfCnpj) {
      throw new ConflictException('Este CPF/CNPJ já está cadastrado');
    }

    // Store temporary password before hashing
    const temporaryPassword = createClientDto.password;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(createClientDto.password, salt);

    // Get accountant information
    const accountant = await this.prisma.accountant.findUnique({
      where: { id: accountantId },
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    // Create user and client in a transaction
    const client = await this.prisma.$transaction(async (prisma) => {
      // Create user
      const user = await prisma.user.create({
        data: {
          email: createClientDto.email,
          name: createClientDto.name,
          passwordHash,
          role: Role.CLIENT,
          isActive: true,
        },
      });

      // Create client
      const newClient = await prisma.client.create({
        data: {
          userId: user.id,
          accountantId,
          cpfCnpj: createClientDto.cpfCnpj,
          phone: createClientDto.phone,
          companyName: createClientDto.companyName,
          expenseModuleEnabled: createClientDto.expenseModuleEnabled || false,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
      });

      return newClient;
    });

    // Log activity
    await this.activityLogService.createLog({
      clientId: client.id,
      userId,
      action: ActivityAction.CLIENT_CREATED,
      description: `Cliente ${createClientDto.name} foi criado`,
      metadata: {
        clientName: createClientDto.name,
        clientEmail: createClientDto.email,
        cpfCnpj: createClientDto.cpfCnpj,
      },
    });

    // Create default document folders for the client
    try {
      await this.documentFoldersService.createDefaultFolders(client.id);
      console.log(`✅ Created default folders for client: ${createClientDto.name}`);
    } catch (error) {
      // Log error but don't fail client creation
      console.error('Failed to create default folders:', error);
    }

    // Send invitation email (async, non-blocking)
    const loginUrl = `${process.env.APP_URL}/login`;
    this.emailService.sendClientInvitation(
      createClientDto.email,
      {
        clientName: createClientDto.name,
        accountantName: accountant?.user.name || 'Seu contador',
        loginUrl,
        temporaryPassword,
      },
    ).catch((error) => {
      // Log error but don't fail the client creation
      console.error('Failed to send invitation email:', error);
    });

    return client;
  }

  async findByUserId(userId: string) {
    const client = await this.prisma.client.findUnique({
      where: {
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            documents: true,
            payments: true,
          },
        },
      },
    });

    if (!client || client.deletedAt) {
      throw new NotFoundException('Cliente não encontrado');
    }

    return client;
  }

  async findAll(accountantId: string) {
    return this.prisma.client.findMany({
      where: {
        accountantId,
        deletedAt: null, // Only return non-deleted clients
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            documents: true,
            payments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, accountantId: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        accountantId,
        deletedAt: null, // Only return non-deleted clients
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            documents: true,
            payments: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto, accountantId: string, userId: string) {
    // Verify client belongs to accountant
    const client = await this.findOne(id, accountantId);

    // Check if email is being changed and if it's already taken
    if (updateClientDto.email && updateClientDto.email !== client.user.email) {
      const existingUserWithEmail = await this.prisma.user.findUnique({
        where: { email: updateClientDto.email },
      });

      if (existingUserWithEmail) {
        throw new ConflictException('Este e-mail já está cadastrado');
      }
    }

    // Check if CPF/CNPJ is being changed and if it's already taken
    if (updateClientDto.cpfCnpj && updateClientDto.cpfCnpj !== client.cpfCnpj) {
      const existingClientWithCpfCnpj = await this.prisma.client.findFirst({
        where: {
          cpfCnpj: updateClientDto.cpfCnpj,
          id: { not: id }
        },
      });

      if (existingClientWithCpfCnpj) {
        throw new ConflictException('Este CPF/CNPJ já está cadastrado');
      }
    }

    // Track changes for activity log
    const changes: string[] = [];
    const metadata: Record<string, any> = {};

    if (updateClientDto.name && updateClientDto.name !== client.user.name) {
      changes.push(`nome alterado de "${client.user.name}" para "${updateClientDto.name}"`);
      metadata.oldName = client.user.name;
      metadata.newName = updateClientDto.name;
    }

    if (updateClientDto.email && updateClientDto.email !== client.user.email) {
      changes.push(`email alterado de "${client.user.email}" para "${updateClientDto.email}"`);
      metadata.oldEmail = client.user.email;
      metadata.newEmail = updateClientDto.email;
    }

    if (updateClientDto.isActive !== undefined && updateClientDto.isActive !== client.user.isActive) {
      const statusText = updateClientDto.isActive ? 'ativado' : 'desativado';
      changes.push(`status do cliente ${statusText}`);
      metadata.statusChanged = true;
      metadata.newStatus = updateClientDto.isActive;
    }

    if (updateClientDto.expenseModuleEnabled !== undefined && updateClientDto.expenseModuleEnabled !== client.expenseModuleEnabled) {
      const moduleText = updateClientDto.expenseModuleEnabled ? 'habilitado' : 'desabilitado';
      changes.push(`módulo de despesas ${moduleText}`);
      metadata.expenseModuleChanged = true;
      metadata.expenseModuleEnabled = updateClientDto.expenseModuleEnabled;
    }

    if (updateClientDto.cpfCnpj && updateClientDto.cpfCnpj !== client.cpfCnpj) {
      changes.push('CPF/CNPJ atualizado');
    }

    if (updateClientDto.phone !== undefined && updateClientDto.phone !== client.phone) {
      changes.push('telefone atualizado');
    }

    if (updateClientDto.companyName !== undefined && updateClientDto.companyName !== client.companyName) {
      changes.push('nome fantasia atualizado');
    }

    // Update user and client in a transaction
    const updatedClient = await this.prisma.$transaction(async (prisma) => {
      // Update user if name, email or isActive changed
      if (updateClientDto.name || updateClientDto.email || updateClientDto.isActive !== undefined) {
        await prisma.user.update({
          where: { id: client.userId },
          data: {
            ...(updateClientDto.name && { name: updateClientDto.name }),
            ...(updateClientDto.email && { email: updateClientDto.email }),
            ...(updateClientDto.isActive !== undefined && { isActive: updateClientDto.isActive }),
          },
        });
      }

      // Update client
      const updated = await prisma.client.update({
        where: { id },
        data: {
          ...(updateClientDto.cpfCnpj && { cpfCnpj: updateClientDto.cpfCnpj }),
          ...(updateClientDto.phone !== undefined && { phone: updateClientDto.phone }),
          ...(updateClientDto.companyName !== undefined && { companyName: updateClientDto.companyName }),
          ...(updateClientDto.expenseModuleEnabled !== undefined && { expenseModuleEnabled: updateClientDto.expenseModuleEnabled }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              documents: true,
              payments: true,
            },
          },
        },
      });

      return updated;
    });

    // Log activity if there were changes
    if (changes.length > 0) {
      // Determine the primary action
      let action = ActivityAction.CLIENT_UPDATED;
      if (metadata.statusChanged) {
        action = ActivityAction.CLIENT_STATUS_CHANGED;
      } else if (metadata.expenseModuleChanged) {
        action = ActivityAction.CLIENT_EXPENSE_MODULE_TOGGLED;
      }

      await this.activityLogService.createLog({
        clientId: id,
        userId,
        action,
        description: `Cliente ${updatedClient.user.name}: ${changes.join(', ')}`,
        metadata,
      });
    }

    return updatedClient;
  }

  async remove(id: string, accountantId: string, userId: string) {
    // Verify client belongs to accountant
    const client = await this.findOne(id, accountantId);

    // Soft delete: set deletedAt timestamp on both client and user
    await this.prisma.$transaction(async (prisma) => {
      // Mark client as deleted
      await prisma.client.update({
        where: { id: client.id },
        data: { deletedAt: new Date() },
      });

      // Mark user as deleted
      await prisma.user.update({
        where: { id: client.userId },
        data: { deletedAt: new Date(), isActive: false },
      });
    });

    // Log activity
    await this.activityLogService.createLog({
      clientId: id,
      userId,
      action: ActivityAction.CLIENT_DELETED,
      description: `Cliente ${client.user.name} foi deletado`,
      metadata: {
        clientName: client.user.name,
        clientEmail: client.user.email,
        cpfCnpj: client.cpfCnpj,
      },
    });

    return { message: 'Cliente deletado com sucesso' };
  }

  /**
   * Update client profile (self-service for clients)
   */
  async updateProfile(updateProfileDto: UpdateProfileDto, userId: string) {
    // Get client by userId
    const client = await this.prisma.client.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!client || client.deletedAt) {
      throw new NotFoundException('Cliente não encontrado');
    }

    // Check if email is being changed and if it's already taken
    if (updateProfileDto.email && updateProfileDto.email !== client.user.email) {
      const existingUserWithEmail = await this.prisma.user.findUnique({
        where: { email: updateProfileDto.email },
      });

      if (existingUserWithEmail) {
        throw new ConflictException('Este e-mail já está cadastrado');
      }
    }

    // Update user and client in a transaction
    const updatedClient = await this.prisma.$transaction(async (prisma) => {
      // Update user if name or email changed
      if (updateProfileDto.name || updateProfileDto.email) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            ...(updateProfileDto.name && { name: updateProfileDto.name }),
            ...(updateProfileDto.email && { email: updateProfileDto.email }),
          },
        });
      }

      // Update client if phone changed
      const updated = await prisma.client.update({
        where: { id: client.id },
        data: {
          ...(updateProfileDto.phone !== undefined && { phone: updateProfileDto.phone }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
      });

      return updated;
    });

    return updatedClient;
  }

  /**
   * Get statistics for a client (for client dashboard)
   */
  async getStatistics(clientId: string) {
    // Get document counts
    const [totalDocuments, pendingDocumentRequests] = await Promise.all([
      this.prisma.document.count({
        where: { clientId, deletedAt: null },
      }),
      this.prisma.documentRequest.count({
        where: { clientId, status: 'PENDING' },
      }),
    ]);

    // Get payment counts and amounts
    const [totalPayments, paidPayments, pendingPayments, overduePayments] = await Promise.all([
      this.prisma.payment.count({
        where: { clientId },
      }),
      this.prisma.payment.count({
        where: { clientId, status: 'PAID' },
      }),
      this.prisma.payment.count({
        where: { clientId, status: 'PENDING' },
      }),
      this.prisma.payment.count({
        where: { clientId, status: 'OVERDUE' },
      }),
    ]);

    // Get payments without receipt
    const paymentsWithoutReceipt = await this.prisma.payment.count({
      where: {
        clientId,
        status: 'PAID',
        receiptPath: null,
      },
    });

    return {
      documents: {
        total: totalDocuments,
        pendingRequests: pendingDocumentRequests,
      },
      payments: {
        total: totalPayments,
        paid: paidPayments,
        pending: pendingPayments,
        overdue: overduePayments,
        withoutReceipt: paymentsWithoutReceipt,
      },
      pendingItems: pendingDocumentRequests + paymentsWithoutReceipt,
    };
  }

  async getAccountantPlan(clientId: string) {
    // Find client with accountant relation
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        accountant: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
            subscription: {
              include: {
                plan: true,
              },
            },
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    if (!client.accountant) {
      throw new NotFoundException('Contador não encontrado');
    }

    // Check if accountant has a subscription
    const subscription = client.accountant.subscription;

    if (!subscription) {
      return {
        accountantName: client.accountant.user.name,
        plan: {
          name: 'Sem plano',
          status: 'EXPIRED',
          trialEndsAt: null,
          currentPeriodEnd: null,
        },
      };
    }

    // Determine status
    let status = subscription.status;

    // Calculate days remaining if trialing
    let daysRemaining = null as number | null;
    if (subscription.trialEnd && subscription.status === 'TRIALING') {
      const now = new Date();
      const trialEnd = new Date(subscription.trialEnd);
      daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      accountantName: client.accountant.user.name,
      plan: {
        name: subscription.plan?.name || 'Plano Desconhecido',
        status: status,
        trialEndsAt: subscription.trialEnd,
        currentPeriodEnd: subscription.currentPeriodEnd,
        daysRemaining: daysRemaining,
      },
    };
  }

  async getClientUsage(clientId: string) {
    // Find client with accountant and subscription
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
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
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    if (!client.accountant) {
      throw new NotFoundException('Contador não encontrado');
    }

    // Get plan limits from limitsJson
    const subscription = client.accountant.subscription;
    let limits = {
      maxPayments: 500,
      maxExpenses: 1000,
      maxDocuments: 200,
      storageGB: 10,
    };

    if (subscription?.plan?.limitsJson) {
      const planLimits = subscription.plan.limitsJson as any;
      limits = {
        maxPayments: planLimits.maxPayments || 500,
        maxExpenses: planLimits.maxExpenses || 1000,
        maxDocuments: planLimits.maxDocuments || 200,
        storageGB: planLimits.storageGB || 10,
      };
    }

    // Count usage for this specific client
    const [paymentsCount, expensesCount, documentsData] = await Promise.all([
      this.prisma.payment.count({
        where: { clientId },
      }),
      this.prisma.expense.count({
        where: { clientId },
      }),
      this.prisma.document.aggregate({
        where: { clientId, deletedAt: null },
        _count: true,
        _sum: {
          fileSize: true,
        },
      }),
    ]);

    const documentsCount = documentsData._count;
    const storageUsedBytes = documentsData._sum.fileSize || 0;
    const storageUsedGB = Number((storageUsedBytes / (1024 * 1024 * 1024)).toFixed(2));

    // Calculate percentages
    const percentages = {
      payments: Math.round((paymentsCount / limits.maxPayments) * 100),
      expenses: Math.round((expensesCount / limits.maxExpenses) * 100),
      documents: Math.round((documentsCount / limits.maxDocuments) * 100),
      storage: Math.round((storageUsedGB / limits.storageGB) * 100),
    };

    return {
      limits,
      usage: {
        paymentsCount,
        expensesCount,
        documentsCount,
        storageUsedGB,
      },
      percentages,
    };
  }
}
