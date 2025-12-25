import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
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
  private readonly logger = new Logger(EmailService.name);
  private readonly templatesPath = path.join(process.cwd(), 'email-templates');
  private readonly infobipApiKey: string;
  private readonly infobipBaseUrl: string;
  private readonly infobipSender: string;

  constructor(private configService: ConfigService) {
    this.infobipApiKey = this.configService.get<string>('INFOBIP_API_KEY');
    this.infobipBaseUrl = this.configService.get<string>('INFOBIP_BASE_URL');
    this.infobipSender = this.configService.get<string>('INFOBIP_SENDER');

    console.log('🚀 ========== INFOBIP EMAIL SERVICE INITIALIZED ==========');
    console.log('📧 Infobip Base URL:', this.infobipBaseUrl);
    console.log('📧 Infobip Sender:', this.infobipSender);
    console.log('🔑 API Key:', this.infobipApiKey ? `${this.infobipApiKey.substring(0, 20)}...` : 'MISSING');
    console.log('========== INFOBIP INITIALIZATION COMPLETE ==========\n');

    if (!this.infobipApiKey || !this.infobipBaseUrl || !this.infobipSender) {
      this.logger.error('Missing Infobip configuration. Please check your environment variables.');
      throw new Error('Infobip configuration is incomplete');
    }

    this.logger.log('Infobip Email service initialized successfully');
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    console.log('\n📨 ========== INFOBIP EMAIL SEND STARTED ==========');
    console.log('📧 To:', options.to);
    console.log('📋 Subject:', options.subject);
    console.log('📄 Template:', options.template);
    console.log('🔧 Context Keys:', Object.keys(options.context));

    try {
      // Render the HTML template
      console.log('⏳ Rendering HTML template...');
      const htmlContent = await this.renderTemplate(options.template, options.context);
      console.log('✅ Template rendered successfully (length:', htmlContent.length, 'chars)');

      // Prepare recipients array
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      console.log('👥 Recipients prepared:', recipients.length, 'recipient(s)');

      // Prepare Infobip API payload
      const payload = {
        messages: recipients.map((email) => ({
          destinations: [
            {
              to: [
                {
                  destination: email,
                },
              ],
            },
          ],
          sender: this.infobipSender,
          content: {
            subject: options.subject,
            html: htmlContent,
          },
        })),
      };

      console.log('📦 Payload prepared with', payload.messages.length, 'message(s)');
      console.log('🌐 Sending to Infobip API...');

      // Send email via Infobip API
      await this.sendViaInfobip(payload);

      console.log('✅ EMAIL SENT SUCCESSFULLY via Infobip!');
      console.log('========== INFOBIP EMAIL SEND COMPLETED ==========\n');
    } catch (error) {
      console.error('❌ ========== INFOBIP EMAIL SEND FAILED ==========');
      console.error('🔴 Error:', error.message);
      console.error('📋 Error Stack:', error.stack);
      console.error('========== INFOBIP EMAIL SEND ERROR END ==========\n');

      this.logger.error(`Failed to send email via Infobip: ${error.message}`, error.stack);
      throw error;
    }
  }

  private sendViaInfobip(payload: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(payload);

      console.log('📡 Preparing HTTPS request to Infobip...');
      console.log('🔗 Host:', this.infobipBaseUrl);
      console.log('📍 Path: /email/4/messages');
      console.log('📊 Payload size:', postData.length, 'bytes');

      const options = {
        method: 'POST',
        hostname: this.infobipBaseUrl,
        path: '/email/4/messages',
        headers: {
          Authorization: `App ${this.infobipApiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      console.log('🔐 Authorization header set');
      console.log('📤 Initiating HTTPS request...');

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];

        console.log(`📥 Response status: ${res.statusCode}`);
        console.log(`📥 Response headers:`, res.headers);

        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
          console.log(`📦 Received chunk: ${chunk.length} bytes`);
        });

        res.on('end', () => {
          const body = Buffer.concat(chunks);
          const responseText = body.toString();

          console.log('✅ Response received completely');
          console.log('📊 Response body:', responseText);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ Infobip API call successful!');
            this.logger.log(`Email sent successfully via Infobip: ${responseText}`);
            resolve();
          } else {
            console.error('❌ Infobip API returned error status:', res.statusCode);
            console.error('❌ Response:', responseText);
            this.logger.error(`Infobip API error (${res.statusCode}): ${responseText}`);
            reject(new Error(`Infobip API error: ${res.statusCode} - ${responseText}`));
          }
        });

        res.on('error', (error) => {
          console.error('❌ Response error:', error);
          this.logger.error('Infobip response error:', error);
          reject(error);
        });
      });

      req.on('error', (error) => {
        console.error('❌ Request error:', error);
        this.logger.error('Infobip request error:', error);
        reject(error);
      });

      console.log('📤 Writing payload to request...');
      req.write(postData);

      console.log('✅ Payload written, ending request...');
      req.end();
    });
  }

  private async renderTemplate(
    templateName: string,
    context: Record<string, any>,
  ): Promise<string> {
    try {
      console.log(`📄 Loading template: ${templateName}.hbs`);
      const templatePath = path.join(this.templatesPath, `${templateName}.hbs`);

      if (!fs.existsSync(templatePath)) {
        console.error(`❌ Template file not found: ${templatePath}`);
        throw new Error(`Email template ${templateName} not found`);
      }

      const templateSource = fs.readFileSync(templatePath, 'utf-8');
      console.log(`✅ Template loaded (${templateSource.length} chars)`);

      const template = handlebars.compile(templateSource);
      const rendered = template(context);

      console.log(`✅ Template rendered (${rendered.length} chars)`);
      return rendered;
    } catch (error) {
      console.error(`❌ Failed to render template ${templateName}:`, error);
      this.logger.error(`Failed to render template ${templateName}:`, error);
      throw new Error(`Email template ${templateName} not found or failed to render`);
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
    console.log('\n🎯 Sending CLIENT INVITATION email to:', email);
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
    console.log('\n🎯 Sending DOCUMENT REQUEST email to:', email);
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
    console.log('\n🎯 Sending PAYMENT RECEIPT CONFIRMATION email to:', email);
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
    console.log('\n🎯 Sending OVERDUE PAYMENT REMINDER email to:', email);
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
    console.log('\n🎯 Sending DOCUMENT AVAILABLE NOTIFICATION email to:', email);
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
    console.log('\n🎯 Sending TRIAL EXPIRING 4 DAYS email to:', email);
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
    console.log('\n🎯 Sending TRIAL EXPIRING 1 DAY email to:', email);
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
    console.log('\n🎯 Sending TRIAL EXPIRED email to:', email);
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
    console.log('\n🎯 Sending WELCOME NEW ACCOUNT email to:', email);
    await this.sendEmail({
      to: email,
      subject: 'Bem-vindo ao ContaSync - Sua conta está ativa!',
      template: 'welcome-new-account',
      context: data,
    });
  }

  async sendPaymentReceiptToAccountant(
    email: string,
    data: {
      accountantName: string;
      clientName: string;
      paymentTitle: string;
      paymentReference: string;
      amount: string;
      portalUrl: string;
    },
  ): Promise<void> {
    console.log('\n🎯 Sending PAYMENT RECEIPT TO ACCOUNTANT email to:', email);
    await this.sendEmail({
      to: email,
      subject: 'Comprovante de Pagamento Recebido - Aguardando Validação',
      template: 'payment-receipt-accountant',
      context: data,
    });
  }
}
