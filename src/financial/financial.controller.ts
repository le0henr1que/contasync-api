import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinancialService } from './financial.service';
import { RecurringPaymentsCronService } from './cron/recurring-payments.cron';
import { CreateDistributionCategoryDto } from './dto/create-distribution-category.dto';
import { UpdateDistributionCategoryDto } from './dto/update-distribution-category.dto';
import { UpdateDistributionConfigDto } from './dto/update-distribution-config.dto';
import { SimulateDistributionDto } from './dto/simulate-distribution.dto';

@Controller('financial')
@UseGuards(JwtAuthGuard)
export class FinancialController {
  constructor(
    private readonly financialService: FinancialService,
    private readonly recurringPaymentsCron: RecurringPaymentsCronService,
  ) {}

  // ========== ANALYTICS ==========
  @Get('analytics/dashboard')
  async getDashboard(@Request() req) {
    const userId = req.user.sub;
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can access financial data');
    }

    return this.financialService.getDashboardData(userId, clientId);
  }

  @Get('analytics/metrics')
  async getFinancialMetrics(@Request() req, @Query() query: any) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can access financial metrics');
    }

    return this.financialService.getFinancialMetrics(clientId, query);
  }

  @Get('analytics/history')
  async getHistory(@Query() query: any) {
    return this.financialService.getHistoryData(query);
  }

  @Get('history')
  async getHistoryAnalysis(@Query() query: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can access financial data');
    }

    return this.financialService.getHistoryAnalysis(clientId, query);
  }

  @Get('history/categories')
  async getHistoryByCategories(@Query() query: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can access financial data');
    }

    return this.financialService.getHistoryByCategories(clientId, query);
  }

  @Get('history/top-transactions')
  async getTopTransactions(@Query() query: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can access financial data');
    }

    return this.financialService.getTopTransactions(clientId, query);
  }

  @Get('history/export/pdf')
  async exportHistoryPDF(@Query() query: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can access financial data');
    }

    return { success: false, message: 'PDF export not implemented yet' };
  }

  @Get('history/export/excel')
  async exportHistoryExcel(@Query() query: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can access financial data');
    }

    return { success: false, message: 'Excel export not implemented yet' };
  }

  // ========== TRANSACTIONS ==========
  @Get('transactions')
  async getTransactions(@Query() query: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can access transactions');
    }

    return this.financialService.getTransactions(clientId, query);
  }

  @Get('transactions/:id')
  async getTransaction(@Param('id') id: string, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can access transactions');
    }

    return this.financialService.getTransaction(id, clientId);
  }

  @Post('transactions')
  @UseInterceptors(FileInterceptor('receipt'))
  async createTransaction(
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can create transactions');
    }

    return this.financialService.createTransaction(clientId, body, file);
  }

  @Patch('transactions/:id')
  async updateTransaction(@Param('id') id: string, @Body() body: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can update transactions');
    }

    return this.financialService.updateTransaction(id, clientId, body);
  }

  @Delete('transactions/:id')
  async deleteTransaction(@Param('id') id: string, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can delete transactions');
    }

    return this.financialService.deleteTransaction(id, clientId);
  }

  // ========== RECURRING PAYMENTS ==========
  @Get('recurring')
  async getRecurringPayments(@Query() query: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can access recurring payments');
    }

    return this.financialService.getRecurringPayments(clientId, query);
  }

  @Get('recurring/:id')
  async getRecurringPayment(@Param('id') id: string, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can access recurring payments');
    }

    return this.financialService.getRecurringPayment(id, clientId);
  }

  @Post('recurring')
  async createRecurringPayment(@Body() body: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can create recurring payments');
    }

    return this.financialService.createRecurringPayment(clientId, body);
  }

  @Patch('recurring/:id')
  async updateRecurringPayment(@Param('id') id: string, @Body() body: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can update recurring payments');
    }

    return this.financialService.updateRecurringPayment(id, clientId, body);
  }

  @Delete('recurring/:id')
  async deleteRecurringPayment(@Param('id') id: string, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can delete recurring payments');
    }

    return this.financialService.deleteRecurringPayment(id, clientId);
  }

  @Post('recurring/:id/toggle')
  async toggleRecurringPayment(@Param('id') id: string, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can toggle recurring payments');
    }

    return this.financialService.toggleRecurringPayment(id, clientId);
  }

  // ========== INSTALLMENTS ==========
  @Get('installments')
  async getInstallments(@Query() query: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can access installments');
    }

    return this.financialService.getInstallments(clientId, query);
  }

  @Get('installments/:id')
  async getInstallment(@Param('id') id: string, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can access installments');
    }

    return this.financialService.getInstallment(id, clientId);
  }

  @Post('installments')
  async createInstallment(@Body() body: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can create installments');
    }

    try {
      return await this.financialService.createInstallment(clientId, body);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to create installment');
    }
  }

  @Patch('installments/:id')
  async updateInstallment(@Param('id') id: string, @Body() body: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can update installments');
    }

    return this.financialService.updateInstallment(id, clientId, body);
  }

  @Delete('installments/:id')
  async deleteInstallment(@Param('id') id: string, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can delete installments');
    }

    return this.financialService.deleteInstallment(id, clientId);
  }

  @Post('installments/:id/cancel')
  async cancelInstallment(@Param('id') id: string, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can cancel installments');
    }

    return this.financialService.cancelInstallment(id, clientId);
  }

  @Post('installments/pay')
  async payInstallment(@Body() body: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can pay installments');
    }

    const { installmentPaymentId } = body;

    if (!installmentPaymentId) {
      throw new BadRequestException('installmentPaymentId is required');
    }

    try {
      return await this.financialService.payInstallmentFromPaymentId(clientId, installmentPaymentId, body);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to pay installment');
    }
  }

  @Post('installments/:installmentId/payments/:paymentId/pay')
  async payInstallmentPayment(
    @Param('installmentId') installmentId: string,
    @Param('paymentId') paymentId: string,
    @Request() req,
  ) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can pay installments');
    }

    return this.financialService.payInstallmentPayment(installmentId, paymentId, clientId);
  }

  // ========== INVESTMENTS ==========
  @Get('investments')
  async getInvestments(@Query() query: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can access investments');
    }

    return this.financialService.getInvestments(clientId, query);
  }

  @Get('investments/:id')
  async getInvestment(@Param('id') id: string, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can access investments');
    }

    return this.financialService.getInvestment(id, clientId);
  }

  @Post('investments')
  async createInvestment(@Body() body: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can create investments');
    }

    try {
      return await this.financialService.createInvestment(clientId, body);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to create investment');
    }
  }

  @Patch('investments/:id')
  async updateInvestment(@Param('id') id: string, @Body() body: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can update investments');
    }

    try {
      return await this.financialService.updateInvestment(id, clientId, body);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to update investment');
    }
  }

  @Delete('investments/:id')
  async deleteInvestment(@Param('id') id: string, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can delete investments');
    }

    return this.financialService.deleteInvestment(id, clientId);
  }

  @Post('investments/:id/buy')
  async buyInvestment(@Param('id') id: string) {
    return this.financialService.buyInvestment(id);
  }

  @Post('investments/:id/sell')
  async sellInvestment(@Param('id') id: string) {
    return this.financialService.sellInvestment(id);
  }

  @Post('investments/:id/deposit')
  async depositToSavingsBox(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req,
  ) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can deposit to savings box');
    }

    try {
      return await this.financialService.depositToSavingsBox(id, clientId, body);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to deposit to savings box');
    }
  }

  @Post('investments/:id/withdraw')
  async withdrawFromSavingsBox(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req,
  ) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can withdraw from savings box');
    }

    try {
      return await this.financialService.withdrawFromSavingsBox(id, clientId, body);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to withdraw from savings box');
    }
  }

  // ========== GOALS ==========
  @Get('goals')
  async getGoals(@Query() query: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can access goals');
    }

    return this.financialService.getGoals(clientId, query);
  }

  @Get('goals/:id')
  async getGoal(@Param('id') id: string, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can access goals');
    }

    return this.financialService.getGoal(id, clientId);
  }

  @Post('goals')
  async createGoal(@Body() body: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can create goals');
    }

    try {
      return await this.financialService.createGoal(clientId, body);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to create goal');
    }
  }

  @Patch('goals/:id')
  async updateGoal(@Param('id') id: string, @Body() body: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can update goals');
    }

    try {
      return await this.financialService.updateGoal(id, clientId, body);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to update goal');
    }
  }

  @Delete('goals/:id')
  async deleteGoal(@Param('id') id: string, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can delete goals');
    }

    return this.financialService.deleteGoal(id, clientId);
  }

  @Post('goals/:id/contribute')
  async contributeToGoal(@Param('id') id: string, @Body() body: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can contribute to goals');
    }

    try {
      return await this.financialService.contributeToGoal(id, clientId, body);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to contribute to goal');
    }
  }

  // ========== GOAL ITEMS ==========
  @Get('goals/:goalId/items')
  async getGoalItems(@Param('goalId') goalId: string, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can access goal items');
    }

    try {
      return await this.financialService.getGoalItems(goalId, clientId);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to get goal items');
    }
  }

  @Post('goals/:goalId/items')
  async createGoalItem(@Param('goalId') goalId: string, @Body() body: any, @Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can create goal items');
    }

    try {
      return await this.financialService.createGoalItem(goalId, clientId, body);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to create goal item');
    }
  }

  @Patch('goals/:goalId/items/:itemId')
  async updateGoalItem(
    @Param('goalId') goalId: string,
    @Param('itemId') itemId: string,
    @Body() body: any,
    @Request() req,
  ) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can update goal items');
    }

    try {
      return await this.financialService.updateGoalItem(goalId, itemId, clientId, body);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to update goal item');
    }
  }

  @Post('goals/:goalId/items/:itemId/toggle')
  async toggleGoalItem(
    @Param('goalId') goalId: string,
    @Param('itemId') itemId: string,
    @Request() req,
  ) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can toggle goal items');
    }

    try {
      return await this.financialService.toggleGoalItem(goalId, itemId, clientId);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to toggle goal item');
    }
  }

  @Delete('goals/:goalId/items/:itemId')
  async deleteGoalItem(
    @Param('goalId') goalId: string,
    @Param('itemId') itemId: string,
    @Request() req,
  ) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can delete goal items');
    }

    try {
      return await this.financialService.deleteGoalItem(goalId, itemId, clientId);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to delete goal item');
    }
  }

  // ========== AI INSIGHTS ==========
  @Get('ai-insights')
  async getAIInsights(@Query() query: any) {
    return this.financialService.getAIInsights(query);
  }

  @Post('ai-insights/generate')
  async generateAIInsights() {
    return this.financialService.generateAIInsights();
  }

  @Patch('ai-insights/:id/read')
  async markInsightAsRead(@Param('id') id: string) {
    return this.financialService.markInsightAsRead(id);
  }

  @Patch('ai-insights/:id/dismiss')
  async dismissInsight(@Param('id') id: string) {
    return this.financialService.dismissInsight(id);
  }

  // ========== INCOME DISTRIBUTION ==========
  @Get('distribution/config')
  async getDistributionConfig(@Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can access income distribution');
    }

    return this.financialService.getDistributionConfig(clientId);
  }

  @Patch('distribution/config')
  async updateDistributionConfig(@Request() req, @Body() dto: UpdateDistributionConfigDto) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can update income distribution');
    }

    return this.financialService.updateDistributionConfig(clientId, dto);
  }

  @Post('distribution/simulate')
  async simulateDistribution(@Request() req, @Body() dto: SimulateDistributionDto) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can simulate income distribution');
    }

    return this.financialService.simulateDistribution(clientId, dto.incomeAmount);
  }

  @Get('distribution/expenses/monthly')
  async getMonthlyExpenses(@Request() req) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can access monthly expenses');
    }

    const monthlyExpenses = await this.financialService.calculateMonthlyExpenses(clientId);

    return {
      monthlyExpenses,
      message: 'Estimated monthly fixed expenses based on recurring payments',
    };
  }

  @Post('distribution/categories')
  async addDistributionCategory(@Request() req, @Body() dto: CreateDistributionCategoryDto) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new BadRequestException('Only client users can add distribution categories');
    }

    try {
      return await this.financialService.addDistributionCategory(clientId, dto);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to add distribution category');
    }
  }

  @Patch('distribution/categories/:id')
  async updateDistributionCategory(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateDistributionCategoryDto,
  ) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can update distribution categories');
    }

    return this.financialService.updateDistributionCategory(id, clientId, dto);
  }

  @Delete('distribution/categories/:id')
  async deleteDistributionCategory(@Request() req, @Param('id') id: string) {
    const clientId = req.user.clientId;

    if (!clientId) {
      throw new Error('Only client users can delete distribution categories');
    }

    return this.financialService.deleteDistributionCategory(id, clientId);
  }

  // ========== CRON TRIGGERS (FOR TESTING) ==========
  @Post('cron/process-recurring-payments')
  async triggerRecurringPaymentsProcessing() {
    await this.recurringPaymentsCron.manualTrigger();
    return { success: true, message: 'Recurring payments processing triggered' };
  }
}
