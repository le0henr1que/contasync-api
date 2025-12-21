import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  /**
   * Create a new client invitation
   * POST /api/invitations
   *
   * Only accountants can create invitations
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ACCOUNTANT)
  async createInvitation(
    @Request() req: any,
    @Body() createInvitationDto: CreateInvitationDto,
  ) {
    const accountantId = req.user.accountantId;
    return this.invitationsService.createInvitation(
      accountantId,
      createInvitationDto,
    );
  }

  /**
   * Validate an invitation token
   * GET /api/invitations/validate?token=xyz
   *
   * Public endpoint (no auth required)
   */
  @Get('validate')
  async validateInvitation(@Query('token') token: string) {
    return this.invitationsService.validateInvitation(token);
  }

  /**
   * Accept an invitation
   * POST /api/invitations/accept
   *
   * Public endpoint (no auth required)
   */
  @Post('accept')
  async acceptInvitation(@Body() acceptInvitationDto: AcceptInvitationDto) {
    return this.invitationsService.acceptInvitation(acceptInvitationDto);
  }

  /**
   * Get all invitations for the current accountant
   * GET /api/invitations
   *
   * Only accountants can list their invitations
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ACCOUNTANT)
  async findAllInvitations(@Request() req: any) {
    const accountantId = req.user.accountantId;
    return this.invitationsService.findAllByAccountant(accountantId);
  }

  /**
   * Resend an invitation
   * POST /api/invitations/:id/resend
   *
   * Only accountants can resend their invitations
   */
  @Post(':id/resend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ACCOUNTANT)
  async resendInvitation(@Param('id') id: string, @Request() req: any) {
    const accountantId = req.user.accountantId;
    return this.invitationsService.resendInvitation(id, accountantId);
  }
}
