import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
export declare class InvitationsService {
    private prisma;
    private emailService;
    constructor(prisma: PrismaService, emailService: EmailService);
    createInvitation(accountantId: string, createInvitationDto: CreateInvitationDto): Promise<{
        message: string;
        invitation: {
            id: string;
            email: string;
            name: string;
            expiresAt: Date;
        };
    }>;
    validateInvitation(token: string): Promise<{
        email: string;
        name: string;
        accountantName: string;
        expiresAt: Date;
    }>;
    acceptInvitation(acceptInvitationDto: AcceptInvitationDto): Promise<{
        message: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("@prisma/client").$Enums.Role;
        };
    }>;
    findAllByAccountant(accountantId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        email: string;
        cpfCnpj: string;
        expiresAt: Date;
        acceptedAt: Date;
    }[]>;
    resendInvitation(invitationId: string, accountantId: string): Promise<{
        message: string;
    }>;
}
