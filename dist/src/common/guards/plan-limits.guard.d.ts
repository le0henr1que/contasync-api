import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
export declare const RESOURCE_TYPE_KEY = "resourceType";
export declare enum ResourceType {
    PAYMENT = "payment",
    EXPENSE = "expense",
    DOCUMENT = "document"
}
export declare class PlanLimitsGuard implements CanActivate {
    private reflector;
    private prisma;
    constructor(reflector: Reflector, prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private checkPaymentLimit;
    private checkExpenseLimit;
    private checkDocumentLimit;
}
