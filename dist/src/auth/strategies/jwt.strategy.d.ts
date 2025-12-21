import { Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private authService;
    constructor(authService: AuthService);
    validate(payload: any): Promise<{
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
}
export {};
