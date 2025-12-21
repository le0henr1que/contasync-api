import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestStatus } from '@prisma/client';
import { CreateDocumentRequestDto } from './dto/create-document-request.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class DocumentRequestsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async create(createDocumentRequestDto: CreateDocumentRequestDto) {
    // Get client information
    const client = await this.prisma.client.findUnique({
      where: { id: createDocumentRequestDto.clientId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!client) {
      throw new Error('Cliente não encontrado');
    }

    // Create document request
    const documentRequest = await this.prisma.documentRequest.create({
      data: {
        clientId: createDocumentRequestDto.clientId,
        type: createDocumentRequestDto.type,
        description: createDocumentRequestDto.description,
        dueDate: createDocumentRequestDto.dueDate
          ? new Date(createDocumentRequestDto.dueDate)
          : null,
        status: RequestStatus.PENDING,
      },
    });

    // Send email notification (async, non-blocking)
    const portalUrl = `${process.env.APP_URL}/documentos-solicitados`;
    this.emailService
      .sendDocumentRequest(client.user.email, {
        clientName: client.user.name,
        documentType: createDocumentRequestDto.type,
        deadline: createDocumentRequestDto.dueDate
          ? new Date(createDocumentRequestDto.dueDate).toLocaleDateString(
              'pt-BR',
            )
          : 'Não especificado',
        message: createDocumentRequestDto.description,
        portalUrl,
      })
      .catch((error) => {
        console.error('Failed to send document request email:', error);
      });

    return documentRequest;
  }

  async findClientRequests(clientId: string) {
    const requests = await this.prisma.documentRequest.findMany({
      where: {
        clientId,
        status: RequestStatus.PENDING,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests;
  }
}
