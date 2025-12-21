import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFolderDto, UpdateFolderDto, QueryFoldersDto } from './dto';
import { FolderType } from '@prisma/client';

@Injectable()
export class DocumentFoldersService {
  constructor(private prisma: PrismaService) {}

  private readonly DEFAULT_FOLDERS = [
    {
      name: 'Notas Fiscais',
      type: FolderType.NOTAS_FISCAIS,
      icon: '🧾',
      color: '#3b82f6',
      description: 'Notas fiscais de entrada e saída',
      isDefault: true,
      sortOrder: 1,
    },
    {
      name: 'Contratos',
      type: FolderType.CONTRATOS,
      icon: '📄',
      color: '#8b5cf6',
      description: 'Contratos e acordos',
      isDefault: true,
      sortOrder: 2,
    },
    {
      name: 'Declarações',
      type: FolderType.DECLARACOES,
      icon: '📋',
      color: '#10b981',
      description: 'Declarações fiscais e contábeis',
      isDefault: true,
      sortOrder: 3,
    },
    {
      name: 'Comprovantes',
      type: FolderType.COMPROVANTES,
      icon: '🧾',
      color: '#f59e0b',
      description: 'Comprovantes de pagamento',
      isDefault: true,
      sortOrder: 4,
    },
    {
      name: 'Balancetes',
      type: FolderType.BALANCETES,
      icon: '📊',
      color: '#06b6d4',
      description: 'Balancetes e demonstrativos contábeis',
      isDefault: true,
      sortOrder: 5,
    },
    {
      name: 'Outros',
      type: FolderType.OUTROS,
      icon: '📁',
      color: '#64748b',
      description: 'Outros documentos diversos',
      isDefault: true,
      sortOrder: 6,
    },
  ];

  async createDefaultFolders(clientId: string) {
    return this.prisma.$transaction(
      this.DEFAULT_FOLDERS.map((folder) =>
        this.prisma.documentFolder.create({
          data: {
            ...folder,
            clientId,
          },
        }),
      ),
    );
  }

  async findAllByClient(clientId: string, queryDto: QueryFoldersDto) {
    const { includeEmpty = true } = queryDto;

    const folders = await this.prisma.documentFolder.findMany({
      where: { clientId },
      include: {
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return includeEmpty
      ? folders
      : folders.filter((folder) => folder._count.documents > 0);
  }

  async create(createFolderDto: CreateFolderDto, clientId: string) {
    // Validar que o tipo não conflita com pastas padrão
    const existingDefault = await this.prisma.documentFolder.findFirst({
      where: {
        clientId,
        type: createFolderDto.type,
        isDefault: true,
      },
    });

    if (existingDefault) {
      throw new BadRequestException(
        'Já existe uma pasta padrão deste tipo. Use a pasta existente ou escolha outro tipo.',
      );
    }

    return this.prisma.documentFolder.create({
      data: {
        ...createFolderDto,
        clientId,
      },
    });
  }

  async update(id: string, updateFolderDto: UpdateFolderDto, clientId: string) {
    const folder = await this.prisma.documentFolder.findFirst({
      where: { id, clientId },
    });

    if (!folder) {
      throw new NotFoundException('Pasta não encontrada');
    }

    if (folder.isDefault && updateFolderDto.type) {
      throw new BadRequestException(
        'Não é possível alterar o tipo de pastas padrão',
      );
    }

    return this.prisma.documentFolder.update({
      where: { id },
      data: updateFolderDto,
    });
  }

  async remove(id: string, clientId: string) {
    const folder = await this.prisma.documentFolder.findFirst({
      where: { id, clientId },
      include: {
        _count: { select: { documents: true } },
      },
    });

    if (!folder) {
      throw new NotFoundException('Pasta não encontrada');
    }

    if (folder.isDefault && folder._count.documents > 0) {
      throw new BadRequestException(
        'Não é possível remover pastas padrão que contêm documentos',
      );
    }

    // Se a pasta tem documentos, movê-los para "Outros"
    if (folder._count.documents > 0) {
      const otherFolder = await this.prisma.documentFolder.findFirst({
        where: {
          clientId,
          type: FolderType.OUTROS,
          isDefault: true,
        },
      });

      if (!otherFolder) {
        throw new BadRequestException(
          'Pasta "Outros" não encontrada. Não é possível mover os documentos.',
        );
      }

      await this.prisma.document.updateMany({
        where: { folderId: id },
        data: { folderId: otherFolder.id },
      });
    }

    return this.prisma.documentFolder.delete({
      where: { id },
    });
  }
}
