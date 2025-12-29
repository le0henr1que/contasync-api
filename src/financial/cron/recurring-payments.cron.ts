import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { addMonths, addYears, setDate, isAfter, startOfDay } from 'date-fns';
import { RecurringFrequency, TransactionSource } from '@prisma/client';

@Injectable()
export class RecurringPaymentsCronService {
  private readonly logger = new Logger(RecurringPaymentsCronService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Runs daily at 1 AM to process recurring payments
   * Generates financial transactions for recurring payments that are due
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async processRecurringPayments() {
    this.logger.log('Starting recurring payments processing...');

    try {
      const today = startOfDay(new Date());

      // Find all active recurring payments whose nextDueDate has arrived
      const recurringPayments = await this.prisma.recurringPayment.findMany({
        where: {
          isActive: true,
          nextDueDate: {
            lte: today,
          },
          OR: [
            { endDate: null }, // No end date
            { endDate: { gte: today } }, // End date is in the future
          ],
        },
      });

      this.logger.log(`Found ${recurringPayments.length} recurring payments to process`);

      let processedCount = 0;
      let errorCount = 0;

      for (const recurring of recurringPayments) {
        try {
          // Check if end date has been reached
          if (recurring.endDate && isAfter(today, recurring.endDate)) {
            this.logger.log(
              `Recurring payment ${recurring.id} has reached end date. Deactivating.`,
            );
            await this.prisma.recurringPayment.update({
              where: { id: recurring.id },
              data: { isActive: false },
            });
            continue;
          }

          // Create the financial transaction
          const transaction = await this.prisma.financialTransaction.create({
            data: {
              clientId: recurring.clientId,
              type: this.getCategoryType(recurring.category),
              category: recurring.category,
              description: recurring.description || recurring.title,
              amount: recurring.amount,
              date: recurring.nextDueDate,
              isFixed: true,
              notes: `Gerado automaticamente de: ${recurring.title}`,
              sourceType: TransactionSource.RECURRING,
              sourceId: recurring.id,
            },
          });

          // Calculate next due date
          const nextDueDate = this.calculateNextDueDate(
            recurring.nextDueDate,
            recurring.frequency,
            recurring.dayOfMonth,
          );

          // Update the recurring payment
          await this.prisma.recurringPayment.update({
            where: { id: recurring.id },
            data: {
              lastProcessedDate: recurring.nextDueDate,
              nextDueDate: nextDueDate,
            },
          });

          this.logger.log(
            `Processed recurring payment ${recurring.id}: created transaction ${transaction.id}, next due date: ${nextDueDate.toISOString()}`,
          );
          processedCount++;
        } catch (error) {
          this.logger.error(
            `Error processing recurring payment ${recurring.id}: ${error.message}`,
            error.stack,
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Recurring payments processing completed. Processed: ${processedCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Fatal error during recurring payments processing: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Calculates the next due date based on the current due date and frequency
   */
  private calculateNextDueDate(
    currentDueDate: Date,
    frequency: RecurringFrequency,
    dayOfMonth: number,
  ): Date {
    let nextDate: Date;

    switch (frequency) {
      case 'MONTHLY':
        nextDate = addMonths(currentDueDate, 1);
        break;
      case 'QUARTERLY':
        nextDate = addMonths(currentDueDate, 3);
        break;
      case 'SEMIANNUAL':
        nextDate = addMonths(currentDueDate, 6);
        break;
      case 'YEARLY':
        nextDate = addYears(currentDueDate, 1);
        break;
      default:
        throw new Error(`Unknown recurring frequency: ${frequency}`);
    }

    // Set to the specified day of month
    nextDate = setDate(nextDate, dayOfMonth);

    // Handle edge cases like February 31 -> February 28/29
    // setDate automatically adjusts to the last valid day of the month

    return startOfDay(nextDate);
  }

  /**
   * Determines if the category is INCOME or EXPENSE
   */
  private getCategoryType(category: string): 'INCOME' | 'EXPENSE' {
    const incomeCategories = [
      'SALARY',
      'FREELANCE',
      'INVESTMENT_RETURN',
      'GIFT',
      'OTHER_INCOME',
    ];

    return incomeCategories.includes(category) ? 'INCOME' : 'EXPENSE';
  }

  /**
   * Manual trigger for testing
   */
  async manualTrigger() {
    this.logger.log('Manual trigger initiated');
    await this.processRecurringPayments();
  }
}
