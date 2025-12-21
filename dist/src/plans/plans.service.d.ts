import { PrismaService } from '../prisma/prisma.service';
import { TenantType } from '@prisma/client';
export declare class PlansService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(tenantType?: TenantType): Promise<{
        featuresJson: string[];
        name: string;
        id: string;
        slug: string;
        stripePriceIdMonthly: string;
        stripePriceIdYearly: string;
        stripeProductId: string;
        description: string;
        tenantType: import("@prisma/client").$Enums.TenantType;
        priceMonthly: import("@prisma/client-runtime-utils").Decimal;
        priceYearly: import("@prisma/client-runtime-utils").Decimal;
        limitsJson: import("@prisma/client/runtime/client").JsonValue;
        isActive: boolean;
        sortOrder: number;
    }[]>;
    private transformFeaturesToArray;
    findOne(id: string): Promise<{
        name: string;
        id: string;
        slug: string;
        stripePriceIdMonthly: string;
        stripePriceIdYearly: string;
        stripeProductId: string;
        description: string;
        tenantType: import("@prisma/client").$Enums.TenantType;
        priceMonthly: import("@prisma/client-runtime-utils").Decimal;
        priceYearly: import("@prisma/client-runtime-utils").Decimal;
        limitsJson: import("@prisma/client/runtime/client").JsonValue;
        featuresJson: import("@prisma/client/runtime/client").JsonValue;
        isActive: boolean;
        sortOrder: number;
    }>;
    findBySlug(slug: string): Promise<{
        name: string;
        id: string;
        slug: string;
        stripePriceIdMonthly: string;
        stripePriceIdYearly: string;
        stripeProductId: string;
        description: string;
        tenantType: import("@prisma/client").$Enums.TenantType;
        priceMonthly: import("@prisma/client-runtime-utils").Decimal;
        priceYearly: import("@prisma/client-runtime-utils").Decimal;
        limitsJson: import("@prisma/client/runtime/client").JsonValue;
        featuresJson: import("@prisma/client/runtime/client").JsonValue;
        isActive: boolean;
        sortOrder: number;
    }>;
}
