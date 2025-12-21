import { DocumentRequestsService } from './document-requests.service';
import { CreateDocumentRequestDto } from './dto/create-document-request.dto';
export declare class DocumentRequestsController {
    private readonly documentRequestsService;
    constructor(documentRequestsService: DocumentRequestsService);
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
    findClientRequests(req: any): Promise<{
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
