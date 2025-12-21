import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { DocumentRequestsService } from './document-requests.service';
import { CreateDocumentRequestDto } from './dto/create-document-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('document-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentRequestsController {
  constructor(private readonly documentRequestsService: DocumentRequestsService) {}

  @Post()
  @Roles(Role.ACCOUNTANT)
  async create(@Body() createDocumentRequestDto: CreateDocumentRequestDto) {
    return this.documentRequestsService.create(createDocumentRequestDto);
  }

  @Get()
  @Roles(Role.CLIENT)
  async findClientRequests(@Request() req) {
    const clientId = req.user.client.id;
    return this.documentRequestsService.findClientRequests(clientId);
  }
}
