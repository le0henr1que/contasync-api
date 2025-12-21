import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class InvitationsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Create an invitation for a new client
   */
  async createInvitation(
    accountantId: string,
    createInvitationDto: CreateInvitationDto,
  ) {
    const { email, name, cpfCnpj } = createInvitationDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(
        'Já existe um usuário cadastrado com este email',
      );
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
        name,
        cpfCnpj,
        token,
        expiresAt,
      },
    });

    // Send invitation email
    const loginUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;
    await this.emailService.sendClientInvitation(email, {
      clientName: name,
      accountantName: accountant.user.name,
      loginUrl,
    });

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

    return {
      email: invitation.email,
      name: invitation.name,
      accountantName: invitation.accountant.user.name,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Accept an invitation and create client account
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

    // Hash password
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

      // Create client
      const client = await prisma.client.create({
        data: {
          userId: user.id,
          accountantId: invitation.accountantId,
          cpfCnpj: userCpfCnpj,
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

    return {
      message: 'Convite aceito com sucesso',
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
