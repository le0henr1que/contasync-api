import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentRequestDto } from './dto/create-document-request.dto';
import { EmailService } from '../email/email.service';
export declare class DocumentRequestsService {
    private prisma;
    private emailService;
    constructor(prisma: PrismaService, emailService: EmailService);
    create(createDocumentRequestDto: CreateDocumentRequestDto): Promise<{
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.RequestStatus;
        clientId: string;
        type: string;
        dueDate: Date | null;
        fulfilledAt: Date | null;
    }>;
    findClientRequests(clientId: string): Promise<{
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.RequestStatus;
        clientId: string;
        type: string;
        dueDate: Date | null;
        fulfilledAt: Date | null;
    }[]>;
}
