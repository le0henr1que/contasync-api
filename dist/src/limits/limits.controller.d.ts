import { LimitsService } from './limits.service';
export declare class LimitsController {
    private limitsService;
    constructor(limitsService: LimitsService);
    getUsage(req: any): Promise<{
        limits: import("./limits.service").PlanLimits;
        usage: {
            clients: {
                current: number;
                limit: number;
                percentage: number;
                isUnlimited: boolean;
            };
            documents: {
                current: number;
                limit: number;
                percentage: number;
                isUnlimited: boolean;
            };
            payments: {
                current: number;
                limit: number;
                percentage: number;
                isUnlimited: boolean;
            };
            expenses: {
                current: number;
                limit: number;
                percentage: number;
                isUnlimited: boolean;
            };
            storage: {
                current: number;
                limit: number;
                percentage: number;
                isUnlimited: boolean;
            };
        };
    }>;
}
