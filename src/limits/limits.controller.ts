import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { LimitsService } from './limits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('limits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LimitsController {
  constructor(private limitsService: LimitsService) {}

  @Get('usage')
  @Roles(Role.ACCOUNTANT)
  async getUsage(@Request() req) {
    const accountantId = req.user.accountantId;
    return this.limitsService.getAccountantUsage(accountantId);
  }
}
