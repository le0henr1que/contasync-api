import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
export declare class InvitationsController {
    private readonly invitationsService;
    constructor(invitationsService: InvitationsService);
    createInvitation(req: any, createInvitationDto: CreateInvitationDto): Promise<{
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
    findAllInvitations(req: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        email: string;
        cpfCnpj: string;
        expiresAt: Date;
        acceptedAt: Date;
    }[]>;
    resendInvitation(id: string, req: any): Promise<{
        message: string;
    }>;
}
