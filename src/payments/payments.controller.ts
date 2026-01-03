import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Param,
  Res,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { PaymentsService } from './payments.service';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { AttachDocumentDto } from './dto/attach-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Client endpoints
  @Get('me')
  @Roles(Role.CLIENT)
  async getMyPayments(@Query() queryDto: QueryPaymentsDto, @Request() req) {
    const userId = req.user.id;
    const client = await this.paymentsService.getClientByUserId(userId);
    return this.paymentsService.findAllForClient(queryDto, client.id);
  }

  @Get('me/:id')
  @Roles(Role.CLIENT)
  async getMyPayment(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const client = await this.paymentsService.getClientByUserId(userId);
    return this.paymentsService.findOneForClient(id, client.id);
  }

  @Patch('me/:id/receipt')
  @Roles(Role.CLIENT)
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
              'Tipo de arquivo inválido. Apenas PDF, JPG e PNG são permitidos.',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadMyReceipt(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    const userId = req.user.id;
    const client = await this.paymentsService.getClientByUserId(userId);
    return this.paymentsService.uploadReceiptForClient(id, file, client.id);
  }

  @Get('me/:id/receipt/download')
  @Roles(Role.CLIENT)
  async downloadMyReceipt(
    @Param('id') id: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const userId = req.user.id;
    const client = await this.paymentsService.getClientByUserId(userId);
    const payment = await this.paymentsService.findOneForClient(id, client.id);

    if (!payment || !payment.receiptPath) {
      throw new NotFoundException('Comprovante não encontrado');
    }

    const stream = await this.paymentsService.downloadReceipt(payment.receiptPath);

    res.set({
      'Content-Type': payment.mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${payment.fileName || 'comprovante'}"`,
    });

    stream.pipe(res);
  }

  @Get('statistics')
  @Roles(Role.ACCOUNTANT)
  async getStatistics(@Request() req) {
    const accountantId = req.user.accountant.id;
    return this.paymentsService.getStatistics(accountantId);
  }

  @Get('client/:clientId')
  @Roles(Role.ACCOUNTANT)
  async findByClient(
    @Param('clientId') clientId: string,
    @Query() queryDto: QueryPaymentsDto,
    @Request() req,
  ) {
    const accountantId = req.user.accountant.id;
    // Adiciona o clientId aos parâmetros de query
    const queryWithClient = { ...queryDto, clientId };
    return this.paymentsService.findAll(queryWithClient, accountantId);
  }

  @Get()
  @Roles(Role.ACCOUNTANT)
  async findAll(@Query() queryDto: QueryPaymentsDto, @Request() req) {
    const accountantId = req.user.accountant.id;
    return this.paymentsService.findAll(queryDto, accountantId);
  }

  @Get(':id')
  @Roles(Role.ACCOUNTANT)
  async findOne(@Param('id') id: string, @Request() req) {
    const accountantId = req.user.accountant.id;
    return this.paymentsService.findOne(id, accountantId);
  }

  @Post()
  @Roles(Role.ACCOUNTANT)
  async create(@Body() createPaymentDto: CreatePaymentDto, @Request() req) {
    const accountantId = req.user.accountant.id;
    return this.paymentsService.create(createPaymentDto, accountantId);
  }

  @Patch(':id')
  @Roles(Role.ACCOUNTANT)
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Request() req,
  ) {
    const accountantId = req.user.accountant.id;
    return this.paymentsService.update(id, updatePaymentDto, accountantId);
  }

  @Patch(':id/receipt')
  @Roles(Role.ACCOUNTANT)
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
              'Tipo de arquivo inválido. Apenas PDF, JPG e PNG são permitidos.',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadReceipt(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    const accountantId = req.user.accountant.id;
    return this.paymentsService.uploadReceipt(id, file, accountantId);
  }

  @Get(':id/receipt/download')
  @Roles(Role.ACCOUNTANT)
  async downloadReceipt(
    @Param('id') id: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const accountantId = req.user.accountant.id;
    const payment = await this.paymentsService.findOne(id, accountantId);

    if (!payment || !payment.receiptPath) {
      throw new NotFoundException('Comprovante não encontrado');
    }

    const stream = await this.paymentsService.downloadReceipt(payment.receiptPath);

    res.set({
      'Content-Type': payment.mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${payment.fileName || 'comprovante'}"`,
    });

    stream.pipe(res);
  }

  @Delete(':id')
  @Roles(Role.ACCOUNTANT)
  async delete(@Param('id') id: string, @Request() req) {
    const accountantId = req.user.accountant.id;
    return this.paymentsService.delete(id, accountantId);
  }

  // Recurring payments endpoints
  @Get('recurring/list')
  @Roles(Role.ACCOUNTANT)
  async getRecurringPayments(@Request() req) {
    const accountantId = req.user.accountant.id;
    return this.paymentsService.findRecurringPayments(accountantId);
  }

  @Post(':id/cancel-recurrence')
  @Roles(Role.ACCOUNTANT)
  async cancelRecurrence(@Param('id') id: string, @Request() req) {
    const accountantId = req.user.accountant.id;
    return this.paymentsService.cancelRecurrence(id, accountantId);
  }

  // Document attachment endpoints
  @Get(':id/documents')
  @Roles(Role.ACCOUNTANT, Role.CLIENT)
  @ApiOperation({ summary: 'Get all documents attached to a payment' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentDocuments(@Param('id') id: string, @Request() req) {
    if (req.user.role === Role.ACCOUNTANT) {
      const accountantId = req.user.accountant.id;
      return this.paymentsService.getPaymentDocuments(id, accountantId);
    } else {
      // CLIENT
      const userId = req.user.id;
      const client = await this.paymentsService.getClientByUserId(userId);
      return this.paymentsService.getPaymentDocumentsForClient(
        id,
        client.id,
      );
    }
  }

  @Post(':id/attach-document')
  @Roles(Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Attach a document to a payment' })
  @ApiResponse({ status: 200, description: 'Document attached successfully' })
  @ApiResponse({ status: 404, description: 'Payment or document not found' })
  @ApiResponse({ status: 400, description: 'Document already attached' })
  async attachDocument(
    @Param('id') id: string,
    @Body() attachDocumentDto: AttachDocumentDto,
    @Request() req,
  ) {
    const accountantId = req.user.accountant.id;
    const userId = req.user.id;
    return this.paymentsService.attachDocument(
      id,
      attachDocumentDto.documentId,
      userId,
      accountantId,
    );
  }

  @Delete(':id/detach-document/:documentId')
  @Roles(Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Detach a document from a payment' })
  @ApiResponse({ status: 200, description: 'Document detached successfully' })
  @ApiResponse({ status: 404, description: 'Payment or attachment not found' })
  async detachDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Request() req,
  ) {
    const accountantId = req.user.accountant.id;
    return this.paymentsService.detachDocument(id, documentId, accountantId);
  }

  @Post(':id/charge')
  @Roles(Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Send payment reminder notification to client' })
  @ApiResponse({ status: 200, description: 'Payment reminder sent successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 400, description: 'Payment cannot be charged' })
  async chargePayment(@Param('id') id: string, @Request() req) {
    const accountantId = req.user.accountant.id;
    const userId = req.user.id;
    return this.paymentsService.chargePayment(id, userId, accountantId);
  }

  @Post(':id/approve')
  @Roles(Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Approve payment and mark as paid' })
  @ApiResponse({ status: 200, description: 'Payment approved successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 400, description: 'Payment cannot be approved' })
  async approvePayment(@Param('id') id: string, @Request() req) {
    const accountantId = req.user.accountant.id;
    return this.paymentsService.approvePayment(id, accountantId);
  }
}
