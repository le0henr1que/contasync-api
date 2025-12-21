import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
export declare class TrialService {
    private prisma;
    private emailService;
    private readonly logger;
    constructor(prisma: PrismaService, emailService: EmailService);
    checkTrialsExpiring4Days(): Promise<void>;
    checkTrialsExpiring1Day(): Promise<void>;
    expireTrials(): Promise<void>;
}
