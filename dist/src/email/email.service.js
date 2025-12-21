"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
const handlebars = __importStar(require("handlebars"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let EmailService = EmailService_1 = class EmailService {
    configService;
    transporter;
    logger = new common_1.Logger(EmailService_1.name);
    templatesPath = path.join(process.cwd(), 'email-templates');
    constructor(configService) {
        this.configService = configService;
        this.initializeTransporter();
    }
    initializeTransporter() {
        const smtpHost = this.configService.get('SMTP_HOST', 'sandbox.smtp.mailtrap.io');
        const smtpPort = this.configService.get('SMTP_PORT', 2525);
        const smtpSecure = this.configService.get('SMTP_SECURE') === 'true';
        const smtpUser = this.configService.get('SMTP_USER');
        const smtpPass = this.configService.get('SMTP_PASS');
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
        this.transporter.verify((error) => {
            if (error) {
                this.logger.error('Email transporter verification failed:', error);
            }
            else {
                this.logger.log('Email service is ready to send emails');
            }
        });
    }
    async sendEmail(options) {
        try {
            const html = await this.renderTemplate(options.template, options.context);
            const smtpFrom = this.configService.get('SMTP_FROM', 'ContaSync <noreply@contasync.com>');
            const mailOptions = {
                from: smtpFrom,
                to: Array.isArray(options.to) ? options.to.join(',') : options.to,
                subject: options.subject,
                html,
            };
            const info = await this.transporter.sendMail(mailOptions);
            this.logger.log(`Email sent successfully: ${info.messageId}`);
        }
        catch (error) {
            this.logger.error(`Failed to send email: ${error.message}`, error.stack);
            throw error;
        }
    }
    async renderTemplate(templateName, context) {
        try {
            const templatePath = path.join(this.templatesPath, `${templateName}.hbs`);
            const templateSource = fs.readFileSync(templatePath, 'utf-8');
            const template = handlebars.compile(templateSource);
            return template(context);
        }
        catch (error) {
            this.logger.error(`Failed to render template ${templateName}:`, error);
            throw new Error(`Email template ${templateName} not found`);
        }
    }
    async sendClientInvitation(email, data) {
        await this.sendEmail({
            to: email,
            subject: 'Bem-vindo ao ContaSync - Acesso ao Portal do Cliente',
            template: 'client-invitation',
            context: data,
        });
    }
    async sendDocumentRequest(email, data) {
        await this.sendEmail({
            to: email,
            subject: 'Solicitação de Documento - ContaSync',
            template: 'document-request',
            context: data,
        });
    }
    async sendPaymentReceiptConfirmation(email, data) {
        await this.sendEmail({
            to: email,
            subject: 'Comprovante de Pagamento Recebido - ContaSync',
            template: 'payment-receipt-confirmation',
            context: data,
        });
    }
    async sendOverduePaymentReminder(email, data) {
        await this.sendEmail({
            to: email,
            subject: 'Lembrete: Pagamento em Atraso - ContaSync',
            template: 'overdue-payment-reminder',
            context: data,
        });
    }
    async sendDocumentAvailableNotification(email, data) {
        await this.sendEmail({
            to: email,
            subject: 'Novo Documento Disponível - ContaSync',
            template: 'document-available',
            context: data,
        });
    }
    async sendTrialExpiring4Days(email, data) {
        await this.sendEmail({
            to: email,
            subject: 'Seu trial termina em 4 dias - ContaSync',
            template: 'trial-expiring-4-days',
            context: data,
        });
    }
    async sendTrialExpiring1Day(email, data) {
        await this.sendEmail({
            to: email,
            subject: 'Última chance! Seu trial termina amanhã - ContaSync',
            template: 'trial-expiring-1-day',
            context: data,
        });
    }
    async sendTrialExpired(email, data) {
        await this.sendEmail({
            to: email,
            subject: 'Seu trial expirou - ContaSync',
            template: 'trial-expired',
            context: data,
        });
    }
    async sendWelcomeNewAccount(email, data) {
        await this.sendEmail({
            to: email,
            subject: 'Bem-vindo ao ContaSync - Sua conta está ativa!',
            template: 'welcome-new-account',
            context: data,
        });
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map