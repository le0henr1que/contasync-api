import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto, RegisterAccountantDto } from './dto/register.dto';
import { SignupDto } from './dto/signup.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    private subscriptionsService;
    constructor(prisma: PrismaService, jwtService: JwtService, subscriptionsService: SubscriptionsService);
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("@prisma/client").$Enums.Role;
            accountantId: string;
            clientId: string;
            expenseModuleEnabled: boolean;
            subscriptionStatus: import("@prisma/client").$Enums.SubscriptionStatus;
            trialEndsAt: Date;
            subscription: any;
        };
    }>;
    register(registerDto: RegisterDto): Promise<{
        id: string;
        name: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
    registerAccountant(registerDto: RegisterAccountantDto): Promise<{
        id: string;
        name: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        accountantId: string;
    }>;
    signup(signupDto: SignupDto): Promise<{
        accessToken: string;
        checkoutUrl: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("@prisma/client").$Enums.Role;
            accountantId: string;
            subscriptionStatus: import("@prisma/client").$Enums.SubscriptionStatus;
            trialEndsAt: Date;
        };
    }>;
    refreshAccessToken(refreshToken: string): Promise<{
        accessToken: string;
    }>;
    logout(refreshToken: string): Promise<{
        message: string;
    }>;
    validateUser(userId: string): Promise<{
        id: string;
        name: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        accountant: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            cnpj: string;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            companyName: string;
            crc: string;
            phone: string | null;
            subscriptionStatus: import("@prisma/client").$Enums.SubscriptionStatus;
            subscriptionPlan: string | null;
            trialEndsAt: Date | null;
            onboardingCompleted: boolean;
        };
        client: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            accountantId: string;
            userId: string;
            companyName: string | null;
            phone: string | null;
            deletedAt: Date | null;
            cpfCnpj: string;
            expenseModuleEnabled: boolean;
        };
        accountantId: string;
        clientId: string;
        expenseModuleEnabled: boolean;
        onboardingCompleted: boolean;
    }>;
    completeOnboarding(userId: string): Promise<{
        message: string;
    }>;
    getOnboardingProgress(userId: string): Promise<{
        onboardingCompleted: boolean;
        tasks: {
            hasAddedClient: boolean;
            hasUploadedDocument: boolean;
            hasRegisteredPayment: boolean;
            hasCompletedProfile: boolean;
        };
        completionPercentage: number;
    }>;
    requestPasswordReset(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    private createRefreshToken;
}
