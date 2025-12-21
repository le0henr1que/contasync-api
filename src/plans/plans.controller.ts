import { Controller, Get, Query, Param } from '@nestjs/common';
import { PlansService } from './plans.service';
import { TenantType } from '@prisma/client';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  /**
   * GET /api/plans
   *
   * List all active plans
   *
   * @param tenantType - Optional filter by tenant type (INDIVIDUAL or ACCOUNTANT_FIRM)
   * @returns List of active plans ordered by sortOrder
   */
  @Get()
  async findAll(@Query('tenantType') tenantType?: TenantType) {
    return this.plansService.findAll(tenantType);
  }

  /**
   * GET /api/plans/:id
   *
   * Get a single plan by ID
   *
   * @param id - Plan ID
   * @returns Plan details
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }
}
