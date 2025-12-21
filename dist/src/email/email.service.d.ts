import { ConfigService } from '@nestjs/config';
export interface EmailOptions {
    to: string | string[];
    subject: string;
    template: string;
    context: Record<string, any>;
}
export declare class EmailService {
    private configService;
    private transporter;
    private readonly logger;
    private readonly templatesPath;
    constructor(configService: ConfigService);
    private initializeTransporter;
    sendEmail(options: EmailOptions): Promise<void>;
    private renderTemplate;
    sendClientInvitation(email: string, data: {
        clientName: string;
        accountantName: string;
        loginUrl: string;
        temporaryPassword?: string;
    }): Promise<void>;
    sendDocumentRequest(email: string, data: {
        clientName: string;
        documentType: string;
        deadline: string;
        message?: string;
        portalUrl: string;
    }): Promise<void>;
    sendPaymentReceiptConfirmation(email: string, data: {
        clientName: string;
        paymentReference: string;
        amount: string;
        date: string;
    }): Promise<void>;
    sendOverduePaymentReminder(email: string, data: {
        clientName: string;
        paymentReference: string;
        amount: string;
        dueDate: string;
        daysOverdue: number;
        portalUrl: string;
    }): Promise<void>;
    sendDocumentAvailableNotification(email: string, data: {
        clientName: string;
        documentTitle: string;
        documentType: string;
        portalUrl: string;
    }): Promise<void>;
    sendTrialExpiring4Days(email: string, data: {
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
    }): Promise<void>;
    sendTrialExpiring1Day(email: string, data: {
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
    }): Promise<void>;
    sendTrialExpired(email: string, data: {
        accountantName: string;
        companyName: string;
        plansUrl: string;
    }): Promise<void>;
    sendWelcomeNewAccount(email: string, data: {
        name: string;
        companyName: string;
        planName: string;
        loginUrl: string;
    }): Promise<void>;
}
