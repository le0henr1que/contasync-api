import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DocumentFoldersService } from './document-folders.service';
import { CreateFolderDto, UpdateFolderDto, QueryFoldersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('document-folders')
@Controller('document-folders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DocumentFoldersController {
  constructor(
    private readonly documentFoldersService: DocumentFoldersService,
  ) {}

  @Get()
  @Roles(Role.CLIENT, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Listar pastas de documentos do cliente' })
  @ApiResponse({
    status: 200,
    description: 'Lista de pastas retornada com sucesso',
  })
  async findAll(@Request() req, @Query() queryDto: QueryFoldersDto) {
    // Get clientId based on user role
    let clientId: string;

    if (req.user.role === Role.CLIENT) {
      clientId = req.user.client.id;
    } else {
      // For ACCOUNTANT, they would need to pass clientId via query param
      // This will be handled in US-21.9 (Accountant view)
      // For now, return empty array for accountant
      return [];
    }

    return this.documentFoldersService.findAllByClient(clientId, queryDto);
  }

  @Post()
  @Roles(Role.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar pasta customizada' })
  @ApiResponse({ status: 201, description: 'Pasta criada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Tipo conflita com pasta padrão',
  })
  async create(@Body() createFolderDto: CreateFolderDto, @Request() req) {
    // Accountant needs to specify which client (this will be refined in future stories)
    // For now, we'll need clientId in the request
    // This is a simplified implementation
    const clientId = req.user.client?.id;
    if (!clientId) {
      throw new Error(
        'ClientId is required. This endpoint needs enhancement for accountant use case.',
      );
    }

    return this.documentFoldersService.create(createFolderDto, clientId);
  }

  @Patch(':id')
  @Roles(Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar pasta' })
  @ApiResponse({ status: 200, description: 'Pasta atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Pasta não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Não é possível alterar tipo de pasta padrão',
  })
  async update(
    @Param('id') id: string,
    @Body() updateFolderDto: UpdateFolderDto,
    @Request() req,
  ) {
    // Similar to create, needs clientId context
    const clientId = req.user.client?.id;
    if (!clientId) {
      throw new Error(
        'ClientId is required. This endpoint needs enhancement for accountant use case.',
      );
    }

    return this.documentFoldersService.update(id, updateFolderDto, clientId);
  }

  @Delete(':id')
  @Roles(Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover pasta' })
  @ApiResponse({ status: 200, description: 'Pasta removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Pasta não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Não é possível remover pasta padrão com documentos',
  })
  async remove(@Param('id') id: string, @Request() req) {
    // Similar to create, needs clientId context
    const clientId = req.user.client?.id;
    if (!clientId) {
      throw new Error(
        'ClientId is required. This endpoint needs enhancement for accountant use case.',
      );
    }

    return this.documentFoldersService.remove(id, clientId);
  }
}
