import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { addMonths, addYears, setDate, isBefore, isAfter, startOfDay } from 'date-fns';
import { RecurringFrequency } from '@prisma/client';

@Injectable()
export class RecurringPaymentsCron {
  private readonly logger = new Logger(RecurringPaymentsCron.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Runs daily at midnight to generate recurring payments
   * Generates payments 7 days before their due date
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateRecurringPayments() {
    this.logger.log('Starting recurring payments generation...');

    try {
      const today = startOfDay(new Date());
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // Find all active recurring payment templates
      const recurringPayments = await this.prisma.payment.findMany({
        where: {
          isRecurring: true,
          parentPaymentId: null, // Only templates, not generated children
          OR: [
            { recurringEndDate: null }, // Indefinite recurrence
            { recurringEndDate: { gte: today } }, // Not ended yet
          ],
        },
        include: {
          client: true,
          childPayments: {
            orderBy: { dueDate: 'desc' },
            take: 1, // Get the last generated child payment
          },
        },
      });

      this.logger.log(`Found ${recurringPayments.length} active recurring payments`);

      let generatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const template of recurringPayments) {
        try {
          // Skip if client was soft-deleted
          if (template.clientId && template.client?.deletedAt) {
            this.logger.warn(
              `Skipping payment ${template.id} - client ${template.clientId} is deleted`,
            );
            skippedCount++;
            continue;
          }

          // Calculate next due date
          const nextDueDate = this.calculateNextDueDate(
            template.childPayments[0]?.dueDate || template.dueDate,
            template.recurringFrequency!,
            template.recurringDayOfMonth!,
          );

          // Check if we already have a payment for this due date
          const existingPayment = await this.prisma.payment.findFirst({
            where: {
              parentPaymentId: template.id,
              dueDate: nextDueDate,
            },
          });

          if (existingPayment) {
            this.logger.debug(
              `Payment for template ${template.id} with due date ${nextDueDate.toISOString()} already exists`,
            );
            skippedCount++;
            continue;
          }

          // Check if next due date is within 7 days
          if (isAfter(nextDueDate, sevenDaysFromNow)) {
            this.logger.debug(
              `Next due date ${nextDueDate.toISOString()} for template ${template.id} is more than 7 days away`,
            );
            skippedCount++;
            continue;
          }

          // Check if next due date is past the recurring end date
          if (template.recurringEndDate && isAfter(nextDueDate, template.recurringEndDate)) {
            this.logger.log(
              `Template ${template.id} has reached its end date. Marking as non-recurring.`,
            );
            await this.prisma.payment.update({
              where: { id: template.id },
              data: { isRecurring: false },
            });
            skippedCount++;
            continue;
          }

          // Generate new payment
          const newPayment = await this.prisma.payment.create({
            data: {
              accountantId: template.accountantId,
              clientId: template.clientId,
              paymentType: template.paymentType,
              title: template.title,
              amount: template.amount,
              dueDate: nextDueDate,
              paymentMethod: template.paymentMethod,
              reference: template.reference,
              notes: template.notes
                ? `${template.notes}\n\n[Gerado automaticamente de recorrência]`
                : '[Gerado automaticamente de recorrência]',
              status: 'PENDING',
              isRecurring: false, // Child payments are not recurring themselves
              parentPaymentId: template.id,
            },
          });

          this.logger.log(
            `Generated payment ${newPayment.id} from template ${template.id} with due date ${nextDueDate.toISOString()}`,
          );
          generatedCount++;
        } catch (error) {
          this.logger.error(
            `Error generating payment from template ${template.id}: ${error.message}`,
            error.stack,
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Recurring payments generation completed. Generated: ${generatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Fatal error during recurring payments generation: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Calculates the next due date based on the last due date and frequency
   */
  private calculateNextDueDate(
    lastDueDate: Date,
    frequency: RecurringFrequency,
    dayOfMonth: number,
  ): Date {
    let nextDate: Date;

    switch (frequency) {
      case 'MONTHLY':
        nextDate = addMonths(lastDueDate, 1);
        break;
      case 'QUARTERLY':
        nextDate = addMonths(lastDueDate, 3);
        break;
      case 'SEMIANNUAL':
        nextDate = addMonths(lastDueDate, 6);
        break;
      case 'YEARLY':
        nextDate = addYears(lastDueDate, 1);
        break;
      default:
        throw new Error(`Unknown recurring frequency: ${frequency}`);
    }

    // Set to the specified day of month
    nextDate = setDate(nextDate, dayOfMonth);

    // Handle edge cases like February 31 -> February 28/29
    // setDate automatically adjusts to the last valid day of the month
    // For example, setDate(new Date('2025-02-01'), 31) returns 2025-02-28

    return startOfDay(nextDate);
  }

  /**
   * Manual trigger for testing (can be called via endpoint)
   */
  async manualTrigger() {
    this.logger.log('Manual trigger initiated');
    await this.generateRecurringPayments();
  }
}
