import { Controller, Get, Post, Body, Param, Query, Request, UseGuards, UseInterceptors, UploadedFile, Res, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Role } from '@prisma/client';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // Export routes must come first (more specific routes before dynamic routes)
  @Get('export/excel/me')
  @Roles(Role.CLIENT)
  async exportMyExpensesToExcel(@Query() queryDto: QueryExpensesDto, @Request() req, @Res() res: Response) {
    const userId = req.user.id;
    const client = await this.expensesService.getClientByUserId(userId);
    const data = await this.expensesService.findAllForClient(queryDto, client.id);

    const buffer = await this.expensesService.exportToExcel(data.expenses, req.user.name);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=despesas-${Date.now()}.xlsx`);
    res.send(buffer);
  }

  @Get('export/pdf/me')
  @Roles(Role.CLIENT)
  async exportMyExpensesToPDF(@Query() queryDto: QueryExpensesDto, @Request() req, @Res() res: Response) {
    const userId = req.user.id;
    const client = await this.expensesService.getClientByUserId(userId);
    const data = await this.expensesService.findAllForClient(queryDto, client.id);

    const buffer = await this.expensesService.exportToPDF(data.expenses, req.user.name);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=despesas-${Date.now()}.pdf`);
    res.send(buffer);
  }

  @Get('export/excel')
  @Roles(Role.ACCOUNTANT)
  async exportExpensesToExcel(@Query() queryDto: QueryExpensesDto, @Request() req, @Res() res: Response) {
    const userId = req.user.id;
    const accountant = await this.expensesService.getAccountantByUserId(userId);
    const data = await this.expensesService.findAllForAccountant(queryDto, accountant.id);

    const buffer = await this.expensesService.exportToExcel(data.expenses);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=despesas-clientes-${Date.now()}.xlsx`);
    res.send(buffer);
  }

  @Get('export/pdf')
  @Roles(Role.ACCOUNTANT)
  async exportExpensesToPDF(@Query() queryDto: QueryExpensesDto, @Request() req, @Res() res: Response) {
    const userId = req.user.id;
    const accountant = await this.expensesService.getAccountantByUserId(userId);
    const data = await this.expensesService.findAllForAccountant(queryDto, accountant.id);

    const buffer = await this.expensesService.exportToPDF(data.expenses);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=despesas-clientes-${Date.now()}.pdf`);
    res.send(buffer);
  }

  // Hierarchical route: Accountant accessing specific client's expenses
  // TenantGuard validates that the client belongs to the accountant
  @Get('client/:clientId')
  @Roles(Role.ACCOUNTANT)
  @UseGuards(TenantGuard)
  async getClientExpenses(
    @Param('clientId') clientId: string,
    @Query() queryDto: QueryExpensesDto,
    @CurrentTenant() tenantId: string,
  ) {
    // TenantGuard already validated that this accountant can access this client
    return this.expensesService.findAllForClient(queryDto, clientId);
  }

  @Get('me')
  @Roles(Role.CLIENT)
  async getMyExpenses(@Query() queryDto: QueryExpensesDto, @Request() req) {
    const userId = req.user.id;
    const client = await this.expensesService.getClientByUserId(userId);
    return this.expensesService.findAllForClient(queryDto, client.id);
  }

  @Get('me/:id')
  @Roles(Role.CLIENT)
  async getMyExpense(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const client = await this.expensesService.getClientByUserId(userId);
    return this.expensesService.findOneForClient(id, client.id);
  }

  @Post('me')
  @Roles(Role.CLIENT)
  @UseInterceptors(FileInterceptor('receipt'))
  async createMyExpense(
    @Body() createExpenseDto: CreateExpenseDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    const userId = req.user.id;
    const client = await this.expensesService.getClientByUserId(userId);
    return this.expensesService.createForClient(createExpenseDto, client.id, file);
  }

  @Get(':id/receipt')
  @Roles(Role.ACCOUNTANT, Role.CLIENT)
  async downloadReceipt(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const expense = await this.expensesService.findExpenseById(id);

    if (!expense || !expense.receiptPath) {
      throw new NotFoundException('Comprovante não encontrado');
    }

    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(expense.receiptPath)) {
      throw new NotFoundException('Arquivo de comprovante não encontrado');
    }

    res.setHeader('Content-Type', expense.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename=' + (expense.fileName || 'comprovante'));

    const fileStream = fs.createReadStream(expense.receiptPath);
    fileStream.pipe(res);
  }

  @Get()
  @Roles(Role.ACCOUNTANT)
  async getAllExpenses(@Query() queryDto: QueryExpensesDto, @Request() req) {
    const userId = req.user.id;
    const accountant = await this.expensesService.getAccountantByUserId(userId);
    return this.expensesService.findAllForAccountant(queryDto, accountant.id);
  }

  @Get(':id')
  @Roles(Role.ACCOUNTANT)
  async getExpense(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const accountant = await this.expensesService.getAccountantByUserId(userId);
    return this.expensesService.findOneForAccountant(id, accountant.id);
  }
}
