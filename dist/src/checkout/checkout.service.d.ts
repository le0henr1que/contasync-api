import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
export declare class CheckoutService {
    private prisma;
    private configService;
    private readonly logger;
    private stripe;
    constructor(prisma: PrismaService, configService: ConfigService);
    createCheckoutSession(dto: CreateCheckoutSessionDto): Promise<{
        sessionId: string;
        checkoutUrl: string;
    }>;
}
