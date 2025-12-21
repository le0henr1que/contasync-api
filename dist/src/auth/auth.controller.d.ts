import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto, RegisterAccountantDto } from './dto/register.dto';
import { SignupDto } from './dto/signup.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/password-reset.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
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
    refresh(refreshToken: string): Promise<{
        accessToken: string;
    }>;
    logout(refreshToken: string): Promise<{
        message: string;
    }>;
    requestPasswordReset(dto: RequestPasswordResetDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    getProfile(req: any): Promise<{
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
    completeOnboarding(req: any): Promise<{
        message: string;
    }>;
}
export declare class UsersController {
    private authService;
    constructor(authService: AuthService);
    getOnboardingProgress(req: any): Promise<{
        onboardingCompleted: boolean;
        tasks: {
            hasAddedClient: boolean;
            hasUploadedDocument: boolean;
            hasRegisteredPayment: boolean;
            hasCompletedProfile: boolean;
        };
        completionPercentage: number;
    }>;
}
