import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { Role, NotificationType } from '@prisma/client';

@Injectable()
export class InvitationsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private jwtService: JwtService,
  ) {}

  /**
   * Create an invitation for a new client or existing individual client
   */
  async createInvitation(
    accountantId: string,
    createInvitationDto: CreateInvitationDto,
  ) {
    const { email, name, cpfCnpj } = createInvitationDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      include: {
        client: true,
      },
    });

    // Use existing user data if available
    let inviteName = name;
    let inviteCpfCnpj = cpfCnpj;

    // If user exists, validate they can be invited
    if (existingUser) {
      // Only allow inviting if:
      // 1. User is a CLIENT
      // 2. User doesn't have an accountant yet (is individual)
      if (existingUser.role !== Role.CLIENT) {
        throw new ConflictException(
          'Este email pertence a uma conta de contador',
        );
      }

      if (existingUser.client && existingUser.client.accountantId) {
        throw new ConflictException(
          'Este cliente já está vinculado a outro contador',
        );
      }

      // User is an individual client, can be invited
      // Use existing user data if name/cpfCnpj not provided
      inviteName = name || existingUser.name;
      inviteCpfCnpj = cpfCnpj || existingUser.client?.cpfCnpj;
    }

    // Check for pending invitation
    const pendingInvitation = await this.prisma.invitation.findFirst({
      where: {
        accountantId,
        email,
        acceptedAt: null,
        expiresAt: { gte: new Date() },
      },
    });

    if (pendingInvitation) {
      throw new ConflictException(
        'Já existe um convite pendente para este email',
      );
    }

    // Get accountant info
    const accountant = await this.prisma.accountant.findUnique({
      where: { id: accountantId },
      include: { user: true },
    });

    if (!accountant) {
      throw new NotFoundException('Contador não encontrado');
    }

    // Generate invitation token (valid for 7 days)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const invitation = await this.prisma.invitation.create({
      data: {
        accountantId,
        email,
        name: inviteName || 'Cliente',
        cpfCnpj: inviteCpfCnpj,
        token,
        expiresAt,
      },
    });

    // Send invitation email
    const loginUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;
    await this.emailService.sendClientInvitation(email, {
      clientName: inviteName || 'Cliente',
      accountantName: accountant.user.name,
      loginUrl,
    });

    // Create notification for existing user
    if (existingUser && existingUser.client) {
      await this.notificationsService.create({
        clientId: existingUser.client.id,
        type: NotificationType.INVITATION_RECEIVED,
        title: 'Novo convite recebido',
        message: `${accountant.user.name} enviou um convite para você se vincular ao escritório de contabilidade.`,
        metadata: {
          invitationId: invitation.id,
          accountantName: accountant.user.name,
          token: token,
        },
      });
    }

    return {
      message: 'Convite enviado com sucesso',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        expiresAt: invitation.expiresAt,
      },
    };
  }

  /**
   * Validate an invitation token
   */
  async validateInvitation(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        accountant: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException('Este convite já foi aceito');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Este convite expirou');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
      include: {
        client: true,
      },
    });

    const userExists = !!existingUser;

    return {
      email: invitation.email,
      name: invitation.name,
      accountantName: invitation.accountant.user.name,
      expiresAt: invitation.expiresAt,
      userExists, // Indicates if user already has an account
    };
  }

  /**
   * Accept an invitation and create client account or link existing individual client
   */
  async acceptInvitation(acceptInvitationDto: AcceptInvitationDto) {
    const { token, password } = acceptInvitationDto;

    // Validate invitation
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        accountant: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException('Este convite já foi aceito');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Este convite expirou');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
      include: {
        client: true,
      },
    });

    // If user exists (individual client), just link to accountant
    if (existingUser) {
      if (!existingUser.client) {
        throw new BadRequestException(
          'Usuário existe mas não é um cliente',
        );
      }

      if (existingUser.client.accountantId) {
        throw new BadRequestException(
          'Este cliente já está vinculado a um contador',
        );
      }

      // Update client to link to accountant and enable accounting modules
      const result = await this.prisma.$transaction(async (prisma) => {
        const client = await prisma.client.update({
          where: { id: existingUser.client.id },
          data: {
            accountantId: invitation.accountantId,
            expenseModuleEnabled: true, // Enable accounting modules
            // Keep financialModuleEnabled as is (user's personal finance module)
          },
        });

        // Mark invitation as accepted
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: {
            acceptedAt: new Date(),
          },
        });

        return { user: existingUser, client };
      });

      // Generate JWT token for automatic login
      const payload = {
        sub: result.user.id,
        email: result.user.email,
        role: result.user.role,
        clientId: result.client.id,
      };
      const accessToken = this.jwtService.sign(payload);

      return {
        message: 'Conta vinculada ao contador com sucesso',
        accessToken,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
      };
    }

    // User doesn't exist, create new user and client
    if (!password) {
      throw new BadRequestException(
        'Senha é obrigatória para novos usuários',
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and client in a transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // Create user
      const userName = invitation.name || 'Cliente';
      const userCpfCnpj = invitation.cpfCnpj || '';

      const user = await prisma.user.create({
        data: {
          name: userName,
          email: invitation.email,
          passwordHash,
          role: Role.CLIENT,
          isActive: true,
        },
      });

      // Create client with accounting modules enabled
      const client = await prisma.client.create({
        data: {
          userId: user.id,
          accountantId: invitation.accountantId,
          cpfCnpj: userCpfCnpj,
          expenseModuleEnabled: true,     // Enable accounting modules (managed by accountant)
          financialModuleEnabled: false,  // Disable personal finance module by default
        },
      });

      // Mark invitation as accepted
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          acceptedAt: new Date(),
        },
      });

      return { user, client };
    });

    // Generate JWT token for automatic login
    const payload = {
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
      clientId: result.client.id,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      message: 'Convite aceito com sucesso',
      accessToken,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
    };
  }

  /**
   * Get all invitations for an accountant
   */
  async findAllByAccountant(accountantId: string) {
    return this.prisma.invitation.findMany({
      where: { accountantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        cpfCnpj: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get pending invitations for a client by email
   */
  async findPendingInvitationsForClient(email: string) {
    return this.prisma.invitation.findMany({
      where: {
        email,
        acceptedAt: null,
        expiresAt: { gte: new Date() },
      },
      include: {
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Resend an invitation
   */
  async resendInvitation(invitationId: string, accountantId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        accountantId,
      },
      include: {
        accountant: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException('Este convite já foi aceito');
    }

    // Generate new token and extend expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: {
        token,
        expiresAt,
      },
    });

    // Resend email
    const loginUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;
    await this.emailService.sendClientInvitation(invitation.email, {
      clientName: invitation.name || 'Cliente',
      accountantName: invitation.accountant.user.name,
      loginUrl,
    });

    return {
      message: 'Convite reenviado com sucesso',
    };
  }
}
