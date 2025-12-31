import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfMonth, endOfMonth, subMonths, startOfDay, addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

@Injectable()
export class FinancialService {
  constructor(private prisma: PrismaService) {}

  // ========== ANALYTICS ==========
  async getDashboardData(userId: string, clientId: string) {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Current month transactions
    const currentMonthTransactions = await this.prisma.financialTransaction.findMany({
      where: {
        clientId,
        deletedAt: null,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    const totalIncome = currentMonthTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = currentMonthTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Recent transactions (last 10)
    const recentTransactions = await this.prisma.financialTransaction.findMany({
      where: { clientId, deletedAt: null },
      orderBy: { date: 'desc' },
      take: 10,
    });

    // Upcoming recurring payments
    const upcomingRecurring = await this.prisma.recurringPayment.findMany({
      where: {
        clientId,
        isActive: true,
        nextDueDate: {
          gte: now,
          lte: addDays(now, 30),
        },
      },
      orderBy: { nextDueDate: 'asc' },
      take: 5,
    });

    // Pending installments
    const pendingInstallments = await this.prisma.installment.findMany({
      where: {
        clientId,
        status: 'ACTIVE',
      },
      include: {
        payments: {
          where: { status: 'PENDING' },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
      take: 5,
    });

    // Active goals
    const activeGoals = await this.prisma.financialGoal.findMany({
      where: {
        clientId,
        status: 'ACTIVE',
      },
      orderBy: { targetDate: 'asc' },
      take: 5,
    });

    // Category distribution (expenses only)
    const expensesByCategory = currentMonthTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => {
        const category = t.category;
        acc[category] = (acc[category] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const totalExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);
    const categoryDistribution = Object.entries(expensesByCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      currentMonth: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        transactionCount: currentMonthTransactions.length,
      },
      lastSixMonths: [],
      categoryDistribution,
      recentTransactions,
      upcomingRecurring,
      pendingInstallments: pendingInstallments.map(inst => ({
        installment: inst,
        nextPayment: inst.payments[0] || null,
      })),
      activeGoals,
    };
  }

  async getHistoryData(query: any) {
    return {
      monthlyData: [],
      categoryTrends: [],
      incomeVsExpense: [],
    };
  }

  async getFinancialMetrics(clientId: string, query: any) {
    const { period = '6M' } = query; // 1M, 3M, 6M, 12M, ALL

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '1M':
        startDate = subMonths(now, 1);
        break;
      case '3M':
        startDate = subMonths(now, 3);
        break;
      case '6M':
        startDate = subMonths(now, 6);
        break;
      case '12M':
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = subMonths(now, 6);
    }

    // Get all transactions in period
    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        clientId,
        deletedAt: null,
        date: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate basic metrics
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((netBalance / totalIncome) * 100) : 0;

    // Monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= monthStart && tDate <= monthEnd;
      });

      const income = monthTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expense = monthTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      monthlyTrends.push({
        month: format(monthDate, 'MMM/yy', { locale: ptBR }),
        monthFull: format(monthDate, 'MMMM yyyy', { locale: ptBR }),
        income,
        expense,
        balance: income - expense,
        savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0,
      });
    }

    // Category analysis
    const expensesByCategory = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => {
        const category = t.category;
        acc[category] = (acc[category] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const categoryBreakdown = Object.entries(expensesByCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
        transactions: transactions.filter(t => t.category === category && t.type === 'EXPENSE').length,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Goals progress
    const goals = await this.prisma.financialGoal.findMany({
      where: { clientId, status: 'ACTIVE' },
      include: { items: true },
    });

    const goalsMetrics = {
      total: goals.length,
      totalTarget: goals.reduce((sum, g) => sum + Number(g.targetAmount), 0),
      totalCurrent: goals.reduce((sum, g) => sum + Number(g.currentAmount), 0),
      averageProgress: goals.length > 0
        ? goals.reduce((sum, g) => {
            const target = Number(g.targetAmount);
            const current = Number(g.currentAmount);
            return sum + (target > 0 ? (current / target) * 100 : 0);
          }, 0) / goals.length
        : 0,
      onTrack: goals.filter(g => {
        const target = Number(g.targetAmount);
        const current = Number(g.currentAmount);
        const progress = target > 0 ? (current / target) * 100 : 0;
        return progress >= 50;
      }).length,
    };

    // Recurring payments overview
    const recurringPayments = await this.prisma.recurringPayment.findMany({
      where: {
        clientId,
        isActive: true,
      },
    });

    const recurringMetrics = {
      total: recurringPayments.length,
      monthlyTotal: recurringPayments.reduce((sum, rp) => {
        if (rp.frequency === 'MONTHLY') return sum + Number(rp.amount);
        if (rp.frequency === 'YEARLY') return sum + (Number(rp.amount) / 12);
        if (rp.frequency === 'QUARTERLY') return sum + (Number(rp.amount) / 3);
        if (rp.frequency === 'SEMIANNUAL') return sum + (Number(rp.amount) / 6);
        return sum;
      }, 0),
      byFrequency: recurringPayments.reduce((acc, rp) => {
        acc[rp.frequency] = (acc[rp.frequency] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    // Installments overview
    const installments = await this.prisma.installment.findMany({
      where: {
        clientId,
        status: 'ACTIVE',
      },
      include: {
        payments: true,
      },
    });

    const installmentsMetrics = {
      total: installments.length,
      totalAmount: installments.reduce((sum, inst) => sum + Number(inst.totalAmount), 0),
      totalPaid: installments.reduce((sum, inst) => {
        const paid = inst.payments
          .filter(p => p.status === 'PAID')
          .reduce((s, p) => s + Number(p.amount), 0);
        return sum + paid;
      }, 0),
      totalRemaining: installments.reduce((sum, inst) => {
        const remaining = inst.payments
          .filter(p => p.status !== 'PAID')
          .reduce((s, p) => s + Number(p.amount), 0);
        return sum + remaining;
      }, 0),
      upcomingThisMonth: installments.reduce((sum, inst) => {
        const thisMonthPayments = inst.payments
          .filter(p => {
            const dueDate = new Date(p.dueDate);
            return p.status === 'PENDING' &&
                   dueDate.getMonth() === now.getMonth() &&
                   dueDate.getFullYear() === now.getFullYear();
          });
        return sum + thisMonthPayments.reduce((s, p) => s + Number(p.amount), 0);
      }, 0),
    };

    // Financial health indicators
    const averageMonthlyIncome = monthlyTrends.reduce((sum, m) => sum + m.income, 0) / monthlyTrends.length;
    const averageMonthlyExpense = monthlyTrends.reduce((sum, m) => sum + m.expense, 0) / monthlyTrends.length;

    const expenseToIncomeRatio = averageMonthlyIncome > 0
      ? (averageMonthlyExpense / averageMonthlyIncome) * 100
      : 0;

    // Investments overview (if any)
    const investments = await this.prisma.investment.findMany({
      where: { clientId },
    });

    const investmentsMetrics = {
      total: investments.length,
      totalInvested: investments.reduce((sum, inv) => sum + Number(inv.totalInvested), 0),
      byType: investments.reduce((acc, inv) => {
        acc[inv.type] = (acc[inv.type] || 0) + Number(inv.totalInvested);
        return acc;
      }, {} as Record<string, number>),
    };

    // Savings metrics (calculated from goals)
    const savingsMetrics = {
      total: goals.length,
      totalSaved: goals.reduce((sum, goal) => sum + Number(goal.currentAmount), 0),
      totalTarget: goals.reduce((sum, goal) => sum + Number(goal.targetAmount), 0),
    };

    return {
      period,
      summary: {
        totalIncome,
        totalExpense,
        netBalance,
        savingsRate,
        averageMonthlyIncome,
        averageMonthlyExpense,
        expenseToIncomeRatio,
      },
      monthlyTrends,
      categoryBreakdown,
      goals: goalsMetrics,
      recurring: recurringMetrics,
      installments: installmentsMetrics,
      investments: investmentsMetrics,
      savings: savingsMetrics,
      healthIndicators: {
        savingsRate: {
          value: savingsRate,
          status: savingsRate >= 20 ? 'GOOD' : savingsRate >= 10 ? 'MODERATE' : 'LOW',
          message: savingsRate >= 20
            ? 'Ótima taxa de economia!'
            : savingsRate >= 10
            ? 'Taxa de economia razoável'
            : 'Taxa de economia baixa, considere reduzir gastos',
        },
        expenseToIncome: {
          value: expenseToIncomeRatio,
          status: expenseToIncomeRatio <= 80 ? 'GOOD' : expenseToIncomeRatio <= 95 ? 'MODERATE' : 'HIGH',
          message: expenseToIncomeRatio <= 80
            ? 'Gastos bem controlados!'
            : expenseToIncomeRatio <= 95
            ? 'Gastos próximos da renda'
            : 'Atenção: gastos acima da renda!',
        },
        goalsProgress: {
          value: goalsMetrics.averageProgress,
          status: goalsMetrics.averageProgress >= 60 ? 'GOOD' : goalsMetrics.averageProgress >= 30 ? 'MODERATE' : 'LOW',
          message: goalsMetrics.averageProgress >= 60
            ? 'Metas em bom progresso!'
            : goalsMetrics.averageProgress >= 30
            ? 'Metas em progresso moderado'
            : 'Metas precisam de atenção',
        },
      },
    };
  }

  async getHistoryAnalysis(clientId: string, query: any) {
    const { timeRange = 'LAST_30_DAYS', groupBy = 'DAY', includeComparison = 'false' } = query;

    const { startDate, endDate } = this.getDateRangeFromTimeRange(timeRange);

    // Get all transactions in the period
    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        clientId,
        deletedAt: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate metrics
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((netBalance / totalIncome) * 100) : 0;

    // Group data by period
    const groupedData = this.groupTransactionsByPeriod(transactions, groupBy);

    // Calculate trends
    const trends = this.calculateTrends(groupedData);

    // Handle comparison if requested
    let comparison = undefined;
    if (includeComparison === 'true') {
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const comparisonStart = new Date(startDate);
      comparisonStart.setDate(comparisonStart.getDate() - periodDays);
      const comparisonEnd = new Date(startDate);

      const comparisonTransactions = await this.prisma.financialTransaction.findMany({
        where: {
          clientId,
          deletedAt: null,
          date: {
            gte: comparisonStart,
            lt: comparisonEnd,
          },
        },
      });

      const comparisonIncome = comparisonTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const comparisonExpense = comparisonTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      comparison = {
        previous: {
          period: {
            start: comparisonStart.toISOString(),
            end: comparisonEnd.toISOString(),
          },
          metrics: {
            totalIncome: comparisonIncome,
            totalExpense: comparisonExpense,
            netBalance: comparisonIncome - comparisonExpense,
          },
        },
      };
    }

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      },
      metrics: {
        totalIncome,
        totalExpense,
        netBalance,
        savingsRate,
        transactionCount: transactions.length,
        averageIncome: transactions.filter(t => t.type === 'INCOME').length > 0
          ? totalIncome / transactions.filter(t => t.type === 'INCOME').length
          : 0,
        averageExpense: transactions.filter(t => t.type === 'EXPENSE').length > 0
          ? totalExpense / transactions.filter(t => t.type === 'EXPENSE').length
          : 0,
      },
      groupedData,
      trends,
      comparison,
    };
  }

  async getHistoryByCategories(clientId: string, query: any) {
    const { timeRange = 'LAST_30_DAYS' } = query;
    const { startDate, endDate } = this.getDateRangeFromTimeRange(timeRange);

    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        clientId,
        deletedAt: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Group by category
    const categoryMap = new Map<string, { income: number; expense: number }>();

    transactions.forEach(t => {
      const current = categoryMap.get(t.category) || { income: 0, expense: 0 };
      if (t.type === 'INCOME') {
        current.income += Number(t.amount);
      } else {
        current.expense += Number(t.amount);
      }
      categoryMap.set(t.category, current);
    });

    const categories = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      income: data.income,
      expense: data.expense,
      total: data.income + data.expense,
    })).sort((a, b) => b.total - a.total);

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      categories,
    };
  }

  async getTopTransactions(clientId: string, query: any) {
    const { timeRange = 'LAST_30_DAYS' } = query;
    const { startDate, endDate } = this.getDateRangeFromTimeRange(timeRange);

    const [topExpenses, topIncomes] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where: {
          clientId,
          deletedAt: null,
          type: 'EXPENSE',
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { amount: 'desc' },
        take: 10,
        select: {
          id: true,
          description: true,
          category: true,
          amount: true,
          date: true,
        },
      }),
      this.prisma.financialTransaction.findMany({
        where: {
          clientId,
          deletedAt: null,
          type: 'INCOME',
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { amount: 'desc' },
        take: 10,
        select: {
          id: true,
          description: true,
          category: true,
          amount: true,
          date: true,
        },
      }),
    ]);

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      topExpenses: topExpenses.map(t => ({ ...t, title: t.description })),
      topIncomes: topIncomes.map(t => ({ ...t, title: t.description })),
    };
  }

  private getDateRangeFromTimeRange(timeRange: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = endOfMonth(now);
    let startDate: Date;

    switch (timeRange) {
      case 'LAST_7_DAYS':
        startDate = subMonths(now, 0);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'LAST_30_DAYS':
        startDate = subMonths(now, 0);
        startDate.setDate(now.getDate() - 30);
        break;
      case 'LAST_3_MONTHS':
        startDate = subMonths(now, 3);
        break;
      case 'LAST_6_MONTHS':
        startDate = subMonths(now, 6);
        break;
      case 'LAST_12_MONTHS':
        startDate = subMonths(now, 12);
        break;
      case 'THIS_MONTH':
        startDate = startOfMonth(now);
        break;
      case 'LAST_MONTH':
        startDate = startOfMonth(subMonths(now, 1));
        endDate.setTime(startOfMonth(now).getTime() - 1);
        break;
      case 'THIS_YEAR':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'LAST_YEAR':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate.setTime(new Date(now.getFullYear(), 0, 1).getTime() - 1);
        break;
      default:
        startDate = subMonths(now, 1);
    }

    return { startDate, endDate };
  }

  private groupTransactionsByPeriod(transactions: any[], groupBy: string): any[] {
    const groupMap = new Map<string, { income: number; expense: number; count: number }>();

    transactions.forEach(t => {
      const periodKey = this.getPeriodKey(new Date(t.date), groupBy);
      const current = groupMap.get(periodKey) || { income: 0, expense: 0, count: 0 };

      if (t.type === 'INCOME') {
        current.income += Number(t.amount);
      } else {
        current.expense += Number(t.amount);
      }
      current.count += 1;

      groupMap.set(periodKey, current);
    });

    return Array.from(groupMap.entries()).map(([period, data]) => ({
      period,
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense,
      count: data.count,
    }));
  }

  private getPeriodKey(date: Date, groupBy: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (groupBy) {
      case 'DAY':
        return `${year}-${month}-${day}`;
      case 'WEEK':
        const weekNum = Math.ceil(date.getDate() / 7);
        return `${year}-${month}-W${weekNum}`;
      case 'MONTH':
        return `${year}-${month}`;
      case 'QUARTER':
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        return `${year}-Q${quarter}`;
      case 'YEAR':
        return `${year}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  private calculateTrends(groupedData: any[]): { income: string; expense: string; balance: string } {
    if (groupedData.length < 2) {
      return { income: 'stable', expense: 'stable', balance: 'stable' };
    }

    const firstHalf = groupedData.slice(0, Math.floor(groupedData.length / 2));
    const secondHalf = groupedData.slice(Math.floor(groupedData.length / 2));

    const avgIncomeFirst = firstHalf.reduce((sum, d) => sum + d.income, 0) / firstHalf.length;
    const avgIncomeSecond = secondHalf.reduce((sum, d) => sum + d.income, 0) / secondHalf.length;

    const avgExpenseFirst = firstHalf.reduce((sum, d) => sum + d.expense, 0) / firstHalf.length;
    const avgExpenseSecond = secondHalf.reduce((sum, d) => sum + d.expense, 0) / secondHalf.length;

    const avgBalanceFirst = firstHalf.reduce((sum, d) => sum + d.balance, 0) / firstHalf.length;
    const avgBalanceSecond = secondHalf.reduce((sum, d) => sum + d.balance, 0) / secondHalf.length;

    return {
      income: avgIncomeSecond > avgIncomeFirst ? 'increasing' : avgIncomeSecond < avgIncomeFirst ? 'decreasing' : 'stable',
      expense: avgExpenseSecond > avgExpenseFirst ? 'increasing' : avgExpenseSecond < avgExpenseFirst ? 'decreasing' : 'stable',
      balance: avgBalanceSecond > avgBalanceFirst ? 'improving' : avgBalanceSecond < avgBalanceFirst ? 'declining' : 'stable',
    };
  }

  // ========== TRANSACTIONS ==========
  async getTransactions(clientId: string, query: any) {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      startDate,
      endDate,
      search,
    } = query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      clientId,
      deletedAt: null,
    };

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    if (search) {
      where.description = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [transactions, total] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.financialTransaction.count({ where }),
    ]);

    // Calculate summary
    const allTransactions = await this.prisma.financialTransaction.findMany({
      where,
      select: {
        type: true,
        amount: true,
      },
    });

    const totalIncome = allTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = allTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      data: transactions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      },
    };
  }

  async getTransaction(id: string, clientId: string) {
    const transaction = await this.prisma.financialTransaction.findFirst({
      where: {
        id,
        clientId,
        deletedAt: null,
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return transaction;
  }

  async createTransaction(clientId: string, data: any, file?: Express.Multer.File) {
    if (!data) {
      throw new Error('Request body is required');
    }

    const { type, category, amount, description, date, paymentMethod, isFixed, notes } = data;

    if (!type || !category || !amount || !description) {
      throw new Error('Missing required fields: type, category, amount, description');
    }

    const transactionData: any = {
      clientId,
      type,
      category,
      amount: Number(amount),
      description,
      date: date ? new Date(date) : new Date(),
      isFixed: isFixed === 'true' || isFixed === true,
    };

    if (paymentMethod) {
      transactionData.paymentMethod = paymentMethod;
    }

    if (notes) {
      transactionData.notes = notes;
    }

    // TODO: Implement file upload to S3 and store receipt path
    if (file) {
      transactionData.fileName = file.originalname;
      transactionData.mimeType = file.mimetype;
      transactionData.fileSize = file.size;
      // transactionData.receiptPath = await this.uploadToS3(file);
    }

    const transaction = await this.prisma.financialTransaction.create({
      data: transactionData,
    });

    // Automatic income distribution for SALARY
    let distributionResult = null;
    if (type === 'INCOME' && category === 'SALARY') {
      try {
        // Get distribution config
        const config = await this.getDistributionConfig(clientId);

        // Only distribute if config is active and has categories
        if (config.isActive && config.categories.length > 0) {
          // Calculate monthly fixed expenses
          let fixedExpenses = 0;
          if (config.isAutoCalculateExpenses) {
            fixedExpenses = await this.calculateMonthlyExpenses(clientId);
          }

          const availableAmount = Number(amount) - fixedExpenses;

          // Only distribute if there's available amount after expenses
          if (availableAmount > 0) {
            // Create distribution transactions for each category
            const distributions = [];
            for (const cat of config.categories) {
              if (!cat.isActive) continue;

              const distributionAmount =
                (Number(cat.percentage) / 100) * availableAmount;

              // Create a transaction for this distribution
              const distTransaction = await this.prisma.financialTransaction.create({
                data: {
                  clientId,
                  type: 'EXPENSE', // Distribution is treated as an expense/allocation
                  category: 'INVESTMENT', // Use INVESTMENT category for all distributions
                  amount: Math.round(distributionAmount * 100) / 100,
                  description: `Distribuição automática: ${cat.name} (${cat.percentage}% do salário)`,
                  date: transactionData.date,
                  isFixed: false,
                  notes: `Auto-distribuído do salário ID: ${transaction.id}. Categoria: ${cat.name}`,
                },
              });

              distributions.push({
                categoryId: cat.id,
                categoryName: cat.name,
                percentage: Number(cat.percentage),
                amount: Math.round(distributionAmount * 100) / 100,
                transactionId: distTransaction.id,
                color: cat.color,
                icon: cat.icon,
              });
            }

            distributionResult = {
              incomeAmount: Number(amount),
              fixedExpenses,
              availableAmount,
              totalDistributed: distributions.reduce((sum, d) => sum + d.amount, 0),
              distributions,
              message: 'Income automatically distributed according to your configuration',
            };
          }
        }
      } catch (error) {
        console.error('Error during automatic distribution:', error);
        // Don't fail the transaction creation if distribution fails
        // Just log the error and continue
      }
    }

    return {
      transaction,
      distribution: distributionResult,
    };
  }

  async updateTransaction(id: string, clientId: string, data: any) {
    // Verify ownership
    const existing = await this.prisma.financialTransaction.findFirst({
      where: {
        id,
        clientId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new Error('Transaction not found');
    }

    const { type, category, amount, description, date } = data;

    const updateData: any = {};
    if (type) updateData.type = type;
    if (category) updateData.category = category;
    if (amount !== undefined) updateData.amount = Number(amount);
    if (description) updateData.description = description;
    if (date) updateData.date = new Date(date);

    const transaction = await this.prisma.financialTransaction.update({
      where: { id },
      data: updateData,
    });

    return transaction;
  }

  async deleteTransaction(id: string, clientId: string) {
    // Verify ownership
    const existing = await this.prisma.financialTransaction.findFirst({
      where: {
        id,
        clientId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new Error('Transaction not found');
    }

    // Soft delete
    await this.prisma.financialTransaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true, message: 'Transaction deleted successfully' };
  }

  // ========== RECURRING PAYMENTS ==========
  async getRecurringPayments(clientId: string, query: any) {
    const {
      page = 1,
      limit = 20,
      frequency,
      isActive,
    } = query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      clientId,
    };

    if (frequency) {
      where.frequency = frequency;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true' || isActive === true;
    }

    const [payments, total] = await Promise.all([
      this.prisma.recurringPayment.findMany({
        where,
        orderBy: { nextDueDate: 'asc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.recurringPayment.count({ where }),
    ]);

    // Calculate active monthly cost
    const activePayments = await this.prisma.recurringPayment.findMany({
      where: {
        clientId,
        isActive: true,
      },
    });

    const activeMonthlyCost = activePayments.reduce((sum, p) => {
      const amount = Number(p.amount);
      if (p.frequency === 'MONTHLY') return sum + amount;
      if (p.frequency === 'QUARTERLY') return sum + (amount / 3);
      if (p.frequency === 'SEMIANNUAL') return sum + (amount / 6);
      if (p.frequency === 'YEARLY') return sum + (amount / 12);
      return sum;
    }, 0);

    return {
      data: payments,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      summary: {
        activeMonthlyCost,
        activeCount: activePayments.filter(p => p.isActive).length,
        inactiveCount: activePayments.filter(p => !p.isActive).length,
      },
    };
  }

  async getRecurringPayment(id: string, clientId: string) {
    const payment = await this.prisma.recurringPayment.findFirst({
      where: {
        id,
        clientId,
      },
    });

    if (!payment) {
      throw new Error('Recurring payment not found');
    }

    return payment;
  }

  async createRecurringPayment(clientId: string, data: any) {
    const { title, description, amount, frequency, category, dayOfMonth, startDate } = data;

    if (!title || !amount || !frequency || !category || !dayOfMonth || !startDate) {
      throw new Error('Missing required fields: title, amount, frequency, category, dayOfMonth, startDate');
    }

    const start = new Date(startDate);
    const nextDue = new Date(start);
    nextDue.setDate(dayOfMonth);

    const payment = await this.prisma.recurringPayment.create({
      data: {
        clientId,
        title,
        description: description || null,
        amount: Number(amount),
        frequency,
        category,
        dayOfMonth: Number(dayOfMonth),
        startDate: start,
        nextDueDate: nextDue,
        isActive: true,
      },
    });

    return payment;
  }

  async updateRecurringPayment(id: string, clientId: string, data: any) {
    const existing = await this.prisma.recurringPayment.findFirst({
      where: {
        id,
        clientId,
      },
    });

    if (!existing) {
      throw new Error('Recurring payment not found');
    }

    const { title, description, amount, frequency, category, dayOfMonth, endDate } = data;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = Number(amount);
    if (frequency) updateData.frequency = frequency;
    if (category) updateData.category = category;
    if (dayOfMonth !== undefined) updateData.dayOfMonth = Number(dayOfMonth);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

    const payment = await this.prisma.recurringPayment.update({
      where: { id },
      data: updateData,
    });

    return payment;
  }

  async deleteRecurringPayment(id: string, clientId: string) {
    const existing = await this.prisma.recurringPayment.findFirst({
      where: {
        id,
        clientId,
      },
    });

    if (!existing) {
      throw new Error('Recurring payment not found');
    }

    await this.prisma.recurringPayment.delete({
      where: { id },
    });

    return { success: true, message: 'Recurring payment deleted successfully' };
  }

  async toggleRecurringPayment(id: string, clientId: string) {
    const existing = await this.prisma.recurringPayment.findFirst({
      where: {
        id,
        clientId,
      },
    });

    if (!existing) {
      throw new Error('Recurring payment not found');
    }

    const payment = await this.prisma.recurringPayment.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    return payment;
  }

  // ========== INSTALLMENTS ==========
  async getInstallments(clientId: string, query: any) {
    const {
      page = 1,
      limit = 20,
      status,
      category,
    } = query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      clientId,
    };

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    const [installments, total] = await Promise.all([
      this.prisma.installment.findMany({
        where,
        include: {
          payments: {
            orderBy: { installmentNumber: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.installment.count({ where }),
    ]);

    // Calculate summary
    const allInstallments = await this.prisma.installment.findMany({
      where: {
        clientId,
        status: 'ACTIVE',
      },
      include: {
        payments: {
          where: {
            status: 'PENDING',
          },
        },
      },
    });

    const totalRemainingAmount = allInstallments.reduce((sum, inst) => {
      const remaining = inst.payments.reduce((pSum, p) => pSum + Number(p.amount), 0);
      return sum + remaining;
    }, 0);

    const totalUpcomingPayments = allInstallments.reduce((sum, inst) => {
      return sum + inst.payments.length;
    }, 0);

    return {
      data: installments,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      summary: {
        totalRemainingAmount,
        totalUpcomingPayments,
        activeInstallments: allInstallments.length,
      },
    };
  }

  async getInstallment(id: string, clientId: string) {
    const installment = await this.prisma.installment.findFirst({
      where: {
        id,
        clientId,
      },
      include: {
        payments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!installment) {
      throw new Error('Installment not found');
    }

    return installment;
  }

  async createInstallment(clientId: string, data: any) {
    const { title, description, totalAmount, installmentCount, category, firstDueDate } = data;

    if (!title || !totalAmount || !installmentCount || !category || !firstDueDate) {
      throw new Error('Missing required fields: title, totalAmount, installmentCount, category, firstDueDate');
    }

    // Valid transaction categories
    const validCategories = [
      'SALARY', 'FREELANCE', 'INVESTMENT_RETURN', 'GIFT', 'OTHER_INCOME',
      'FOOD', 'TRANSPORT', 'HEALTH', 'EDUCATION', 'HOUSING', 'UTILITIES',
      'ENTERTAINMENT', 'SHOPPING', 'SUBSCRIPTION', 'INSURANCE', 'INVESTMENT',
      'FURNITURE', 'EQUIPMENT', 'OTHER_EXPENSE'
    ];

    if (!validCategories.includes(category)) {
      throw new Error(`Invalid category "${category}". Valid categories are: ${validCategories.join(', ')}`);
    }

    const installmentAmount = Number(totalAmount) / Number(installmentCount);

    try {
      // Create installment with payments
      const installment = await this.prisma.installment.create({
        data: {
          clientId,
          title,
          description: description || null,
          totalAmount: Number(totalAmount),
          installmentCount: Number(installmentCount),
          installmentAmount,
          category,
          firstDueDate: new Date(firstDueDate),
          status: 'ACTIVE',
          paidCount: 0,
          payments: {
            create: Array.from({ length: Number(installmentCount) }, (_, i) => {
              const dueDate = new Date(firstDueDate);
              dueDate.setMonth(dueDate.getMonth() + i);

              return {
                installmentNumber: i + 1,
                amount: installmentAmount,
                dueDate,
                status: 'PENDING',
              };
            }),
          },
        },
        include: {
          payments: {
            orderBy: { installmentNumber: 'asc' },
          },
        },
      });

      return installment;
    } catch (error) {
      // Re-throw our custom error messages
      if (error.message && error.message.includes('Invalid category')) {
        throw error;
      }
      // Handle Prisma validation errors
      if (error.code || error.message.includes('Prisma')) {
        throw new Error(`Invalid category "${category}". Valid categories are: ${validCategories.join(', ')}`);
      }
      throw error;
    }
  }

  async updateInstallment(id: string, clientId: string, data: any) {
    // First verify ownership
    const existing = await this.prisma.installment.findFirst({
      where: { id, clientId },
    });

    if (!existing) {
      throw new Error('Installment not found');
    }

    const { title, description } = data;

    const installment = await this.prisma.installment.update({
      where: { id },
      data: {
        title: title || existing.title,
        description: description !== undefined ? description : existing.description,
        updatedAt: new Date(),
      },
      include: {
        payments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    return installment;
  }

  async deleteInstallment(id: string, clientId: string) {
    // First verify ownership
    const existing = await this.prisma.installment.findFirst({
      where: { id, clientId },
    });

    if (!existing) {
      throw new Error('Installment not found');
    }

    await this.prisma.installment.delete({
      where: { id },
    });

    return { success: true, message: 'Installment deleted successfully' };
  }

  async cancelInstallment(id: string, clientId: string) {
    // First verify ownership
    const existing = await this.prisma.installment.findFirst({
      where: { id, clientId },
    });

    if (!existing) {
      throw new Error('Installment not found');
    }

    const installment = await this.prisma.installment.update({
      where: { id },
      data: {
        status: 'CANCELED',
        updatedAt: new Date(),
      },
      include: {
        payments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    return installment;
  }

  async payInstallmentFromPaymentId(clientId: string, paymentId: string, body: any) {
    // First find the payment and its installment
    const payment = await this.prisma.installmentPayment.findUnique({
      where: { id: paymentId },
      include: {
        installment: true,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Verify ownership
    if (payment.installment.clientId !== clientId) {
      throw new Error('Unauthorized: This payment does not belong to you');
    }

    if (payment.status === 'PAID') {
      throw new Error('Payment already paid');
    }

    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();

    // Update payment as paid
    const updatedPayment = await this.prisma.installmentPayment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        paidDate: paymentDate,
        updatedAt: new Date(),
      },
    });

    // Get all payments to calculate paidCount
    const allPayments = await this.prisma.installmentPayment.findMany({
      where: { installmentId: payment.installmentId },
    });

    const paidCount = allPayments.filter(p => p.status === 'PAID').length;

    // Update installment paidCount and status
    await this.prisma.installment.update({
      where: { id: payment.installmentId },
      data: {
        paidCount,
        status: paidCount === payment.installment.installmentCount ? 'COMPLETED' : 'ACTIVE',
        updatedAt: new Date(),
      },
    });

    return updatedPayment;
  }

  async payInstallmentPayment(installmentId: string, paymentId: string, clientId: string) {
    // First verify ownership of installment
    const installment = await this.prisma.installment.findFirst({
      where: { id: installmentId, clientId },
      include: {
        payments: true,
      },
    });

    if (!installment) {
      throw new Error('Installment not found');
    }

    // Find the payment
    const payment = installment.payments.find(p => p.id === paymentId);

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 'PAID') {
      throw new Error('Payment already paid');
    }

    // Update payment as paid
    const updatedPayment = await this.prisma.installmentPayment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        paidDate: new Date(),
        updatedAt: new Date(),
      },
    });

    // Update installment paidCount
    const paidCount = installment.payments.filter(p => p.status === 'PAID' || p.id === paymentId).length;

    await this.prisma.installment.update({
      where: { id: installmentId },
      data: {
        paidCount,
        status: paidCount === installment.installmentCount ? 'COMPLETED' : 'ACTIVE',
        updatedAt: new Date(),
      },
    });

    return updatedPayment;
  }

  // ========== INVESTMENTS ==========
  async getInvestments(clientId: string, query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;
    const type = query.type; // Optional filter by investment type

    const where: any = {
      clientId,
      deletedAt: null,
    };

    if (type) {
      where.type = type;
    }

    const [investmentsRaw, total] = await Promise.all([
      this.prisma.investment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          transactions: {
            orderBy: { date: 'desc' },
            take: 5,
          },
        },
      }),
      this.prisma.investment.count({ where }),
    ]);

    // Add calculated fields to each investment
    const investments = investmentsRaw.map(inv => {
      const invTotalInvested = Number(inv.totalInvested);
      const invCurrentValue = Number(inv.currentValue);
      const invProfitLoss = invCurrentValue - invTotalInvested;
      const invProfitLossPercentage = invTotalInvested > 0 ? (invProfitLoss / invTotalInvested) * 100 : 0;

      return {
        ...inv,
        totalValue: invCurrentValue,
        profitLoss: invProfitLoss,
        profitLossPercentage: invProfitLossPercentage,
        currentPrice: inv.currentValue, // For compatibility
      };
    });

    // Calculate summary statistics
    const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.totalInvested), 0);
    const totalCurrentValue = investments.reduce((sum, inv) => sum + Number(inv.currentValue), 0);
    const totalProfitLoss = totalCurrentValue - totalInvested;
    const totalProfitLossPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    // Group by type
    const byType = investments.reduce((acc, inv) => {
      const type = inv.type;
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          totalInvested: 0,
          totalCurrentValue: 0,
        };
      }
      acc[type].count++;
      acc[type].totalInvested += Number(inv.totalInvested);
      acc[type].totalCurrentValue += Number(inv.currentValue);
      return acc;
    }, {});

    return {
      data: investments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalInvestments: total,
        totalInvested,
        totalCurrentValue,
        totalProfitLoss,
        totalProfitLossPercentage,
        byType,
      },
    };
  }

  async getInvestment(id: string, clientId: string) {
    const investment = await this.prisma.investment.findFirst({
      where: {
        id,
        clientId,
        deletedAt: null,
      },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!investment) {
      throw new Error('Investment not found');
    }

    // Add calculated fields
    const totalInvested = Number(investment.totalInvested);
    const currentValue = Number(investment.currentValue);
    const profitLoss = currentValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    return {
      ...investment,
      totalValue: currentValue,
      profitLoss,
      profitLossPercentage,
      currentPrice: investment.currentValue,
    };
  }

  async createInvestment(clientId: string, data: any) {
    const { type, name, description, ticker, totalInvested, currentValue, currentQuantity, metadata } = data;

    if (!type || !name) {
      throw new Error('Type and name are required');
    }

    const validTypes = ['STOCK', 'FUND', 'FIXED_INCOME', 'CRYPTO', 'REAL_ESTATE', 'SAVINGS_BOX', 'OTHER'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid investment type "${type}". Valid types are: ${validTypes.join(', ')}`);
    }

    const invested = Number(totalInvested) || 0;
    const current = Number(currentValue) || invested;
    const quantity = Number(currentQuantity) || 0;
    const avgPrice = quantity > 0 ? invested / quantity : 0;

    try {
      const investment = await this.prisma.investment.create({
        data: {
          clientId,
          type,
          name: name.trim(),
          description: description?.trim() || null,
          ticker: ticker?.trim()?.toUpperCase() || null,
          totalInvested: invested,
          currentValue: current,
          currentQuantity: quantity,
          averagePrice: avgPrice,
          metadata: metadata || null,
        },
        include: {
          transactions: true,
        },
      });

      // Add calculated fields
      const profitLoss = current - invested;
      const profitLossPercentage = invested > 0 ? (profitLoss / invested) * 100 : 0;

      return {
        ...investment,
        totalValue: current,
        profitLoss,
        profitLossPercentage,
        currentPrice: current,
      };
    } catch (error) {
      if (error.code || error.message?.includes('Prisma')) {
        throw new Error(`Invalid investment type "${type}". Valid types are: ${validTypes.join(', ')}`);
      }
      throw error;
    }
  }

  async updateInvestment(id: string, clientId: string, data: any) {
    // Verify ownership
    const existing = await this.prisma.investment.findFirst({
      where: { id, clientId, deletedAt: null },
    });

    if (!existing) {
      throw new Error('Investment not found');
    }

    const { type, name, description, ticker, totalInvested, currentValue, currentQuantity, metadata } = data;

    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (ticker !== undefined) {
      updateData.ticker = ticker?.trim()?.toUpperCase() || null;
    }

    if (type !== undefined) {
      const validTypes = ['STOCK', 'FUND', 'FIXED_INCOME', 'CRYPTO', 'REAL_ESTATE', 'SAVINGS_BOX', 'OTHER'];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid investment type "${type}". Valid types are: ${validTypes.join(', ')}`);
      }
      updateData.type = type;
    }

    if (totalInvested !== undefined) {
      updateData.totalInvested = Number(totalInvested);
    }

    if (currentValue !== undefined) {
      updateData.currentValue = Number(currentValue);
    }

    if (currentQuantity !== undefined) {
      updateData.currentQuantity = Number(currentQuantity);
      const quantity = Number(currentQuantity);
      const invested = totalInvested !== undefined ? Number(totalInvested) : Number(existing.totalInvested);
      updateData.averagePrice = quantity > 0 ? invested / quantity : 0;
    }

    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }

    updateData.updatedAt = new Date();

    const investment = await this.prisma.investment.update({
      where: { id },
      data: updateData,
      include: {
        transactions: {
          orderBy: { date: 'desc' },
        },
      },
    });

    // Add calculated fields
    const finalTotalInvested = Number(investment.totalInvested);
    const finalCurrentValue = Number(investment.currentValue);
    const profitLoss = finalCurrentValue - finalTotalInvested;
    const profitLossPercentage = finalTotalInvested > 0 ? (profitLoss / finalTotalInvested) * 100 : 0;

    return {
      ...investment,
      totalValue: finalCurrentValue,
      profitLoss,
      profitLossPercentage,
      currentPrice: finalCurrentValue,
    };
  }

  async deleteInvestment(id: string, clientId: string) {
    // Verify ownership
    const existing = await this.prisma.investment.findFirst({
      where: { id, clientId, deletedAt: null },
    });

    if (!existing) {
      throw new Error('Investment not found');
    }

    // Soft delete
    await this.prisma.investment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return { success: true, message: 'Investment deleted successfully' };
  }

  async buyInvestment(id: string) {
    return { success: false, message: 'Not implemented yet' };
  }

  async sellInvestment(id: string) {
    return { success: false, message: 'Not implemented yet' };
  }

  async depositToSavingsBox(id: string, clientId: string, data: any) {
    const { amount, description } = data;

    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    const depositAmount = Number(amount);

    // Find the investment and verify it belongs to the client
    const investment = await this.prisma.investment.findFirst({
      where: {
        id,
        clientId,
        deletedAt: null,
      },
    });

    if (!investment) {
      throw new Error('Investment not found');
    }

    // Verify it's a savings box
    if (investment.type !== 'SAVINGS_BOX') {
      throw new Error('Only SAVINGS_BOX type investments can use deposit/withdraw operations');
    }

    // Update the investment - increase both totalInvested and currentValue
    const updatedInvestment = await this.prisma.investment.update({
      where: { id },
      data: {
        totalInvested: {
          increment: depositAmount,
        },
        currentValue: {
          increment: depositAmount,
        },
      },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    // Create a transaction record
    await this.prisma.investmentTransaction.create({
      data: {
        investmentId: id,
        type: 'DEPOSIT',
        amount: depositAmount,
        date: new Date(),
        description: description || 'Depósito na caixinha',
      },
    });

    // Calculate and return with calculated fields
    const finalTotalInvested = Number(updatedInvestment.totalInvested);
    const finalCurrentValue = Number(updatedInvestment.currentValue);
    const profitLoss = finalCurrentValue - finalTotalInvested;
    const profitLossPercentage = finalTotalInvested > 0 ? (profitLoss / finalTotalInvested) * 100 : 0;

    return {
      ...updatedInvestment,
      totalValue: finalCurrentValue,
      profitLoss,
      profitLossPercentage,
      currentPrice: finalCurrentValue,
    };
  }

  async withdrawFromSavingsBox(id: string, clientId: string, data: any) {
    const { amount, description } = data;

    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    const withdrawAmount = Number(amount);

    // Find the investment and verify it belongs to the client
    const investment = await this.prisma.investment.findFirst({
      where: {
        id,
        clientId,
        deletedAt: null,
      },
    });

    if (!investment) {
      throw new Error('Investment not found');
    }

    // Verify it's a savings box
    if (investment.type !== 'SAVINGS_BOX') {
      throw new Error('Only SAVINGS_BOX type investments can use deposit/withdraw operations');
    }

    // Check if there's enough balance
    const currentValue = Number(investment.currentValue);
    if (currentValue < withdrawAmount) {
      throw new Error(`Insufficient balance. Current balance: ${currentValue}, requested withdrawal: ${withdrawAmount}`);
    }

    // Update the investment - decrease both totalInvested and currentValue
    const updatedInvestment = await this.prisma.investment.update({
      where: { id },
      data: {
        totalInvested: {
          decrement: withdrawAmount,
        },
        currentValue: {
          decrement: withdrawAmount,
        },
      },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    // Create a transaction record
    await this.prisma.investmentTransaction.create({
      data: {
        investmentId: id,
        type: 'WITHDRAWAL',
        amount: withdrawAmount,
        date: new Date(),
        description: description || 'Retirada da caixinha',
      },
    });

    // Calculate and return with calculated fields
    const finalTotalInvested = Number(updatedInvestment.totalInvested);
    const finalCurrentValue = Number(updatedInvestment.currentValue);
    const profitLoss = finalCurrentValue - finalTotalInvested;
    const profitLossPercentage = finalTotalInvested > 0 ? (profitLoss / finalTotalInvested) * 100 : 0;

    return {
      ...updatedInvestment,
      totalValue: finalCurrentValue,
      profitLoss,
      profitLossPercentage,
      currentPrice: finalCurrentValue,
    };
  }

  // ========== GOALS ==========
  async getGoals(clientId: string, query: any) {
    const { page = 1, limit = 50, status, priority } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      clientId,
    };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    const [goals, total] = await Promise.all([
      this.prisma.financialGoal.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          items: {
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          },
        },
        orderBy: [
          { targetDate: 'asc' },
          { priority: 'desc' },
        ],
      }),
      this.prisma.financialGoal.count({ where }),
    ]);

    // Calculate summary statistics
    const allGoals = await this.prisma.financialGoal.findMany({
      where: { clientId },
    });

    const summary = {
      totalGoals: allGoals.length,
      totalTarget: allGoals.reduce((sum, g) => sum + Number(g.targetAmount), 0),
      totalCurrent: allGoals.reduce((sum, g) => sum + Number(g.currentAmount), 0),
      totalRemaining: 0,
      totalProgress: 0,
      byStatus: {
        active: allGoals.filter(g => g.status === 'ACTIVE').length,
        completed: allGoals.filter(g => g.status === 'COMPLETED').length,
        paused: allGoals.filter(g => g.status === 'PAUSED').length,
        canceled: allGoals.filter(g => g.status === 'CANCELED').length,
      },
    };

    summary.totalRemaining = summary.totalTarget - summary.totalCurrent;
    summary.totalProgress = summary.totalTarget > 0
      ? (summary.totalCurrent / summary.totalTarget) * 100
      : 0;

    // Add calculated fields to each goal
    const goalsWithProgress = goals.map(goal => {
      const target = Number(goal.targetAmount);
      const current = Number(goal.currentAmount);
      const progress = target > 0 ? (current / target) * 100 : 0;
      const remaining = target - current;

      return {
        ...goal,
        progress,
        remaining,
      };
    });

    return {
      data: goalsWithProgress,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  async getGoal(id: string, clientId: string) {
    const goal = await this.prisma.financialGoal.findFirst({
      where: {
        id,
        clientId,
      },
      include: {
        items: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    const target = Number(goal.targetAmount);
    const current = Number(goal.currentAmount);
    const progress = target > 0 ? (current / target) * 100 : 0;
    const remaining = target - current;

    return {
      ...goal,
      progress,
      remaining,
    };
  }

  async createGoal(clientId: string, data: any) {
    const { title, description, targetAmount, targetDate, priority = 'MEDIUM' } = data;

    if (!title || !targetAmount || !targetDate) {
      throw new Error('Title, target amount, and target date are required');
    }

    const amount = Number(targetAmount);
    if (amount <= 0) {
      throw new Error('Target amount must be greater than zero');
    }

    const goal = await this.prisma.financialGoal.create({
      data: {
        clientId,
        title: title.trim(),
        description: description?.trim() || null,
        targetAmount: amount,
        currentAmount: 0,
        targetDate: new Date(targetDate),
        priority,
        status: 'ACTIVE',
      },
    });

    const progress = 0;
    const remaining = amount;

    return {
      ...goal,
      progress,
      remaining,
    };
  }

  async updateGoal(id: string, clientId: string, data: any) {
    // Verify ownership
    const existing = await this.prisma.financialGoal.findFirst({
      where: { id, clientId },
    });

    if (!existing) {
      throw new Error('Goal not found');
    }

    const { title, description, targetAmount, targetDate, priority, status } = data;

    const updateData: any = {};

    if (title !== undefined) {
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (targetAmount !== undefined) {
      const amount = Number(targetAmount);
      if (amount <= 0) {
        throw new Error('Target amount must be greater than zero');
      }
      updateData.targetAmount = amount;
    }

    if (targetDate !== undefined) {
      updateData.targetDate = new Date(targetDate);
    }

    if (priority !== undefined) {
      updateData.priority = priority;
    }

    if (status !== undefined) {
      updateData.status = status;

      // If completing, set completed date and current amount to target
      if (status === 'COMPLETED' && existing.status !== 'COMPLETED') {
        updateData.completedAt = new Date();
        updateData.currentAmount = existing.targetAmount;
      }
    }

    const goal = await this.prisma.financialGoal.update({
      where: { id },
      data: updateData,
    });

    const target = Number(goal.targetAmount);
    const current = Number(goal.currentAmount);
    const progress = target > 0 ? (current / target) * 100 : 0;
    const remaining = target - current;

    return {
      ...goal,
      progress,
      remaining,
    };
  }

  async deleteGoal(id: string, clientId: string) {
    // Verify ownership
    const existing = await this.prisma.financialGoal.findFirst({
      where: { id, clientId },
    });

    if (!existing) {
      throw new Error('Goal not found');
    }

    await this.prisma.financialGoal.delete({
      where: { id },
    });

    return { success: true, message: 'Goal deleted successfully' };
  }

  async contributeToGoal(id: string, clientId: string, data: any) {
    const { amount } = data;

    if (!amount || amount <= 0) {
      throw new Error('Contribution amount must be greater than zero');
    }

    const contributionAmount = Number(amount);

    // Verify ownership
    const goal = await this.prisma.financialGoal.findFirst({
      where: { id, clientId },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    if (goal.status !== 'ACTIVE') {
      throw new Error('Can only contribute to active goals');
    }

    const newAmount = Number(goal.currentAmount) + contributionAmount;
    const target = Number(goal.targetAmount);

    // Check if goal is now completed
    const updateData: any = {
      currentAmount: newAmount,
    };

    if (newAmount >= target && goal.status === 'ACTIVE') {
      updateData.status = 'COMPLETED';
      updateData.completedAt = new Date();
      updateData.currentAmount = target; // Cap at target
    }

    const updatedGoal = await this.prisma.financialGoal.update({
      where: { id },
      data: updateData,
    });

    const current = Number(updatedGoal.currentAmount);
    const progress = target > 0 ? (current / target) * 100 : 0;
    const remaining = Math.max(0, target - current);

    return {
      ...updatedGoal,
      progress,
      remaining,
      contributed: contributionAmount,
    };
  }

  // ========== GOAL ITEMS ==========
  async getGoalItems(goalId: string, clientId: string) {
    // Verify goal ownership
    const goal = await this.prisma.financialGoal.findFirst({
      where: { id: goalId, clientId },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    const items = await this.prisma.goalItem.findMany({
      where: { goalId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    const totalItems = items.length;
    const purchasedItems = items.filter((item) => item.isPurchased).length;
    const totalAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);
    const purchasedAmount = items
      .filter((item) => item.isPurchased)
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const pendingAmount = totalAmount - purchasedAmount;

    return {
      data: items,
      summary: {
        totalItems,
        purchasedItems,
        pendingItems: totalItems - purchasedItems,
        totalAmount,
        purchasedAmount,
        pendingAmount,
      },
    };
  }

  async createGoalItem(goalId: string, clientId: string, data: any) {
    const { title, description, amount } = data;

    if (!title) {
      throw new Error('Title is required');
    }

    // Verify goal ownership
    const goal = await this.prisma.financialGoal.findFirst({
      where: { id: goalId, clientId },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    // Get the next order number
    const lastItem = await this.prisma.goalItem.findFirst({
      where: { goalId },
      orderBy: { order: 'desc' },
    });

    const order = lastItem ? lastItem.order + 1 : 0;

    const item = await this.prisma.goalItem.create({
      data: {
        goalId,
        title,
        description,
        amount: amount || 0,
        order,
      },
    });

    return item;
  }

  async updateGoalItem(
    goalId: string,
    itemId: string,
    clientId: string,
    data: any,
  ) {
    // Verify goal ownership
    const goal = await this.prisma.financialGoal.findFirst({
      where: { id: goalId, clientId },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    // Verify item exists
    const existing = await this.prisma.goalItem.findFirst({
      where: { id: itemId, goalId },
    });

    if (!existing) {
      throw new Error('Item not found');
    }

    const { title, description, isCompleted, order } = data;

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = order;

    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted;
      updateData.completedAt = isCompleted ? new Date() : null;
    }

    const item = await this.prisma.goalItem.update({
      where: { id: itemId },
      data: updateData,
    });

    return item;
  }

  async toggleGoalItem(goalId: string, itemId: string, clientId: string) {
    // Verify goal ownership
    const goal = await this.prisma.financialGoal.findFirst({
      where: { id: goalId, clientId },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    // Verify item exists
    const existing = await this.prisma.goalItem.findFirst({
      where: { id: itemId, goalId },
    });

    if (!existing) {
      throw new Error('Item not found');
    }

    const newIsPurchased = !existing.isPurchased;

    const item = await this.prisma.goalItem.update({
      where: { id: itemId },
      data: {
        isPurchased: newIsPurchased,
        purchasedAt: newIsPurchased ? new Date() : null,
      },
    });

    // Calculate new currentAmount based on purchased items
    const allItems = await this.prisma.goalItem.findMany({
      where: { goalId },
    });

    const currentAmount = allItems
      .filter((i) => i.isPurchased)
      .reduce((sum, i) => sum + Number(i.amount), 0);

    // Update goal's currentAmount
    await this.prisma.financialGoal.update({
      where: { id: goalId },
      data: { currentAmount },
    });

    return item;
  }

  async deleteGoalItem(goalId: string, itemId: string, clientId: string) {
    // Verify goal ownership
    const goal = await this.prisma.financialGoal.findFirst({
      where: { id: goalId, clientId },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    // Verify item exists
    const existing = await this.prisma.goalItem.findFirst({
      where: { id: itemId, goalId },
    });

    if (!existing) {
      throw new Error('Item not found');
    }

    await this.prisma.goalItem.delete({
      where: { id: itemId },
    });

    // Recalculate currentAmount based on remaining purchased items
    const remainingItems = await this.prisma.goalItem.findMany({
      where: { goalId },
    });

    const currentAmount = remainingItems
      .filter((i) => i.isPurchased)
      .reduce((sum, i) => sum + Number(i.amount), 0);

    // Update goal's currentAmount
    await this.prisma.financialGoal.update({
      where: { id: goalId },
      data: { currentAmount },
    });

    return { success: true, message: 'Item deleted successfully' };
  }

  // ========== INCOME DISTRIBUTION ==========
  async getDistributionConfig(clientId: string) {
    let config = await this.prisma.incomeDistributionConfig.findUnique({
      where: { clientId },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { priority: 'asc' },
        },
      },
    });

    // Create default config if doesn't exist
    if (!config) {
      config = await this.prisma.incomeDistributionConfig.create({
        data: {
          clientId,
          isAutoCalculateExpenses: true,
          isActive: true,
        },
        include: {
          categories: true,
        },
      });
    }

    return config;
  }

  async calculateMonthlyExpenses(clientId: string): Promise<number> {
    const recurringPayments = await this.prisma.recurringPayment.findMany({
      where: {
        clientId,
        isActive: true,
      },
    });

    const monthlyTotal = recurringPayments.reduce((sum, payment) => {
      const amount = Number(payment.amount);

      switch (payment.frequency) {
        case 'MONTHLY':
          return sum + amount;
        case 'QUARTERLY':
          return sum + (amount / 3);
        case 'SEMIANNUAL':
          return sum + (amount / 6);
        case 'YEARLY':
          return sum + (amount / 12);
        default:
          return sum;
      }
    }, 0);

    return monthlyTotal;
  }

  async simulateDistribution(clientId: string, incomeAmount: number) {
    const config = await this.getDistributionConfig(clientId);

    if (!config.isActive) {
      throw new Error('Income distribution is not active for this client');
    }

    // Calculate monthly expenses
    let fixedExpenses = 0;
    if (config.isAutoCalculateExpenses) {
      fixedExpenses = await this.calculateMonthlyExpenses(clientId);
    }

    const availableAmount = incomeAmount - fixedExpenses;

    if (availableAmount < 0) {
      throw new Error('Income is not enough to cover fixed expenses');
    }

    // Calculate distribution based on categories
    const distribution = config.categories.map(category => {
      const amount = (Number(category.percentage) / 100) * availableAmount;

      return {
        categoryId: category.id,
        categoryName: category.name,
        percentage: Number(category.percentage),
        amount: Math.round(amount * 100) / 100, // Round to 2 decimals
        color: category.color,
        icon: category.icon,
        priority: category.priority,
      };
    });

    const totalPercentage = config.categories.reduce(
      (sum, cat) => sum + Number(cat.percentage),
      0
    );

    const totalDistributed = distribution.reduce(
      (sum, dist) => sum + dist.amount,
      0
    );

    return {
      incomeAmount,
      fixedExpenses,
      availableAmount,
      totalPercentage,
      totalDistributed,
      remaining: availableAmount - totalDistributed,
      distribution,
    };
  }

  async updateDistributionConfig(clientId: string, data: any) {
    const { isAutoCalculateExpenses, isActive } = data;

    const config = await this.getDistributionConfig(clientId);

    const updateData: any = {};

    if (isAutoCalculateExpenses !== undefined) {
      updateData.isAutoCalculateExpenses = isAutoCalculateExpenses;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return config;
    }

    const updated = await this.prisma.incomeDistributionConfig.update({
      where: { id: config.id },
      data: updateData,
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { priority: 'asc' },
        },
      },
    });

    return updated;
  }

  async addDistributionCategory(clientId: string, data: any) {
    const { name, percentage, color, icon, priority, isActive } = data;

    if (!name) {
      throw new Error('Category name is required');
    }

    if (percentage === undefined || percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }

    const config = await this.getDistributionConfig(clientId);

    // Check if total percentage would exceed 100%
    const currentTotal = await this.prisma.incomeDistributionCategory.aggregate({
      where: {
        configId: config.id,
        isActive: true,
      },
      _sum: {
        percentage: true,
      },
    });

    const currentPercentage = Number(currentTotal._sum.percentage) || 0;
    const newTotal = currentPercentage + Number(percentage);

    if (newTotal > 100) {
      throw new Error(
        `Total percentage would exceed 100%. Current: ${currentPercentage}%, Adding: ${percentage}%, Total: ${newTotal}%`
      );
    }

    const category = await this.prisma.incomeDistributionCategory.create({
      data: {
        configId: config.id,
        name: name.trim(),
        percentage: Number(percentage),
        color: color || null,
        icon: icon || null,
        priority: priority !== undefined ? Number(priority) : 999,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return category;
  }

  async updateDistributionCategory(categoryId: string, clientId: string, data: any) {
    // Verify category belongs to client
    const category = await this.prisma.incomeDistributionCategory.findFirst({
      where: {
        id: categoryId,
        config: {
          clientId,
        },
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    const { name, percentage, color, icon, priority, isActive } = data;

    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (percentage !== undefined) {
      if (percentage < 0 || percentage > 100) {
        throw new Error('Percentage must be between 0 and 100');
      }

      // Check if total percentage would exceed 100%
      const config = await this.prisma.incomeDistributionConfig.findUnique({
        where: { id: category.configId },
        include: {
          categories: {
            where: {
              isActive: true,
              id: { not: categoryId },
            },
          },
        },
      });

      const otherCategoriesTotal = config.categories.reduce(
        (sum, cat) => sum + Number(cat.percentage),
        0
      );

      const newTotal = otherCategoriesTotal + Number(percentage);

      if (newTotal > 100) {
        throw new Error(
          `Total percentage would exceed 100%. Other categories: ${otherCategoriesTotal}%, New percentage: ${percentage}%, Total: ${newTotal}%`
        );
      }

      updateData.percentage = Number(percentage);
    }

    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (priority !== undefined) updateData.priority = Number(priority);
    if (isActive !== undefined) updateData.isActive = isActive;

    if (Object.keys(updateData).length === 0) {
      return category;
    }

    const updated = await this.prisma.incomeDistributionCategory.update({
      where: { id: categoryId },
      data: updateData,
    });

    return updated;
  }

  async deleteDistributionCategory(categoryId: string, clientId: string) {
    // Verify category belongs to client
    const category = await this.prisma.incomeDistributionCategory.findFirst({
      where: {
        id: categoryId,
        config: {
          clientId,
        },
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    await this.prisma.incomeDistributionCategory.delete({
      where: { id: categoryId },
    });

    return { success: true, message: 'Category deleted successfully' };
  }

  // ========== AI INSIGHTS ==========
  async getAIInsights(query: any) {
    return [];
  }

  async generateAIInsights() {
    return { success: false, message: 'Not implemented yet' };
  }

  async markInsightAsRead(id: string) {
    return { success: false, message: 'Not implemented yet' };
  }

  async dismissInsight(id: string) {
    return { success: false, message: 'Not implemented yet' };
  }
}
