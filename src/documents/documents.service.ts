import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { RequestDocumentDto } from './dto/request-document.dto';
import { UploadResponseDto } from './dto/upload-response.dto';
import { Prisma, RequestStatus, DocumentType } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { LimitsService } from '../limits/limits.service';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private limitsService: LimitsService,
  ) {}

  async findAll(queryDto: QueryDocumentsDto, accountantId: string) {
    const {
      search,
      type,
      clientId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = queryDto;

    // Build where clause
    const where: Prisma.DocumentWhereInput = {
      client: {
        accountantId,
        deletedAt: null,
      },
    };

    // Add filters
    if (type) {
      where.type = type;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    // Add search
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } },
        {
          client: {
            user: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build orderBy
    const orderBy: Prisma.DocumentOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries
    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      documents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async upload(
    uploadDto: UploadDocumentDto,
    file: Express.Multer.File,
    userId: string,
    accountantId: string,
  ) {
    // Check document limit before uploading
    const limitCheck = await this.limitsService.checkDocumentLimit(uploadDto.clientId);
    if (!limitCheck.allowed) {
      throw new ForbiddenException({
        message: limitCheck.message,
        upgradeMessage: limitCheck.upgradeMessage,
        usage: limitCheck.usage,
      });
    }

    // Verify client belongs to accountant
    const client = await this.prisma.client.findFirst({
      where: {
        id: uploadDto.clientId,
        accountantId,
        deletedAt: null,
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    // Validate folder if provided
    if (uploadDto.folderId) {
      const folder = await this.prisma.documentFolder.findFirst({
        where: {
          id: uploadDto.folderId,
          clientId: uploadDto.clientId,
        },
      });

      if (!folder) {
        throw new BadRequestException('Pasta não encontrada ou não pertence ao cliente');
      }
    }

    // Create unique filename
    const fileExt = path.extname(file.originalname);
    const timestamp = Date.now();
    const uniqueFilename = `${uploadDto.clientId}-${timestamp}${fileExt}`;
    const filePath = path.join('uploads', uniqueFilename);

    // Save file to disk
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(path.join(process.cwd(), filePath), file.buffer);

    // Create document record
    const document = await this.prisma.document.create({
      data: {
        clientId: uploadDto.clientId,
        folderId: uploadDto.folderId, // Include folderId (can be null)
        type: uploadDto.type,
        title: uploadDto.title || file.originalname,
        description: uploadDto.description,
        filePath,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        createdById: userId,
      },
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
        client: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return document;
  }

  async requestDocument(
    requestDto: RequestDocumentDto,
    accountantId: string,
  ) {
    // Verify client belongs to accountant
    const client = await this.prisma.client.findFirst({
      where: {
        id: requestDto.clientId,
        accountantId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    // Validate due date is in the future
    const dueDate = new Date(requestDto.dueDate);
    if (dueDate <= new Date()) {
      throw new BadRequestException('Prazo deve ser no futuro');
    }

    // Create document request
    const request = await this.prisma.documentRequest.create({
      data: {
        clientId: requestDto.clientId,
        type: requestDto.type,
        description: requestDto.description,
        dueDate,
        status: RequestStatus.PENDING,
      },
      include: {
        client: {
          select: {
            id: true,
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

    // TODO: Send email notification to client
    // This will be implemented when email service is set up

    return request;
  }

  async findOne(id: string, accountantId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        client: {
          accountantId,
          deletedAt: null,
        },
      },
      include: {
        client: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    return document;
  }

  async getDocumentFile(id: string, accountantId: string) {
    const document = await this.findOne(id, accountantId);

    const filePath = path.join(process.cwd(), document.filePath);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Arquivo não encontrado');
    }

    return {
      filePath,
      fileName: document.fileName,
      mimeType: document.mimeType,
    };
  }

  async uploadResponse(
    uploadDto: UploadResponseDto,
    file: Express.Multer.File,
    userId: string,
    clientId: string,
  ) {
    // Verify request exists and belongs to client
    const request = await this.prisma.documentRequest.findFirst({
      where: {
        id: uploadDto.requestId,
        clientId,
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    // Check if request is still pending
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Esta solicitação já foi atendida');
    }

    // Create unique filename
    const fileExt = path.extname(file.originalname);
    const timestamp = Date.now();
    const uniqueFilename = `${clientId}-${timestamp}${fileExt}`;
    const filePath = path.join('uploads', uniqueFilename);

    // Save file to disk
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(path.join(process.cwd(), filePath), file.buffer);

    // Create document record linked to request
    const document = await this.prisma.document.create({
      data: {
        clientId,
        requestId: uploadDto.requestId,
        type: request.type as DocumentType,
        title: file.originalname,
        description: uploadDto.notes,
        filePath,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        createdById: userId,
      },
      include: {
        client: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update request status to fulfilled
    await this.prisma.documentRequest.update({
      where: { id: uploadDto.requestId },
      data: {
        status: RequestStatus.FULFILLED,
        fulfilledAt: new Date(),
      },
    });

    return document;
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
   * Find all documents for a specific client
   */
  async findAllForClient(queryDto: QueryDocumentsDto, clientId: string) {
    const {
      search,
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = queryDto;

    // Build where clause - only this client's documents
    const where: Prisma.DocumentWhereInput = {
      clientId,
      deletedAt: null,
    };

    // Add filters
    if (type) {
      where.type = type;
    }

    // Add search
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build orderBy
    const orderBy: Prisma.DocumentOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries
    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      documents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find one document for a specific client
   */
  async findOneForClient(id: string, clientId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        clientId,
        deletedAt: null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    return document;
  }

  /**
   * Get document file for a specific client
   */
  async getDocumentFileForClient(id: string, clientId: string) {
    const document = await this.findOneForClient(id, clientId);

    const filePath = path.join(process.cwd(), document.filePath);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Arquivo não encontrado');
    }

    return {
      filePath,
      fileName: document.fileName,
      mimeType: document.mimeType,
    };
  }

  /**
   * Find all folders with documents grouped (for client view)
   */
  async findAllByClientGrouped(clientId: string, queryDto: QueryDocumentsDto) {
    const { search, type } = queryDto;

    console.log('🔍 findAllByClientGrouped called with:', { clientId, search, type });

    const folders = await this.prisma.documentFolder.findMany({
      where: { clientId },
      include: {
        documents: {
          where: {
            deletedAt: null,
            ...(search && {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { fileName: { contains: search, mode: 'insensitive' } },
              ],
            }),
            ...(type && { type }),
          },
          include: {
            paymentAttachments: {
              include: {
                payment: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    console.log(`📁 Found ${folders.length} total folders`);

    // Get documents without folderId (uncategorized)
    const uncategorizedDocs = await this.prisma.document.findMany({
      where: {
        clientId,
        folderId: null,
        deletedAt: null,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { fileName: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(type && { type }),
      },
      include: {
        paymentAttachments: {
          include: {
            payment: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Always show default folders, but filter out non-default empty folders
    const filteredFolders = folders.filter(
      (folder) => folder.isDefault || folder.documents.length > 0,
    );

    console.log(`✅ After filtering: ${filteredFolders.length} folders (showing defaults + non-empty)`);
    console.log('Filtered folders:', filteredFolders.map(f => ({ name: f.name, isDefault: f.isDefault, docsCount: f.documents.length })));

    // If there are uncategorized documents, add them as a virtual folder
    if (uncategorizedDocs.length > 0) {
      console.log(`📎 Adding ${uncategorizedDocs.length} uncategorized documents as virtual folder`);
      const uncategorizedFolder = {
        id: 'uncategorized',
        clientId,
        name: 'Sem Pasta',
        type: null,
        icon: '📎',
        color: '#94a3b8',
        description: 'Documentos sem pasta definida',
        isDefault: false,
        sortOrder: 999,
        createdAt: new Date(),
        updatedAt: new Date(),
        documents: uncategorizedDocs,
        _count: { documents: uncategorizedDocs.length },
      };

      filteredFolders.push(uncategorizedFolder as any);
    }

    console.log(`🎉 Returning ${filteredFolders.length} folders total`);
    return filteredFolders;
  }

  /**
   * Find all folders with documents grouped for accountant viewing a specific client
   */
  async findAllByClientGroupedForAccountant(
    clientId: string,
    accountantId: string,
    queryDto: QueryDocumentsDto,
  ) {
    // Verify client belongs to accountant
    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        accountantId,
        deletedAt: null,
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    // Use the same method as client view
    return this.findAllByClientGrouped(clientId, queryDto);
  }

  async delete(id: string, accountantId: string) {
    // Verify document exists and belongs to accountant's client
    const document = await this.findOne(id, accountantId);

    // Delete physical file
    const filePath = path.join(process.cwd(), document.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete document record
    await this.prisma.document.delete({
      where: { id },
    });

    return { message: 'Documento deletado com sucesso' };
  }
}
