"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogService = exports.ActivityAction = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
var ActivityAction;
(function (ActivityAction) {
    ActivityAction["CLIENT_CREATED"] = "CLIENT_CREATED";
    ActivityAction["CLIENT_UPDATED"] = "CLIENT_UPDATED";
    ActivityAction["CLIENT_DELETED"] = "CLIENT_DELETED";
    ActivityAction["CLIENT_STATUS_CHANGED"] = "CLIENT_STATUS_CHANGED";
    ActivityAction["CLIENT_EXPENSE_MODULE_TOGGLED"] = "CLIENT_EXPENSE_MODULE_TOGGLED";
})(ActivityAction || (exports.ActivityAction = ActivityAction = {}));
let ActivityLogService = class ActivityLogService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createLog(data) {
        return this.prisma.activityLog.create({
            data: {
                clientId: data.clientId,
                userId: data.userId,
                action: data.action,
                description: data.description,
                metadata: data.metadata || {},
            },
        });
    }
    async getClientActivityLogs(clientId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            this.prisma.activityLog.findMany({
                where: { clientId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.activityLog.count({
                where: { clientId },
            }),
        ]);
        return {
            logs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
};
exports.ActivityLogService = ActivityLogService;
exports.ActivityLogService = ActivityLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ActivityLogService);
//# sourceMappingURL=activity-log.service.js.map