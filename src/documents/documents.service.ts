import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { RequestDocumentDto } from './dto/request-document.dto';
import { UploadResponseDto } from './dto/upload-response.dto';
import { Prisma, RequestStatus, DocumentType } from '@prisma/client';
import * as path from 'path';
import { LimitsService } from '../limits/limits.service';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private limitsService: LimitsService,
    private storageService: StorageService,
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
    console.log('\n📋 ========== DOCUMENT UPLOAD STARTED ==========');
    console.log('👤 User ID:', userId);
    console.log('🏢 Accountant ID:', accountantId);
    console.log('📂 Client ID:', uploadDto.clientId);
    console.log('📄 File Name:', file.originalname);
    console.log('📊 File Size:', file.size, 'bytes');
    console.log('🎭 MIME Type:', file.mimetype);

    // Check document limit before uploading
    console.log('⏳ Checking document limits...');
    const limitCheck = await this.limitsService.checkDocumentLimit(uploadDto.clientId);
    if (!limitCheck.allowed) {
      console.error('❌ Document limit exceeded!');
      throw new ForbiddenException({
        message: limitCheck.message,
        upgradeMessage: limitCheck.upgradeMessage,
        usage: limitCheck.usage,
      });
    }
    console.log('✅ Document limit OK');

    // Verify client belongs to accountant
    console.log('⏳ Verifying client ownership...');
    const client = await this.prisma.client.findFirst({
      where: {
        id: uploadDto.clientId,
        accountantId,
        deletedAt: null,
      },
    });

    if (!client) {
      console.error('❌ Client not found!');
      throw new NotFoundException('Cliente não encontrado');
    }
    console.log('✅ Client verified');

    // Validate folder if provided
    if (uploadDto.folderId) {
      console.log('⏳ Validating folder...');
      const folder = await this.prisma.documentFolder.findFirst({
        where: {
          id: uploadDto.folderId,
          clientId: uploadDto.clientId,
        },
      });

      if (!folder) {
        console.error('❌ Folder not found!');
        throw new BadRequestException('Pasta não encontrada ou não pertence ao cliente');
      }
      console.log('✅ Folder validated');
    }

    // Generate unique S3 key for the file
    console.log('🔑 Generating S3 key...');
    const s3Key = this.storageService.generateFileKey(uploadDto.clientId, file.originalname);
    console.log('✅ S3 Key generated:', s3Key);

    // Upload file to S3
    console.log('☁️  Uploading file to S3...');
    await this.storageService.uploadFile(s3Key, file.buffer, file.mimetype);
    console.log('✅ File uploaded to S3 successfully!');

    // Create document record with S3 key as filePath
    console.log('💾 Creating document record in database...');
    const document = await this.prisma.document.create({
      data: {
        clientId: uploadDto.clientId,
        folderId: uploadDto.folderId, // Include folderId (can be null)
        type: uploadDto.type,
        title: uploadDto.title || file.originalname,
        description: uploadDto.description,
        filePath: s3Key, // Store S3 key instead of local path
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

    console.log('✅ Document record created in database');
    console.log('🆔 Document ID:', document.id);
    console.log('📁 Stored S3 Path:', document.filePath);
    console.log('========== DOCUMENT UPLOAD COMPLETED ==========\n');

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
    console.log('\n📥 ========== GET DOCUMENT FILE (ACCOUNTANT) ==========');
    console.log('🆔 Document ID:', id);
    console.log('🏢 Accountant ID:', accountantId);

    const document = await this.findOne(id, accountantId);
    console.log('📄 File Name:', document.fileName);
    console.log('📁 S3 Path:', document.filePath);

    // Check if file exists in S3
    console.log('⏳ Checking if file exists in S3...');
    const exists = await this.storageService.fileExists(document.filePath);
    if (!exists) {
      console.error('❌ File not found in S3!');
      throw new NotFoundException('Arquivo não encontrado');
    }
    console.log('✅ File exists in S3');

    // Download file from S3
    console.log('☁️  Downloading file from S3...');
    const fileStream = await this.storageService.downloadFile(document.filePath);
    console.log('✅ File stream ready');
    console.log('========== GET DOCUMENT FILE COMPLETED ==========\n');

    return {
      fileStream,
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
    console.log('\n📨 ========== UPLOAD RESPONSE STARTED ==========');
    console.log('👤 User ID:', userId);
    console.log('📂 Client ID:', clientId);
    console.log('🆔 Request ID:', uploadDto.requestId);
    console.log('📄 File Name:', file.originalname);

    // Verify request exists and belongs to client
    console.log('⏳ Verifying document request...');
    const request = await this.prisma.documentRequest.findFirst({
      where: {
        id: uploadDto.requestId,
        clientId,
      },
    });

    if (!request) {
      console.error('❌ Document request not found!');
      throw new NotFoundException('Solicitação não encontrada');
    }
    console.log('✅ Request verified');

    // Check if request is still pending
    if (request.status !== RequestStatus.PENDING) {
      console.error('❌ Request already fulfilled!');
      throw new BadRequestException('Esta solicitação já foi atendida');
    }

    // Generate unique S3 key for the file
    console.log('🔑 Generating S3 key...');
    const s3Key = this.storageService.generateFileKey(clientId, file.originalname);
    console.log('✅ S3 Key generated:', s3Key);

    // Upload file to S3
    console.log('☁️  Uploading file to S3...');
    await this.storageService.uploadFile(s3Key, file.buffer, file.mimetype);
    console.log('✅ File uploaded to S3 successfully!');

    // Create document record linked to request with S3 key as filePath
    console.log('💾 Creating document record...');
    const document = await this.prisma.document.create({
      data: {
        clientId,
        requestId: uploadDto.requestId,
        type: request.type as DocumentType,
        title: file.originalname,
        description: uploadDto.notes,
        filePath: s3Key, // Store S3 key instead of local path
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
    console.log('⏳ Updating request status...');
    await this.prisma.documentRequest.update({
      where: { id: uploadDto.requestId },
      data: {
        status: RequestStatus.FULFILLED,
        fulfilledAt: new Date(),
      },
    });

    console.log('✅ Upload response completed!');
    console.log('🆔 Document ID:', document.id);
    console.log('📁 S3 Path:', document.filePath);
    console.log('========== UPLOAD RESPONSE COMPLETED ==========\n');

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
    console.log('\n📥 ========== GET DOCUMENT FILE (CLIENT) ==========');
    console.log('🆔 Document ID:', id);
    console.log('👤 Client ID:', clientId);

    const document = await this.findOneForClient(id, clientId);
    console.log('📄 File Name:', document.fileName);
    console.log('📁 S3 Path:', document.filePath);

    // Check if file exists in S3
    console.log('⏳ Checking if file exists in S3...');
    const exists = await this.storageService.fileExists(document.filePath);
    if (!exists) {
      console.error('❌ File not found in S3!');
      throw new NotFoundException('Arquivo não encontrado');
    }
    console.log('✅ File exists in S3');

    // Download file from S3
    console.log('☁️  Downloading file from S3...');
    const fileStream = await this.storageService.downloadFile(document.filePath);
    console.log('✅ File stream ready');
    console.log('========== GET DOCUMENT FILE COMPLETED ==========\n');

    return {
      fileStream,
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

    // Delete file from S3
    try {
      await this.storageService.deleteFile(document.filePath);
    } catch (error) {
      // Log error but continue with database deletion
      console.error('Error deleting file from S3:', error);
    }

    // Delete document record
    await this.prisma.document.delete({
      where: { id },
    });

    return { message: 'Documento deletado com sucesso' };
  }
}
