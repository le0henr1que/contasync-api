import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, any>;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly templatesPath = path.join(process.cwd(), 'email-templates');

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST', 'sandbox.smtp.mailtrap.io');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 2525);
    const smtpSecure = this.configService.get<string>('SMTP_SECURE') === 'true';
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    // Debug: log RAW environment variables
    this.logger.log(`Raw env check - SMTP_USER from process.env: ${process.env.SMTP_USER ? 'EXISTS' : 'MISSING'}, from ConfigService: ${smtpUser ? 'EXISTS' : 'MISSING'}`);
    this.logger.log(`SMTP Config - Host: ${smtpHost}, Port: ${smtpPort}, User: ${smtpUser || 'MISSING'}, Pass: ${smtpPass ? '***' : 'MISSING'}`);

    const emailConfig = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    };

    this.transporter = nodemailer.createTransport(emailConfig);

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('Email transporter verification failed:', error);
      } else {
        this.logger.log('Email service is ready to send emails');
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const html = await this.renderTemplate(options.template, options.context);
      const smtpFrom = this.configService.get<string>('SMTP_FROM', 'ContaSync <noreply@contasync.com>');

      const mailOptions = {
        from: smtpFrom,
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        subject: options.subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async renderTemplate(
    templateName: string,
    context: Record<string, any>,
  ): Promise<string> {
    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.hbs`);
      const templateSource = fs.readFileSync(templatePath, 'utf-8');
      const template = handlebars.compile(templateSource);
      return template(context);
    } catch (error) {
      this.logger.error(`Failed to render template ${templateName}:`, error);
      throw new Error(`Email template ${templateName} not found`);
    }
  }

  async sendClientInvitation(
    email: string,
    data: {
      clientName: string;
      accountantName: string;
      loginUrl: string;
      temporaryPassword?: string;
    },
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Bem-vindo ao ContaSync - Acesso ao Portal do Cliente',
      template: 'client-invitation',
      context: data,
    });
  }

  async sendDocumentRequest(
    email: string,
    data: {
      clientName: string;
      documentType: string;
      deadline: string;
      message?: string;
      portalUrl: string;
    },
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Solicitação de Documento - ContaSync',
      template: 'document-request',
      context: data,
    });
  }

  async sendPaymentReceiptConfirmation(
    email: string,
    data: {
      clientName: string;
      paymentReference: string;
      amount: string;
      date: string;
    },
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Comprovante de Pagamento Recebido - ContaSync',
      template: 'payment-receipt-confirmation',
      context: data,
    });
  }

  async sendOverduePaymentReminder(
    email: string,
    data: {
      clientName: string;
      paymentReference: string;
      amount: string;
      dueDate: string;
      daysOverdue: number;
      portalUrl: string;
    },
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Lembrete: Pagamento em Atraso - ContaSync',
      template: 'overdue-payment-reminder',
      context: data,
    });
  }

  async sendDocumentAvailableNotification(
    email: string,
    data: {
      clientName: string;
      documentTitle: string;
      documentType: string;
      portalUrl: string;
    },
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Novo Documento Disponível - ContaSync',
      template: 'document-available',
      context: data,
    });
  }

  async sendTrialExpiring4Days(
    email: string,
    data: {
      accountantName: string;
      companyName: string;
      trialEndDate: string;
      daysRemaining: number;
      usage: {
        clientsCount: number;
        documentsCount: number;
        paymentsCount: number;
      };
      plansUrl: string;
    },
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Seu trial termina em 4 dias - ContaSync',
      template: 'trial-expiring-4-days',
      context: data,
    });
  }

  async sendTrialExpiring1Day(
    email: string,
    data: {
      accountantName: string;
      companyName: string;
      trialEndDate: string;
      daysRemaining: number;
      usage: {
        clientsCount: number;
        documentsCount: number;
        paymentsCount: number;
      };
      plansUrl: string;
    },
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Última chance! Seu trial termina amanhã - ContaSync',
      template: 'trial-expiring-1-day',
      context: data,
    });
  }

  async sendTrialExpired(
    email: string,
    data: {
      accountantName: string;
      companyName: string;
      plansUrl: string;
    },
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Seu trial expirou - ContaSync',
      template: 'trial-expired',
      context: data,
    });
  }

  async sendWelcomeNewAccount(
    email: string,
    data: {
      name: string;
      companyName: string;
      planName: string;
      loginUrl: string;
    },
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Bem-vindo ao ContaSync - Sua conta está ativa!',
      template: 'welcome-new-account',
      context: data,
    });
  }
}
