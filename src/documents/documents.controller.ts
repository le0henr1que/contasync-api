import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { RequestDocumentDto } from './dto/request-document.dto';
import { UploadResponseDto } from './dto/upload-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // Client gets their own documents (flat list)
  @Get('me')
  @Roles(Role.CLIENT)
  async getMyDocuments(@Query() queryDto: QueryDocumentsDto, @Request() req) {
    const userId = req.user.id;
    const client = await this.documentsService.getClientByUserId(userId);
    return this.documentsService.findAllForClient(queryDto, client.id);
  }

  // Client gets their documents grouped by folders
  @Get('me/grouped')
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Get client documents grouped by folders (Google Drive style)' })
  @ApiResponse({ status: 200, description: 'Returns folders with documents inside' })
  async getMyDocumentsGrouped(@Query() queryDto: QueryDocumentsDto, @Request() req) {
    const userId = req.user.id;
    const client = await this.documentsService.getClientByUserId(userId);
    return this.documentsService.findAllByClientGrouped(client.id, queryDto);
  }

  // Client uploads their own documents
  @Post('me')
  @Roles(Role.CLIENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Client uploads a document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/jpg',
          'image/png',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Tipo de arquivo não permitido. Use PDF, JPG ou PNG.',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadClientDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadDocumentDto,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    const userId = req.user.id;
    const client = await this.documentsService.getClientByUserId(userId);
    const accountantId = client.accountantId || undefined; // May be undefined for individual clients

    // Override clientId with the authenticated client's ID
    uploadDto.clientId = client.id;

    return this.documentsService.upload(uploadDto, file, userId, accountantId);
  }

  @Get()
  @Roles(Role.ACCOUNTANT)
  async findAll(@Query() queryDto: QueryDocumentsDto, @Request() req) {
    const accountantId = req.user.accountant.id;
    return this.documentsService.findAll(queryDto, accountantId);
  }

  // Accountant gets simple list of client documents (for modals, etc)
  @Get('client/:clientId')
  @Roles(Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Get list of client documents (for accountant)' })
  @ApiResponse({ status: 200, description: 'Returns list of documents' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async getClientDocuments(
    @Param('clientId') clientId: string,
    @Request() req,
  ) {
    const accountantId = req.user.accountant.id;

    // Verify client belongs to accountant
    const client = await this.documentsService['prisma'].client.findFirst({
      where: {
        id: clientId,
        accountantId,
        deletedAt: null,
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    // Get all documents for this client
    const documents = await this.documentsService['prisma'].document.findMany({
      where: {
        clientId,
        deletedAt: null,
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { documents };
  }

  // Accountant gets client documents grouped by folders
  @Get('client/:clientId/grouped')
  @Roles(Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Get specific client documents grouped by folders (for accountant)' })
  @ApiResponse({ status: 200, description: 'Returns folders with documents inside' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async getClientDocumentsGrouped(
    @Param('clientId') clientId: string,
    @Query() queryDto: QueryDocumentsDto,
    @Request() req,
  ) {
    const accountantId = req.user.accountant.id;
    return this.documentsService.findAllByClientGroupedForAccountant(
      clientId,
      accountantId,
      queryDto,
    );
  }

  @Post()
  @Roles(Role.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/jpg',
          'image/png',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Tipo de arquivo não permitido. Use PDF, JPG ou PNG.',
            ),
            false,
          );
        }
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadDocumentDto,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    const userId = req.user.id;
    const accountantId = req.user.accountant.id;

    return this.documentsService.upload(uploadDto, file, userId, accountantId);
  }

  @Post('request')
  @Roles(Role.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  async requestDocument(
    @Body() requestDto: RequestDocumentDto,
    @Request() req,
  ) {
    const accountantId = req.user.accountant.id;
    return this.documentsService.requestDocument(requestDto, accountantId);
  }

  // Client gets one of their documents
  @Get('me/:id')
  @Roles(Role.CLIENT)
  async getMyDocument(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const client = await this.documentsService.getClientByUserId(userId);
    return this.documentsService.findOneForClient(id, client.id);
  }

  // Client downloads one of their documents
  @Get('me/:id/download')
  @Roles(Role.CLIENT)
  async downloadMyDocument(
    @Param('id') id: string,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user.id;
    const client = await this.documentsService.getClientByUserId(userId);
    const { fileStream, fileName, mimeType } =
      await this.documentsService.getDocumentFileForClient(id, client.id);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    return new StreamableFile(fileStream);
  }

  @Get(':id')
  @Roles(Role.ACCOUNTANT)
  async findOne(@Param('id') id: string, @Request() req) {
    const accountantId = req.user.accountant.id;
    return this.documentsService.findOne(id, accountantId);
  }

  @Get(':id/download')
  @Roles(Role.ACCOUNTANT)
  async download(
    @Param('id') id: string,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accountantId = req.user.accountant.id;
    const { fileStream, fileName, mimeType } =
      await this.documentsService.getDocumentFile(id, accountantId);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    return new StreamableFile(fileStream);
  }

  @Post('upload-response')
  @Roles(Role.CLIENT)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/jpg',
          'image/png',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Tipo de arquivo não permitido. Use PDF, JPG ou PNG.',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadResponse(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadResponseDto,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    const userId = req.user.id;
    const clientId = req.user.client.id;

    return this.documentsService.uploadResponse(uploadDto, file, userId, clientId);
  }

  @Delete(':id')
  @Roles(Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Request() req) {
    const accountantId = req.user.accountant.id;
    return this.documentsService.delete(id, accountantId);
  }
}
