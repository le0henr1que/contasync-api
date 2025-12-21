import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // Client can get their own profile
  @Get('me')
  @Roles(Role.CLIENT)
  async getMyProfile(@Request() req) {
    const userId = req.user.id;
    return this.clientsService.findByUserId(userId);
  }

  // Client can get their own statistics for dashboard
  @Get('me/statistics')
  @Roles(Role.CLIENT)
  async getMyStatistics(@Request() req) {
    const userId = req.user.id;
    const client = await this.clientsService.findByUserId(userId);
    return this.clientsService.getStatistics(client.id);
  }

  // Client can view accountant's plan info
  @Get('me/accountant-plan')
  @Roles(Role.CLIENT)
  async getAccountantPlan(@Request() req) {
    const userId = req.user.id;
    const client = await this.clientsService.findByUserId(userId);
    return this.clientsService.getAccountantPlan(client.id);
  }

  // Client can view their usage and limits
  @Get('me/usage')
  @Roles(Role.CLIENT)
  async getMyUsage(@Request() req) {
    const userId = req.user.id;
    const client = await this.clientsService.findByUserId(userId);
    return this.clientsService.getClientUsage(client.id);
  }

  // Client can update their own profile
  @Patch('me/profile')
  @Roles(Role.CLIENT)
  @HttpCode(HttpStatus.OK)
  async updateMyProfile(@Body() updateProfileDto: UpdateProfileDto, @Request() req) {
    const userId = req.user.id;
    return this.clientsService.updateProfile(updateProfileDto, userId);
  }

  @Post()
  @Roles(Role.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createClientDto: CreateClientDto, @Request() req) {
    const accountantId = req.user.accountant.id;
    const userId = req.user.id;
    return this.clientsService.create(createClientDto, accountantId, userId);
  }

  @Get()
  @Roles(Role.ACCOUNTANT)
  async findAll(@Request() req) {
    const accountantId = req.user.accountant.id;
    return this.clientsService.findAll(accountantId);
  }

  @Get(':id')
  @Roles(Role.ACCOUNTANT)
  async findOne(@Param('id') id: string, @Request() req) {
    const accountantId = req.user.accountant.id;
    return this.clientsService.findOne(id, accountantId);
  }

  @Patch(':id')
  @Roles(Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
    @Request() req,
  ) {
    const accountantId = req.user.accountant.id;
    const userId = req.user.id;
    return this.clientsService.update(id, updateClientDto, accountantId, userId);
  }

  @Delete(':id')
  @Roles(Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @Request() req) {
    const accountantId = req.user.accountant.id;
    const userId = req.user.id;
    return this.clientsService.remove(id, accountantId, userId);
  }

  @Get(':id/activities')
  @Roles(Role.ACCOUNTANT)
  async getClientActivities(
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Request() req,
  ) {
    const accountantId = req.user.accountant.id;
    // Verify client belongs to accountant
    await this.clientsService.findOne(id, accountantId);

    // Get activities
    return this.activityLogService.getClientActivityLogs(
      id,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }
}
