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
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Listar pastas de documentos do cliente logado' })
  @ApiResponse({
    status: 200,
    description: 'Lista de pastas retornada com sucesso',
  })
  async findAll(@Request() req, @Query() queryDto: QueryFoldersDto) {
    const clientId = req.user.clientId;
    return this.documentFoldersService.findAllByClient(clientId, queryDto);
  }

  @Get('client/:clientId')
  @Roles(Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Listar pastas de um cliente específico (contador)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de pastas retornada com sucesso',
  })
  async findByClient(
    @Param('clientId') clientId: string,
    @Query() queryDto: QueryFoldersDto,
  ) {
    return this.documentFoldersService.findAllByClient(clientId, queryDto);
  }

  @Post()
  @Roles(Role.CLIENT, Role.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar pasta customizada' })
  @ApiResponse({ status: 201, description: 'Pasta criada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Tipo conflita com pasta padrão ou clientId não fornecido',
  })
  async create(@Body() createFolderDto: CreateFolderDto, @Request() req) {
    let clientId: string;

    if (req.user.role === Role.CLIENT) {
      // Cliente cria pasta para si mesmo
      clientId = req.user.clientId;
    } else {
      // Contador precisa especificar o clientId no body
      clientId = createFolderDto.clientId;
      if (!clientId) {
        throw new Error(
          'ClientId é obrigatório para contadores criarem pastas.',
        );
      }
    }

    return this.documentFoldersService.create(createFolderDto, clientId);
  }

  @Patch(':id')
  @Roles(Role.CLIENT, Role.ACCOUNTANT)
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
    let clientId: string;

    if (req.user.role === Role.CLIENT) {
      clientId = req.user.clientId;
    } else {
      // Para contadores, buscar o clientId da pasta
      clientId = null; // O service deve validar se a pasta pertence a um cliente do contador
    }

    return this.documentFoldersService.update(id, updateFolderDto, clientId);
  }

  @Delete(':id')
  @Roles(Role.CLIENT, Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover pasta' })
  @ApiResponse({ status: 200, description: 'Pasta removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Pasta não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Não é possível remover pasta padrão com documentos',
  })
  async remove(@Param('id') id: string, @Request() req) {
    let clientId: string;

    if (req.user.role === Role.CLIENT) {
      clientId = req.user.clientId;
    } else {
      // Para contadores, buscar o clientId da pasta
      clientId = null; // O service deve validar se a pasta pertence a um cliente do contador
    }

    return this.documentFoldersService.remove(id, clientId);
  }
}
